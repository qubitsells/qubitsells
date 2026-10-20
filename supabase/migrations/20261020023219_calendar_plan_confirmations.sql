ALTER TABLE public.couple_calendar_events
  ADD COLUMN confirmation_status text NOT NULL DEFAULT 'pending' CHECK (confirmation_status IN ('pending','accepted','declined')),
  ADD COLUMN requested_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN requested_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN responded_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN responded_at timestamptz;
-- Existing plans have no recorded partner consent. Do not invent an approval.
UPDATE public.couple_calendar_events SET requested_by=creator_id,requested_at=updated_at,status=CASE WHEN status='confirmed' THEN 'planned' ELSE status END;
ALTER TABLE public.couple_calendar_events ALTER COLUMN requested_by SET NOT NULL;
ALTER TABLE public.couple_calendar_events ADD CONSTRAINT calendar_confirmation_actor CHECK (
  requested_by IN (participant_1_id,participant_2_id) AND
  ((confirmation_status='pending' AND responded_by IS NULL AND responded_at IS NULL) OR
   (confirmation_status IN ('accepted','declined') AND responded_by IS NOT NULL AND responded_by IN (participant_1_id,participant_2_id) AND responded_by<>requested_by AND responded_at IS NOT NULL))
);
CREATE INDEX calendar_requested_by ON public.couple_calendar_events(requested_by);
CREATE INDEX calendar_responded_by ON public.couple_calendar_events(responded_by);
CREATE INDEX calendar_pending_requests ON public.couple_calendar_events(couple_id,starts_on) WHERE confirmation_status='pending' AND status='planned';

ALTER TABLE public.store_notifications DROP CONSTRAINT store_notifications_kind_check;
ALTER TABLE public.store_notifications ADD CONSTRAINT store_notifications_kind_check CHECK(kind IN ('order','template_response','review_request','calendar_request','calendar_response'));
ALTER TABLE public.store_notifications ADD COLUMN calendar_event_id uuid REFERENCES public.couple_calendar_events(id) ON DELETE CASCADE,
  ADD COLUMN calendar_couple_id uuid REFERENCES public.couples(id) ON DELETE CASCADE;
ALTER TABLE public.store_notifications ADD CONSTRAINT calendar_notification_reference CHECK (
  (kind IN ('calendar_request','calendar_response') AND calendar_event_id IS NOT NULL AND calendar_couple_id IS NOT NULL) OR
  (kind NOT IN ('calendar_request','calendar_response') AND calendar_event_id IS NULL AND calendar_couple_id IS NULL)
);
CREATE INDEX notifications_calendar_event ON public.store_notifications(calendar_event_id) WHERE calendar_event_id IS NOT NULL;
CREATE INDEX notifications_calendar_couple ON public.store_notifications(calendar_couple_id) WHERE calendar_couple_id IS NOT NULL;
DROP POLICY own_notifications ON public.store_notifications;
CREATE POLICY own_notifications ON public.store_notifications FOR SELECT TO authenticated USING (
  user_id=(select auth.uid()) AND (calendar_event_id IS NULL OR EXISTS (
    SELECT 1 FROM public.couple_calendar_events e WHERE e.id=store_notifications.calendar_event_id AND e.couple_id=store_notifications.calendar_couple_id
  ))
);

