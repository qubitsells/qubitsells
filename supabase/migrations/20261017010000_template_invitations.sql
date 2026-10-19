-- ============================================================
-- Migration: Template Invitations & RSVP (T02 & T03 Tools)
-- ============================================================

-- 1. Create template_invitations table
CREATE TABLE IF NOT EXISTS public.template_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.couple_templates(id) ON DELETE CASCADE,
  tool_id TEXT NOT NULL DEFAULT 'invitation_t02',
  activity TEXT NOT NULL,
  invitation_message TEXT NOT NULL DEFAULT '',
  format TEXT NOT NULL DEFAULT 'in_person' CHECK (format IN ('in_person', 'online')),
  location TEXT,
  meeting_url TEXT,
  reservation_url TEXT,
  deadline TIMESTAMPTZ,
  sender_private_notes TEXT, -- Only visible to creator/sender
  date_mode TEXT NOT NULL DEFAULT 'slots' CHECK (date_mode IN ('fixed', 'slots', 'date_only')),
  duration_minutes INT NOT NULL DEFAULT 120,
  sender_timezone TEXT NOT NULL DEFAULT 'UTC',
  proposed_slots JSONB NOT NULL DEFAULT '[]'::jsonb,
  allow_counterproposal BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'counterproposed', 'confirmed', 'declined', 'deferred', 'cancelled')),
  revision INT NOT NULL DEFAULT 1,
  selected_slot JSONB,
  counterproposal_slot JSONB,
  recipient_response TEXT,
  recipient_timezone TEXT,
  recipient_note TEXT,
  agreed_revision INT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, tool_id)
);

CREATE INDEX IF NOT EXISTS idx_template_invitations_template_id
  ON public.template_invitations(template_id);

-- 2. Restrict public access under RLS
ALTER TABLE public.template_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.template_invitations FROM PUBLIC, anon, authenticated;

-- 3. Helper RPC to get invitation details (strips private notes if not creator)
CREATE OR REPLACE FUNCTION public.bonded_get_template_invitation(
  link_code TEXT,
  manage_token_hash TEXT DEFAULT NULL,
  actor_id UUID DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  t public.couple_templates;
  inv public.template_invitations;
  is_creator BOOLEAN := false;
BEGIN
  SELECT * INTO t FROM public.couple_templates WHERE short_code = link_code;
  IF t.id IS NULL OR t.deleting OR t.expires_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Template unavailable');
  END IF;

  SELECT * INTO inv FROM public.template_invitations WHERE template_id = t.id AND tool_id = 'invitation_t02';
  IF inv.id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'invitation', NULL);
  END IF;

  is_creator := (actor_id IS NOT NULL AND t.owner_id = actor_id) OR
                (manage_token_hash IS NOT NULL AND t.deletion_hash = manage_token_hash);

  RETURN jsonb_build_object(
    'success', true,
    'is_creator', is_creator,
    'invitation', jsonb_build_object(
      'id', inv.id,
      'template_id', inv.template_id,
      'tool_id', inv.tool_id,
      'activity', inv.activity,
      'invitation_message', inv.invitation_message,
      'format', inv.format,
      'location', inv.location,
      'meeting_url', inv.meeting_url,
      'reservation_url', inv.reservation_url,
      'deadline', inv.deadline,
      'sender_private_notes', CASE WHEN is_creator THEN inv.sender_private_notes ELSE NULL END,
      'date_mode', inv.date_mode,
      'duration_minutes', inv.duration_minutes,
      'sender_timezone', inv.sender_timezone,
      'proposed_slots', inv.proposed_slots,
      'allow_counterproposal', inv.allow_counterproposal,
      'status', inv.status,
      'revision', inv.revision,
      'selected_slot', inv.selected_slot,
      'counterproposal_slot', inv.counterproposal_slot,
      'recipient_response', inv.recipient_response,
      'recipient_timezone', inv.recipient_timezone,
      'recipient_note', inv.recipient_note,
      'agreed_revision', inv.agreed_revision,
      'responded_at', inv.responded_at,
      'created_at', inv.created_at,
      'updated_at', inv.updated_at
    )
  );
END $$;

