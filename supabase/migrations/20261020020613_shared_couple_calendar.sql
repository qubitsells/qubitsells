-- Shared plans belong to the connected pair, never to a replacement partner.
CREATE TABLE public.couple_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  participant_1_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_2_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 120),
  category text NOT NULL CHECK (category IN ('date','outing','trip','celebration','other')),
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','confirmed','completed','cancelled')),
  starts_on date NOT NULL CHECK (starts_on BETWEEN '2000-01-01' AND '2100-12-31'),
  ends_on date NOT NULL CHECK (ends_on BETWEEN '2000-01-01' AND '2100-12-31'),
  all_day boolean NOT NULL DEFAULT false,
  start_time time,
  end_time time,
  time_zone text NOT NULL CHECK (length(time_zone) BETWEEN 1 AND 100),
  location text NOT NULL DEFAULT '' CHECK (length(location)<=240),
  notes text NOT NULL DEFAULT '' CHECK (length(notes)<=4000),
  version integer NOT NULL DEFAULT 1 CHECK (version>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (participant_1_id<>participant_2_id),
  CHECK (creator_id IN (participant_1_id,participant_2_id) AND updated_by IN (participant_1_id,participant_2_id)),
  CHECK (ends_on>=starts_on AND ends_on-starts_on<=366),
  CHECK ((all_day AND start_time IS NULL AND end_time IS NULL) OR
    (NOT all_day AND start_time IS NOT NULL AND end_time IS NOT NULL AND start_time<'24:00' AND end_time<'24:00' AND (ends_on>starts_on OR end_time>start_time)))
);
CREATE INDEX calendar_couple_dates ON public.couple_calendar_events(couple_id,starts_on,ends_on);
CREATE INDEX calendar_creator ON public.couple_calendar_events(creator_id);
CREATE INDEX calendar_participant1 ON public.couple_calendar_events(participant_1_id);
CREATE INDEX calendar_participant2 ON public.couple_calendar_events(participant_2_id);
CREATE INDEX calendar_updated_by ON public.couple_calendar_events(updated_by);
ALTER TABLE public.couple_calendar_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.couple_calendar_events FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.couple_calendar_events TO authenticated;
GRANT ALL ON public.couple_calendar_events TO service_role;
CREATE POLICY connected_pair_calendar ON public.couple_calendar_events FOR SELECT TO authenticated USING (
  (select auth.uid()) IN (participant_1_id,participant_2_id) AND EXISTS (
    SELECT 1 FROM public.couples c WHERE c.id=couple_calendar_events.couple_id
    AND c.partner_1_id=participant_1_id AND c.partner_2_id=participant_2_id
  )
);

-- Only authenticated application routes may supply an actor to this service-only
-- entry point. Pair membership and the optimistic version are checked in SQL.
CREATE FUNCTION public.qubit_calendar_operation(p_actor_id uuid,p_couple_id uuid,p_operation text,p_event_id uuid,p_expected_version integer,p_data jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE pair public.couples; previous public.couple_calendar_events; result public.couple_calendar_events;
BEGIN
  IF p_actor_id IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
  IF p_operation NOT IN ('create','update','delete') OR p_operation IS NULL THEN RAISE EXCEPTION 'Invalid calendar operation' USING ERRCODE='22023'; END IF;
  SELECT * INTO pair FROM public.couples WHERE id=p_couple_id FOR SHARE;
  IF pair.id IS NULL OR pair.partner_2_id IS NULL OR p_actor_id NOT IN (pair.partner_1_id,pair.partner_2_id) THEN
    RAISE EXCEPTION 'A connected Couple Space is required' USING ERRCODE='42501';
  END IF;
  SELECT * INTO previous FROM public.couple_calendar_events WHERE id=p_event_id FOR UPDATE;
  IF previous.id IS NOT NULL AND (previous.couple_id<>pair.id OR previous.participant_1_id<>pair.partner_1_id OR previous.participant_2_id<>pair.partner_2_id) THEN
    RAISE EXCEPTION 'Plan not found in this Couple Space' USING ERRCODE='42501';
  END IF;
  IF p_operation='create' AND previous.id IS NOT NULL THEN
    IF previous.creator_id<>p_actor_id THEN RAISE EXCEPTION 'Plan reference is already in use' USING ERRCODE='23505'; END IF;
    RETURN to_jsonb(previous);
  END IF;
  IF p_operation IN ('update','delete') THEN
    IF previous.id IS NULL THEN RAISE EXCEPTION 'Plan not found' USING ERRCODE='P0002'; END IF;
    IF p_expected_version IS NULL OR previous.version<>p_expected_version THEN RAISE EXCEPTION 'Your partner changed this plan. Reload it before saving.' USING ERRCODE='40001'; END IF;
  END IF;
  IF p_operation='delete' THEN DELETE FROM public.couple_calendar_events WHERE id=previous.id; RETURN jsonb_build_object('deleted',true,'id',previous.id); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name=p_data->>'time_zone') THEN RAISE EXCEPTION 'Choose a valid time zone' USING ERRCODE='22023'; END IF;
  IF p_operation='create' THEN
    INSERT INTO public.couple_calendar_events(id,couple_id,participant_1_id,participant_2_id,creator_id,updated_by,title,category,status,starts_on,ends_on,all_day,start_time,end_time,time_zone,location,notes)
    VALUES(p_event_id,pair.id,pair.partner_1_id,pair.partner_2_id,p_actor_id,p_actor_id,btrim(p_data->>'title'),p_data->>'category',p_data->>'status',(p_data->>'starts_on')::date,(p_data->>'ends_on')::date,(p_data->>'all_day')::boolean,(p_data->>'start_time')::time,(p_data->>'end_time')::time,p_data->>'time_zone',coalesce(p_data->>'location',''),coalesce(p_data->>'notes','')) RETURNING * INTO result;
  ELSE
    UPDATE public.couple_calendar_events SET title=btrim(p_data->>'title'),category=p_data->>'category',status=p_data->>'status',starts_on=(p_data->>'starts_on')::date,ends_on=(p_data->>'ends_on')::date,all_day=(p_data->>'all_day')::boolean,start_time=(p_data->>'start_time')::time,end_time=(p_data->>'end_time')::time,time_zone=p_data->>'time_zone',location=coalesce(p_data->>'location',''),notes=coalesce(p_data->>'notes',''),updated_by=p_actor_id,updated_at=clock_timestamp(),version=version+1 WHERE id=previous.id RETURNING * INTO result;
  END IF;
  RETURN to_jsonb(result);
END $$;
REVOKE ALL ON FUNCTION public.qubit_calendar_operation(uuid,uuid,text,uuid,integer,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.qubit_calendar_operation(uuid,uuid,text,uuid,integer,jsonb) TO service_role;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_catalog.pg_publication WHERE pubname='supabase_realtime') AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='couple_calendar_events') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_calendar_events;
  END IF;
END $$;