CREATE OR REPLACE FUNCTION public.qubit_calendar_operation(p_actor_id uuid,p_couple_id uuid,p_operation text,p_event_id uuid,p_expected_version integer,p_data jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE pair public.couples; previous public.couple_calendar_events; result public.couple_calendar_events;
  changed boolean; new_request boolean:=false; next_status text; notify_user uuid; notify_kind text; notify_title text; notify_message text;
BEGIN
  IF p_actor_id IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
  IF p_operation IS NULL OR p_operation NOT IN ('create','update','delete','accept','decline') THEN RAISE EXCEPTION 'Invalid calendar operation' USING ERRCODE='22023'; END IF;
  SELECT * INTO pair FROM public.couples WHERE id=p_couple_id FOR SHARE;
  IF pair.id IS NULL OR pair.partner_2_id IS NULL OR p_actor_id NOT IN (pair.partner_1_id,pair.partner_2_id) THEN RAISE EXCEPTION 'Connected pair required' USING ERRCODE='42501'; END IF;
  SELECT * INTO previous FROM public.couple_calendar_events WHERE id=p_event_id FOR UPDATE;
  IF previous.id IS NOT NULL AND (previous.couple_id<>pair.id OR previous.participant_1_id<>pair.partner_1_id OR previous.participant_2_id<>pair.partner_2_id) THEN RAISE EXCEPTION 'Plan not found in this Couple Space' USING ERRCODE='42501'; END IF;
  IF p_operation='create' AND previous.id IS NOT NULL THEN
    IF previous.creator_id<>p_actor_id THEN RAISE EXCEPTION 'Plan reference already in use' USING ERRCODE='23505'; END IF;
    RETURN to_jsonb(previous);
  END IF;
  IF p_operation<>'create' THEN
    IF previous.id IS NULL THEN RAISE EXCEPTION 'Plan not found' USING ERRCODE='P0002'; END IF;
    IF p_expected_version IS NULL OR previous.version<>p_expected_version THEN RAISE EXCEPTION 'Plan changed; reload the latest version' USING ERRCODE='40001'; END IF;
  END IF;
  IF p_operation='delete' THEN DELETE FROM public.couple_calendar_events WHERE id=previous.id; RETURN jsonb_build_object('deleted',true,'id',previous.id); END IF;

  IF p_operation IN ('accept','decline') THEN
    IF previous.requested_by=p_actor_id THEN RAISE EXCEPTION 'Only the other partner may respond' USING ERRCODE='42501'; END IF;
    IF previous.confirmation_status<>'pending' OR previous.status<>'planned' THEN RAISE EXCEPTION 'Request no longer awaiting a response' USING ERRCODE='40001'; END IF;
    UPDATE public.couple_calendar_events SET confirmation_status=CASE WHEN p_operation='accept' THEN 'accepted' ELSE 'declined' END,
      responded_by=p_actor_id,responded_at=clock_timestamp(),status=CASE WHEN p_operation='accept' THEN 'confirmed' ELSE 'planned' END,
      updated_by=p_actor_id,updated_at=clock_timestamp(),version=version+1 WHERE id=previous.id RETURNING * INTO result;
    notify_user=result.requested_by;notify_kind='calendar_response';
    notify_title=CASE WHEN p_operation='accept' THEN 'Your shared plan is confirmed' ELSE 'Your partner declined a plan' END;
    notify_message=CASE WHEN p_operation='accept' THEN 'Your partner accepted your plan. Open your calendar to see the details.' ELSE 'Your partner declined this request. You can revise the plan and ask again.' END;
  ELSE
    IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name=p_data->>'time_zone') THEN RAISE EXCEPTION 'Invalid time zone' USING ERRCODE='22023'; END IF;
    IF p_operation='create' THEN
      INSERT INTO public.couple_calendar_events(id,couple_id,participant_1_id,participant_2_id,creator_id,updated_by,title,category,status,starts_on,ends_on,all_day,start_time,end_time,time_zone,location,notes,requested_by)
      VALUES(p_event_id,pair.id,pair.partner_1_id,pair.partner_2_id,p_actor_id,p_actor_id,btrim(p_data->>'title'),p_data->>'category','planned',(p_data->>'starts_on')::date,(p_data->>'ends_on')::date,(p_data->>'all_day')::boolean,(p_data->>'start_time')::time,(p_data->>'end_time')::time,p_data->>'time_zone',coalesce(p_data->>'location',''),coalesce(p_data->>'notes',''),p_actor_id) RETURNING * INTO result;
      new_request=true;
    ELSE
      changed=jsonb_build_array(btrim(p_data->>'title'),p_data->>'category',(p_data->>'starts_on')::date,(p_data->>'ends_on')::date,(p_data->>'all_day')::boolean,(p_data->>'start_time')::time,(p_data->>'end_time')::time,p_data->>'time_zone',coalesce(p_data->>'location',''),coalesce(p_data->>'notes',''))
        IS DISTINCT FROM jsonb_build_array(previous.title,previous.category,previous.starts_on,previous.ends_on,previous.all_day,previous.start_time,previous.end_time,previous.time_zone,previous.location,previous.notes);
      IF p_data->>'status'='completed' AND previous.confirmation_status<>'accepted' THEN RAISE EXCEPTION 'Confirm the request before completing it' USING ERRCODE='42501'; END IF;
      IF NOT changed AND p_data->>'status'='confirmed' AND previous.confirmation_status<>'accepted' THEN RAISE EXCEPTION 'The other partner must confirm the request' USING ERRCODE='42501'; END IF;
      IF NOT changed AND p_data->>'status'=previous.status AND previous.confirmation_status<>'declined' THEN RETURN to_jsonb(previous); END IF;
      IF p_data->>'status'='cancelled' THEN next_status='cancelled';
      ELSIF NOT changed AND previous.confirmation_status='accepted' AND previous.status<>'cancelled' THEN next_status=CASE WHEN p_data->>'status'='completed' THEN 'completed' ELSE 'confirmed' END;
      ELSE next_status='planned';new_request=true;END IF;
      UPDATE public.couple_calendar_events SET title=btrim(p_data->>'title'),category=p_data->>'category',status=next_status,starts_on=(p_data->>'starts_on')::date,ends_on=(p_data->>'ends_on')::date,
        all_day=(p_data->>'all_day')::boolean,start_time=(p_data->>'start_time')::time,end_time=(p_data->>'end_time')::time,time_zone=p_data->>'time_zone',location=coalesce(p_data->>'location',''),notes=coalesce(p_data->>'notes',''),
        confirmation_status=CASE WHEN new_request THEN 'pending' ELSE confirmation_status END,
        requested_by=CASE WHEN new_request THEN p_actor_id ELSE requested_by END,requested_at=CASE WHEN new_request THEN clock_timestamp() ELSE requested_at END,
        responded_by=CASE WHEN new_request THEN NULL ELSE responded_by END,responded_at=CASE WHEN new_request THEN NULL ELSE responded_at END,
        updated_by=p_actor_id,updated_at=clock_timestamp(),version=version+1 WHERE id=previous.id RETURNING * INTO result;
      IF next_status='cancelled' THEN notify_user=CASE WHEN p_actor_id=pair.partner_1_id THEN pair.partner_2_id ELSE pair.partner_1_id END;notify_kind='calendar_response';notify_title='A shared plan was cancelled';notify_message='Your partner cancelled a calendar plan. Open the calendar for details.';END IF;
    END IF;
    IF new_request THEN notify_user=CASE WHEN p_actor_id=pair.partner_1_id THEN pair.partner_2_id ELSE pair.partner_1_id END;notify_kind='calendar_request';notify_title=CASE WHEN p_operation='create' THEN 'A plan is waiting for your confirmation' ELSE 'Your partner updated a plan request' END;notify_message='Open your shared calendar to review the plan, then confirm or decline.';END IF;
  END IF;
  UPDATE public.store_notifications SET read_at=coalesce(read_at,clock_timestamp()) WHERE calendar_event_id=result.id AND kind='calendar_request' AND read_at IS NULL;
  IF notify_user IS NOT NULL THEN
    INSERT INTO public.store_notifications(user_id,kind,title,message,href,dedupe_key,calendar_event_id,calendar_couple_id)
    VALUES(notify_user,notify_kind,notify_title,notify_message,'/couple-space/calendar?event='||result.id::text||'&month='||to_char(result.starts_on,'YYYY-MM'),
      'calendar:'||result.id::text||':'||notify_kind||':'||result.version::text,result.id,result.couple_id) ON CONFLICT(user_id,dedupe_key) DO NOTHING;
  END IF;
  RETURN to_jsonb(result);
