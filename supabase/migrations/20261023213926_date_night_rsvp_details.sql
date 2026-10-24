-- Receiver availability is a request. Only the creator confirms a final slot.
BEGIN;
ALTER TABLE public.template_invitations
  ADD COLUMN recipient_activities text[] NOT NULL DEFAULT '{}',
  ADD COLUMN recipient_idea text,
  ADD COLUMN available_slots jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.template_invitations DROP CONSTRAINT template_invitations_status_check;
ALTER TABLE public.template_invitations ADD CONSTRAINT template_invitations_status_check
  CHECK (status IN ('proposed','awaiting_confirmation','counterproposed','confirmed','declined','deferred','cancelled'));
ALTER TABLE public.template_invitations ADD CONSTRAINT template_invitation_availability_array
  CHECK (jsonb_typeof(available_slots) = 'array' AND jsonb_array_length(available_slots) <= 6);

CREATE OR REPLACE FUNCTION public.bonded_get_template_invitation(link_code text, manage_token_hash text DEFAULT NULL, actor_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE t public.couple_templates; inv public.template_invitations; creator boolean;
BEGIN
  SELECT * INTO t FROM public.couple_templates WHERE short_code = link_code;
  IF t.id IS NULL OR t.deleting OR t.expires_at <= now() THEN
    RETURN jsonb_build_object('success',false,'error','Template unavailable');
  END IF;
  SELECT * INTO inv FROM public.template_invitations WHERE template_id = t.id AND tool_id = 'invitation_t02';
  IF inv.id IS NULL THEN RETURN jsonb_build_object('success',true,'invitation',NULL); END IF;
  creator := (actor_id IS NOT NULL AND t.owner_id = actor_id) OR (manage_token_hash IS NOT NULL AND t.deletion_hash = manage_token_hash);
  RETURN jsonb_build_object('success',true,'is_creator',creator,'invitation',jsonb_build_object(
    'id',inv.id,'template_id',inv.template_id,'tool_id',inv.tool_id,'activity',inv.activity,'invitation_message',inv.invitation_message,
    'format',inv.format,'location',inv.location,'meeting_url',inv.meeting_url,'reservation_url',inv.reservation_url,'deadline',inv.deadline,
    'sender_private_notes',CASE WHEN creator THEN inv.sender_private_notes ELSE NULL END,'date_mode',inv.date_mode,
    'duration_minutes',inv.duration_minutes,'sender_timezone',inv.sender_timezone,'proposed_slots',inv.proposed_slots,
    'allow_counterproposal',inv.allow_counterproposal,'status',inv.status,'revision',inv.revision,'selected_slot',inv.selected_slot,
    'counterproposal_slot',inv.counterproposal_slot,'recipient_response',inv.recipient_response,'recipient_timezone',inv.recipient_timezone,
    'recipient_note',inv.recipient_note,'recipient_activities',inv.recipient_activities,'recipient_idea',inv.recipient_idea,
    'available_slots',inv.available_slots,'agreed_revision',inv.agreed_revision,'responded_at',inv.responded_at,'created_at',inv.created_at,'updated_at',inv.updated_at));
END $$;

-- Retain the original seven arguments for old callers, with new optional data.
DROP FUNCTION public.bonded_respond_template_invitation(text,integer,text,jsonb,jsonb,text,text);
CREATE FUNCTION public.bonded_respond_template_invitation(
  link_code text, expected_revision integer, response_type text,
  chosen_slot jsonb DEFAULT NULL, suggested_slot jsonb DEFAULT NULL,
  partner_tz text DEFAULT NULL, partner_note_text text DEFAULT NULL,
  activity_choices text[] DEFAULT '{}', alternative_idea text DEFAULT NULL,
  available_slot_ids text[] DEFAULT '{}'
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE t public.couple_templates; inv public.template_invitations; offered jsonb; availability jsonb := '[]'; next_status text; next_revision integer;
BEGIN
  SELECT * INTO t FROM public.couple_templates WHERE short_code = link_code FOR UPDATE;
  IF t.id IS NULL OR t.deleting OR t.expires_at <= now() THEN RAISE EXCEPTION 'Template is unavailable or has expired' USING ERRCODE='42501'; END IF;
  SELECT * INTO inv FROM public.template_invitations WHERE template_id = t.id AND tool_id = 'invitation_t02' FOR UPDATE;
  IF inv.id IS NULL THEN RAISE EXCEPTION 'No invitation found for this template' USING ERRCODE='42501'; END IF;
  IF expected_revision IS DISTINCT FROM inv.revision THEN RAISE EXCEPTION 'Stale invitation revision. Refresh the latest options.' USING ERRCODE='40001'; END IF;
  IF inv.status = 'cancelled' THEN RAISE EXCEPTION 'This invitation was cancelled' USING ERRCODE='22023'; END IF;
  IF inv.deadline IS NOT NULL AND inv.deadline < now() THEN RAISE EXCEPTION 'The reply deadline has passed' USING ERRCODE='22023'; END IF;
  IF length(coalesce(partner_note_text,'')) > 1000 OR length(coalesce(alternative_idea,'')) > 500 OR cardinality(activity_choices) > 6
    OR EXISTS (SELECT 1 FROM unnest(activity_choices) choice WHERE length(choice) > 200 OR length(trim(choice)) = 0) THEN
    RAISE EXCEPTION 'Response details are too long' USING ERRCODE='22023';
  END IF;
  IF partner_tz IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name = partner_tz) THEN
    RAISE EXCEPTION 'Choose a valid time zone' USING ERRCODE='22023';
  END IF;
  IF response_type = 'availability' THEN
    IF coalesce(cardinality(available_slot_ids),0) NOT BETWEEN 1 AND 6 OR EXISTS (
      SELECT 1 FROM unnest(available_slot_ids) slot_id WHERE NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(inv.proposed_slots) slot WHERE slot->>'id' = slot_id)) THEN
      RAISE EXCEPTION 'Check one or more dates offered by the sender' USING ERRCODE='22023';
    END IF;
    SELECT coalesce(jsonb_agg(slot),'[]'::jsonb) INTO availability FROM jsonb_array_elements(inv.proposed_slots) slot WHERE slot->>'id' = ANY(available_slot_ids);
    next_status := 'awaiting_confirmation';
  ELSIF response_type = 'accepted' THEN
    -- Old clients submit one available date; they cannot bypass sender approval.
    SELECT slot INTO offered FROM jsonb_array_elements(inv.proposed_slots) slot WHERE slot->>'id' = chosen_slot->>'id' LIMIT 1;
    IF offered IS NULL THEN RAISE EXCEPTION 'Selected slot was not offered by sender' USING ERRCODE='42501'; END IF;
    availability := jsonb_build_array(offered); next_status := 'awaiting_confirmation';
  ELSIF response_type = 'counterproposed' THEN
    IF NOT inv.allow_counterproposal OR jsonb_typeof(suggested_slot) IS DISTINCT FROM 'object' OR nullif(suggested_slot->>'start_time','') IS NULL THEN
      RAISE EXCEPTION 'Please provide a suggested date/time; counterproposals must be enabled' USING ERRCODE='22023';
    END IF;
    -- Verify that timestamps are parseable, including date-only suggestions.
    PERFORM (suggested_slot->>'start_time')::timestamptz;
    next_status := 'counterproposed';
  ELSIF response_type = 'declined' THEN next_status := 'declined';
  ELSIF response_type = 'decide_later' THEN next_status := 'deferred';
  ELSE RAISE EXCEPTION 'Unknown response type' USING ERRCODE='22023'; END IF;
  next_revision := inv.revision + 1;
  UPDATE public.template_invitations SET status=next_status, revision=next_revision,
    selected_slot=NULL,
    counterproposal_slot=CASE WHEN response_type='counterproposed' THEN suggested_slot ELSE NULL END,
    available_slots=availability, recipient_response=response_type, recipient_timezone=coalesce(partner_tz,inv.sender_timezone),
    recipient_note=partner_note_text, recipient_activities=coalesce(activity_choices,'{}'), recipient_idea=alternative_idea,
    agreed_revision=NULL, responded_at=now(), updated_at=now()
    WHERE id=inv.id;
  RETURN jsonb_build_object('success',true,'status',next_status,'revision',next_revision,
    'invitation',public.bonded_get_template_invitation(link_code,NULL,NULL)->'invitation');