-- 4. Helper RPC for partner to respond to invitation (RSVP & slot selection)
CREATE OR REPLACE FUNCTION public.bonded_respond_template_invitation(
  link_code TEXT,
  expected_revision INT,
  response_type TEXT, -- 'accepted' | 'counterproposed' | 'declined' | 'decide_later'
  chosen_slot JSONB DEFAULT NULL,
  suggested_slot JSONB DEFAULT NULL,
  partner_tz TEXT DEFAULT NULL,
  partner_note_text TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  t public.couple_templates;
  inv public.template_invitations;
  new_status TEXT;
  slot_matched BOOLEAN := false;
  s JSONB;
BEGIN
  -- 1. Validate template
  SELECT * INTO t FROM public.couple_templates WHERE short_code = link_code FOR UPDATE;
  IF t.id IS NULL OR t.deleting OR t.expires_at <= now() THEN
    RAISE EXCEPTION 'Template is unavailable or has expired' USING ERRCODE='42501';
  END IF;

  -- 2. Validate invitation
  SELECT * INTO inv FROM public.template_invitations WHERE template_id = t.id AND tool_id = 'invitation_t02' FOR UPDATE;
  IF inv.id IS NULL THEN
    RAISE EXCEPTION 'No invitation found for this template' USING ERRCODE='42501';
  END IF;

  -- 3. Concurrency / Stale Check: expected_revision must match current revision
  IF expected_revision <> inv.revision THEN
    RAISE EXCEPTION 'Stale invitation revision. The date or details have changed.' USING ERRCODE='40001';
  END IF;

  -- 4. Process Response Type
  IF response_type = 'accepted' THEN
    -- If accepting, ensure chosen_slot matches one of sender's offered slots or date_only
    IF chosen_slot IS NULL THEN
      RAISE EXCEPTION 'Please choose a proposed date/time slot' USING ERRCODE='42501';
    END IF;

    IF inv.date_mode = 'slots' OR inv.date_mode = 'fixed' THEN
      FOR s IN SELECT * FROM jsonb_array_elements(inv.proposed_slots) LOOP
        IF s->>'id' = chosen_slot->>'id' THEN
          slot_matched := true;
          EXIT;
        END IF;
      END LOOP;
      IF NOT slot_matched THEN
        RAISE EXCEPTION 'Selected slot was not offered by sender' USING ERRCODE='42501';
      END IF;
    END IF;

    -- Accepted offered slot -> confirmed immediately!
    new_status := 'confirmed';

    UPDATE public.template_invitations SET
      status = new_status,
      selected_slot = chosen_slot,
      counterproposal_slot = NULL,
      recipient_response = 'accepted',
      recipient_timezone = coalesce(partner_tz, inv.sender_timezone),
      recipient_note = partner_note_text,
      agreed_revision = inv.revision,
      responded_at = now(),
      updated_at = now()
    WHERE id = inv.id;

  ELSIF response_type = 'counterproposed' THEN
    IF NOT inv.allow_counterproposal THEN
      RAISE EXCEPTION 'Counterproposals are not enabled for this invitation' USING ERRCODE='42501';
    END IF;
    IF suggested_slot IS NULL THEN
      RAISE EXCEPTION 'Please provide a suggested date/time' USING ERRCODE='42501';
    END IF;

    -- Counterproposal waits for sender approval (revision increments)
    new_status := 'counterproposed';

    UPDATE public.template_invitations SET
      status = new_status,
      revision = inv.revision + 1,
      selected_slot = NULL,
      counterproposal_slot = suggested_slot,
      recipient_response = 'counterproposed',
      recipient_timezone = coalesce(partner_tz, inv.sender_timezone),
      recipient_note = partner_note_text,
      agreed_revision = NULL,
      responded_at = now(),
      updated_at = now()
    WHERE id = inv.id;

  ELSIF response_type = 'declined' THEN
    new_status := 'declined';

    UPDATE public.template_invitations SET
      status = new_status,
      selected_slot = NULL,
      counterproposal_slot = NULL,
      recipient_response = 'declined',
      recipient_note = partner_note_text,
      agreed_revision = NULL,
      responded_at = now(),
      updated_at = now()
    WHERE id = inv.id;

  ELSIF response_type = 'decide_later' THEN
    new_status := 'deferred';

    UPDATE public.template_invitations SET
      status = new_status,
      recipient_response = 'decide_later',
      recipient_note = partner_note_text,
      agreed_revision = NULL,
      responded_at = now(),
      updated_at = now()
    WHERE id = inv.id;
  ELSE
    RAISE EXCEPTION 'Unknown response type' USING ERRCODE='42501';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'status', new_status,
    'revision', CASE WHEN response_type = 'counterproposed' THEN inv.revision + 1 ELSE inv.revision END
  );
END $$;