END $$;
REVOKE ALL ON FUNCTION public.qubit_calendar_operation(uuid,uuid,text,uuid,integer,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.qubit_calendar_operation(uuid,uuid,text,uuid,integer,jsonb) TO service_role;

-- Invite the recipient of pre-existing active plans once after this upgrade.
INSERT INTO public.store_notifications(user_id,kind,title,message,href,dedupe_key,calendar_event_id,calendar_couple_id)
SELECT CASE WHEN e.requested_by=e.participant_1_id THEN e.participant_2_id ELSE e.participant_1_id END,'calendar_request','A plan is waiting for your confirmation','Review your partner’s plan and confirm or decline in your shared calendar.',
  '/couple-space/calendar?event='||e.id::text||'&month='||to_char(e.starts_on,'YYYY-MM'),'calendar:'||e.id::text||':calendar_request:'||e.version::text,e.id,e.couple_id
FROM public.couple_calendar_events e JOIN public.couples c ON c.id=e.couple_id AND c.partner_1_id=e.participant_1_id AND c.partner_2_id=e.participant_2_id WHERE e.status='planned'
ON CONFLICT(user_id,dedupe_key) DO NOTHING;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_catalog.pg_publication WHERE pubname='supabase_realtime') AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='store_notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.store_notifications;
  END IF;
END $$;