END $$;

DROP FUNCTION public.bonded_manage_template_invitation(text,text,text,uuid,jsonb,text);
CREATE FUNCTION public.bonded_manage_template_invitation(
  link_code text, action_type text, manage_token_hash text DEFAULT NULL, actor_id uuid DEFAULT NULL,
  new_slots jsonb DEFAULT NULL, new_private_notes text DEFAULT NULL,
  selected_slot_id text DEFAULT NULL, expected_revision integer DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE t public.couple_templates; inv public.template_invitations; offered jsonb;
BEGIN
  SELECT * INTO t FROM public.couple_templates WHERE short_code=link_code FOR UPDATE;
  IF t.id IS NULL OR t.deleting OR t.expires_at <= now() THEN RAISE EXCEPTION 'Template unavailable' USING ERRCODE='42501'; END IF;
  IF NOT coalesce((actor_id IS NOT NULL AND t.owner_id=actor_id) OR (manage_token_hash IS NOT NULL AND t.deletion_hash=manage_token_hash),false) THEN
    RAISE EXCEPTION 'Not authorized to manage this invitation' USING ERRCODE='42501';
  END IF;
  SELECT * INTO inv FROM public.template_invitations WHERE template_id=t.id AND tool_id='invitation_t02' FOR UPDATE;
  IF inv.id IS NULL THEN RAISE EXCEPTION 'Invitation not found' USING ERRCODE='42501'; END IF;
  IF expected_revision IS NOT NULL AND expected_revision <> inv.revision THEN RAISE EXCEPTION 'Stale invitation revision. Refresh the response.' USING ERRCODE='40001'; END IF;
  IF action_type='confirm_slot' THEN
    IF expected_revision IS NULL OR inv.status <> 'awaiting_confirmation' THEN RAISE EXCEPTION 'No availability is awaiting confirmation' USING ERRCODE='22023'; END IF;
    SELECT slot INTO offered FROM jsonb_array_elements(inv.available_slots) slot WHERE slot->>'id'=selected_slot_id LIMIT 1;
    IF offered IS NULL THEN RAISE EXCEPTION 'Choose a date the receiver marked available' USING ERRCODE='22023'; END IF;
    UPDATE public.template_invitations SET status='confirmed',selected_slot=offered,revision=inv.revision+1,agreed_revision=inv.revision+1,updated_at=now() WHERE id=inv.id;
  ELSIF action_type='accept_counterproposal' THEN
    IF inv.status <> 'counterproposed' OR inv.counterproposal_slot IS NULL THEN RAISE EXCEPTION 'No pending counterproposal to accept' USING ERRCODE='22023'; END IF;
    UPDATE public.template_invitations SET status='confirmed',selected_slot=inv.counterproposal_slot,revision=inv.revision+1,agreed_revision=inv.revision+1,updated_at=now() WHERE id=inv.id;
  ELSIF action_type='reschedule' THEN
    IF jsonb_typeof(new_slots) IS DISTINCT FROM 'array' OR jsonb_array_length(new_slots) NOT BETWEEN 1 AND 6 THEN RAISE EXCEPTION 'Provide between one and six updated dates' USING ERRCODE='22023'; END IF;
    UPDATE public.template_invitations SET status='proposed',revision=inv.revision+1,proposed_slots=new_slots,selected_slot=NULL,counterproposal_slot=NULL,
      available_slots='[]',recipient_response=NULL,recipient_note=NULL,recipient_timezone=NULL,recipient_activities='{}',recipient_idea=NULL,responded_at=NULL,agreed_revision=NULL,updated_at=now() WHERE id=inv.id;
  ELSIF action_type='cancel' THEN
    UPDATE public.template_invitations SET status='cancelled',revision=inv.revision+1,selected_slot=NULL,counterproposal_slot=NULL,agreed_revision=NULL,updated_at=now() WHERE id=inv.id;
  ELSIF action_type='update_notes' THEN
    UPDATE public.template_invitations SET sender_private_notes=new_private_notes,updated_at=now() WHERE id=inv.id;
  ELSE RAISE EXCEPTION 'Unknown action' USING ERRCODE='22023'; END IF;
  RETURN jsonb_build_object('success',true,'invitation',public.bonded_get_template_invitation(link_code,manage_token_hash,actor_id)->'invitation');
END $$;

REVOKE ALL ON FUNCTION public.bonded_get_template_invitation(text,text,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.bonded_respond_template_invitation(text,integer,text,jsonb,jsonb,text,text,text[],text,text[]) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.bonded_manage_template_invitation(text,text,text,uuid,jsonb,text,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bonded_get_template_invitation(text,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.bonded_respond_template_invitation(text,integer,text,jsonb,jsonb,text,text,text[],text,text[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.bonded_manage_template_invitation(text,text,text,uuid,jsonb,text,text,integer) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