-- 5. Helper RPC for creator to manage invitation (accept counterproposal, reschedule, cancel)
CREATE OR REPLACE FUNCTION public.bonded_manage_template_invitation(
  link_code TEXT,
  action_type TEXT, -- 'accept_counterproposal' | 'reschedule' | 'cancel' | 'update_notes'
  manage_token_hash TEXT DEFAULT NULL,
  actor_id UUID DEFAULT NULL,
  new_slots JSONB DEFAULT NULL,
  new_private_notes TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  t public.couple_templates;
  inv public.template_invitations;
  is_creator BOOLEAN := false;
BEGIN
  SELECT * INTO t FROM public.couple_templates WHERE short_code = link_code FOR UPDATE;
  IF t.id IS NULL OR t.deleting THEN
    RAISE EXCEPTION 'Template unavailable' USING ERRCODE='42501';
  END IF;

  is_creator := (actor_id IS NOT NULL AND t.owner_id = actor_id) OR
                (manage_token_hash IS NOT NULL AND t.deletion_hash = manage_token_hash);
  IF NOT is_creator THEN
    RAISE EXCEPTION 'Not authorized to manage this invitation' USING ERRCODE='42501';
  END IF;

  SELECT * INTO inv FROM public.template_invitations WHERE template_id = t.id AND tool_id = 'invitation_t02' FOR UPDATE;
  IF inv.id IS NULL THEN
    RAISE EXCEPTION 'Invitation not found' USING ERRCODE='42501';
  END IF;

  IF action_type = 'accept_counterproposal' THEN
    IF inv.counterproposal_slot IS NULL OR inv.status <> 'counterproposed' THEN
      RAISE EXCEPTION 'No pending counterproposal to accept' USING ERRCODE='42501';
    END IF;

    -- Creator accepts partner's counterproposal -> confirmed!
    UPDATE public.template_invitations SET
      status = 'confirmed',
      selected_slot = inv.counterproposal_slot,
      agreed_revision = inv.revision,
      updated_at = now()
    WHERE id = inv.id;

  ELSIF action_type = 'reschedule' THEN
    IF new_slots IS NULL OR jsonb_array_length(new_slots) = 0 THEN
      RAISE EXCEPTION 'Please provide updated slots to reschedule' USING ERRCODE='42501';
    END IF;

    -- Changing slots increments revision and resets earlier acceptance
    UPDATE public.template_invitations SET
      status = 'proposed',
      revision = inv.revision + 1,
      proposed_slots = new_slots,
      selected_slot = NULL,
      counterproposal_slot = NULL,
      recipient_response = NULL,
      agreed_revision = NULL,
      updated_at = now()
    WHERE id = inv.id;

  ELSIF action_type = 'cancel' THEN
    UPDATE public.template_invitations SET
      status = 'cancelled',
      selected_slot = NULL,
      counterproposal_slot = NULL,
      agreed_revision = NULL,
      updated_at = now()
    WHERE id = inv.id;

  ELSIF action_type = 'update_notes' THEN
    UPDATE public.template_invitations SET
      sender_private_notes = new_private_notes,
      updated_at = now()
    WHERE id = inv.id;
  ELSE
    RAISE EXCEPTION 'Unknown action' USING ERRCODE='42501';
  END IF;

  RETURN jsonb_build_object('success', true);
END $$;

-- 6. Trigger to automatically initialize template_invitations row if template tools contain invitation
CREATE OR REPLACE FUNCTION public.bonded_sync_template_invitation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  tool JSONB;
BEGIN
  IF NEW.tools IS NOT NULL AND jsonb_typeof(NEW.tools) = 'array' THEN
    FOR tool IN SELECT * FROM jsonb_array_elements(NEW.tools) LOOP
      IF tool->>'type' = 'invitation' OR tool->>'id' = 'invitation_t02' THEN
        INSERT INTO public.template_invitations (
          template_id, tool_id, activity, invitation_message, format,
          location, meeting_url, reservation_url, deadline, sender_private_notes,
          date_mode, duration_minutes, sender_timezone, proposed_slots,
          allow_counterproposal, status, revision
        )
        VALUES (
          NEW.id,
          'invitation_t02',
          coalesce(tool->>'activity', 'Romantic Date Night'),
          coalesce(tool->>'invitationMessage', 'Will you be my date?'),
          coalesce(tool->>'format', 'in_person'),
          tool->>'location',
          tool->>'meetingUrl',
          tool->>'reservationUrl',
          (tool->>'deadline')::timestamptz,
          tool->>'senderPrivateNotes',
          coalesce(tool->>'dateMode', 'slots'),
          coalesce((tool->>'durationMinutes')::int, 120),
          coalesce(tool->>'senderTimezone', 'UTC'),
          coalesce(tool->'proposedSlots', '[]'::jsonb),
          coalesce((tool->>'allowCounterproposal')::boolean, true),
          'proposed',
          1
        )
        ON CONFLICT (template_id, tool_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_template_invitation ON public.couple_templates;
CREATE TRIGGER trg_sync_template_invitation
  AFTER INSERT OR UPDATE OF tools ON public.couple_templates
  FOR EACH ROW EXECUTE FUNCTION public.bonded_sync_template_invitation();
