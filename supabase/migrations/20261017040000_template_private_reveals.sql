-- ============================================================
-- Migration: Template Private Reveal (T06 Tool)
-- Answer privately, then reveal together
-- ============================================================

-- 1. Create template_private_reveals table
CREATE TABLE IF NOT EXISTS public.template_private_reveals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.couple_templates(id) ON DELETE CASCADE,
  tool_id TEXT NOT NULL DEFAULT 'reveal_t06',
  prompt TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  creator_draft JSONB,
  partner_draft JSONB,
  creator_answer JSONB,
  partner_answer JSONB,
  creator_locked_at TIMESTAMPTZ,
  partner_locked_at TIMESTAMPTZ,
  partner_token_hash TEXT,
  revealed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'waiting', 'eligible', 'revealed', 'cancelled')),
  revision INT NOT NULL DEFAULT 1,
  countdown_seconds INT NOT NULL DEFAULT 3,
  creator_ready_at TIMESTAMPTZ,
  partner_ready_at TIMESTAMPTZ,
  creator_revealed_at TIMESTAMPTZ,
  partner_revealed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, tool_id)
);

CREATE INDEX IF NOT EXISTS idx_template_private_reveals_template_id
  ON public.template_private_reveals(template_id);

-- 2. Enable RLS and revoke direct access
ALTER TABLE public.template_private_reveals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.template_private_reveals FROM PUBLIC, anon, authenticated;

-- 3. Helper RPC to get reveal state
CREATE OR REPLACE FUNCTION public.bonded_get_template_reveal(
  link_code TEXT,
  manage_token_hash TEXT DEFAULT NULL,
  partner_receipt_hash TEXT DEFAULT NULL,
  actor_id UUID DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  t public.couple_templates;
  r public.template_private_reveals;
  is_creator BOOLEAN := false;
  is_partner BOOLEAN := false;
  in_partner_hash TEXT := partner_receipt_hash;
  is_eligible BOOLEAN := false;
  is_revealed BOOLEAN := false;
  my_draft_out JSONB := NULL;
  my_ans_out JSONB := NULL;
  partner_ans_out JSONB := NULL;
  current_status TEXT;
BEGIN
  -- 1. Validate template
  SELECT * INTO t FROM public.couple_templates WHERE short_code = link_code;
  IF t.id IS NULL OR t.deleting OR t.expires_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Template unavailable');
  END IF;

  -- 2. Find reveal record
  SELECT * INTO r FROM public.template_private_reveals WHERE template_id = t.id AND tool_id = 'reveal_t06';
  IF r.id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'reveal', NULL);
  END IF;

  -- 3. Authorize
  is_creator := (actor_id IS NOT NULL AND t.owner_id = actor_id) OR
                (manage_token_hash IS NOT NULL AND t.deletion_hash = manage_token_hash);

  IF in_partner_hash IS NOT NULL AND (r.partner_token_hash IS NULL OR r.partner_token_hash = in_partner_hash) THEN
    is_partner := true;
  END IF;

  -- 4. Check eligibility: Both must have locked their answers
  is_eligible := (r.creator_locked_at IS NOT NULL AND r.partner_locked_at IS NOT NULL);
  is_revealed := (r.revealed_at IS NOT NULL);

  current_status := r.status;
  IF is_revealed THEN
    current_status := 'revealed';
  ELSIF is_eligible THEN
    current_status := 'eligible';
  ELSIF r.creator_locked_at IS NOT NULL OR r.partner_locked_at IS NOT NULL THEN
    current_status := 'waiting';
  ELSE
    current_status := 'open';
  END IF;

  -- 5. Strict Payload Security:
  -- The other partner's answer MUST NOT be delivered to the client before eligibility!
  IF is_creator THEN
    my_draft_out := r.creator_draft;
    my_ans_out := r.creator_answer;
    IF is_eligible OR is_revealed THEN
      partner_ans_out := r.partner_answer;
    ELSE
      partner_ans_out := NULL; -- STRICTLY WITHHELD
    END IF;
  ELSIF is_partner THEN
    my_draft_out := r.partner_draft;
    my_ans_out := r.partner_answer;
    IF is_eligible OR is_revealed THEN
      partner_ans_out := r.creator_answer;
    ELSE
      partner_ans_out := NULL; -- STRICTLY WITHHELD
    END IF;
  ELSE
    -- Anonymous reader
    my_draft_out := NULL;
    my_ans_out := NULL;
    partner_ans_out := NULL;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'is_creator', is_creator,
    'is_partner', is_partner,
    'reveal', jsonb_build_object(
      'id', r.id,
      'template_id', r.template_id,
      'tool_id', r.tool_id,
      'prompt', r.prompt,
      'description', r.description,
      'questions', r.questions,
      'status', current_status,
      'revision', r.revision,
      'countdown_seconds', r.countdown_seconds,
      'creator_locked', (r.creator_locked_at IS NOT NULL),
      'partner_locked', (r.partner_locked_at IS NOT NULL),
      'is_eligible', is_eligible,
      'is_revealed', is_revealed,
      'creator_ready', (r.creator_ready_at IS NOT NULL),
      'partner_ready', (r.partner_ready_at IS NOT NULL),
      'revealed_at', r.revealed_at,
      'my_draft', my_draft_out,
      'my_answer', my_ans_out,
      'partner_answer', partner_ans_out,
      'created_at', r.created_at,
      'updated_at', r.updated_at
    )
  );
END $$;

-- 4. Helper RPC to save private draft
CREATE OR REPLACE FUNCTION public.bonded_save_reveal_draft(
  link_code TEXT,
  expected_revision INT,
  answers JSONB,
  is_creator_action BOOLEAN,
  manage_token_hash TEXT DEFAULT NULL,
  partner_token_hash TEXT DEFAULT NULL,
  actor_id UUID DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  t public.couple_templates;
  r public.template_private_reveals;
  is_creator_authorized BOOLEAN := false;
  in_partner_hash TEXT := partner_token_hash;
BEGIN
  -- 1. Validate template
  SELECT * INTO t FROM public.couple_templates WHERE short_code = link_code FOR UPDATE;
  IF t.id IS NULL OR t.deleting OR t.expires_at <= now() THEN
    RAISE EXCEPTION 'Template is unavailable or has expired' USING ERRCODE='42501';
  END IF;

  -- 2. Find reveal
  SELECT * INTO r FROM public.template_private_reveals WHERE template_id = t.id AND tool_id = 'reveal_t06' FOR UPDATE;
  IF r.id IS NULL THEN
    RAISE EXCEPTION 'Private reveal tool not found' USING ERRCODE='42501';
  END IF;

  -- 3. Stale revision check
  IF expected_revision <> r.revision THEN
    RAISE EXCEPTION 'Stale reveal revision. The questions have changed.' USING ERRCODE='40001';
  END IF;

  -- 4. Authorize
  is_creator_authorized := (actor_id IS NOT NULL AND t.owner_id = actor_id) OR
                           (manage_token_hash IS NOT NULL AND t.deletion_hash = manage_token_hash);

  IF is_creator_action THEN
    IF NOT is_creator_authorized THEN
      RAISE EXCEPTION 'Not authorized as creator' USING ERRCODE='42501';
    END IF;
    IF r.creator_locked_at IS NOT NULL THEN
      RAISE EXCEPTION 'Your answer is already locked. Withdraw it first to edit.' USING ERRCODE='42501';
    END IF;
    UPDATE public.template_private_reveals SET
      creator_draft = answers,
      updated_at = now()
    WHERE id = r.id;
  ELSE
    IF in_partner_hash IS NULL THEN
      RAISE EXCEPTION 'Invalid partner session' USING ERRCODE='42501';
    END IF;
    IF r.partner_token_hash IS NOT NULL AND r.partner_token_hash <> in_partner_hash THEN
      IF NOT is_creator_authorized THEN
        RAISE EXCEPTION 'One person cannot answer as the other' USING ERRCODE='42501';
      END IF;
    END IF;
    IF r.partner_locked_at IS NOT NULL THEN
      RAISE EXCEPTION 'Your answer is already locked. Withdraw it first to edit.' USING ERRCODE='42501';
    END IF;
    UPDATE public.template_private_reveals SET
      partner_draft = answers,
      partner_token_hash = coalesce(r.partner_token_hash, in_partner_hash),
      updated_at = now()
    WHERE id = r.id;
  END IF;

  RETURN jsonb_build_object('success', true, 'saved_at', now());
END $$;

-- 5. Helper RPC to lock answer
CREATE OR REPLACE FUNCTION public.bonded_lock_reveal_answer(
  link_code TEXT,
  expected_revision INT,
  answers JSONB,
  is_creator_action BOOLEAN,
  manage_token_hash TEXT DEFAULT NULL,
  partner_token_hash TEXT DEFAULT NULL,
  actor_id UUID DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  t public.couple_templates;
  r public.template_private_reveals;
  is_creator_authorized BOOLEAN := false;
  in_partner_hash TEXT := partner_token_hash;
  new_status TEXT;
  both_locked BOOLEAN;
BEGIN
  -- 1. Validate template
  SELECT * INTO t FROM public.couple_templates WHERE short_code = link_code FOR UPDATE;
  IF t.id IS NULL OR t.deleting OR t.expires_at <= now() THEN
    RAISE EXCEPTION 'Template is unavailable or has expired' USING ERRCODE='42501';
  END IF;

  -- 2. Find reveal
  SELECT * INTO r FROM public.template_private_reveals WHERE template_id = t.id AND tool_id = 'reveal_t06' FOR UPDATE;
  IF r.id IS NULL THEN
    RAISE EXCEPTION 'Private reveal tool not found' USING ERRCODE='42501';
  END IF;

  -- 3. Stale revision check
  IF expected_revision <> r.revision THEN
    RAISE EXCEPTION 'Stale reveal revision. The questions have changed.' USING ERRCODE='40001';
  END IF;

  -- 4. Check cancellation
  IF r.status = 'cancelled' THEN
    RAISE EXCEPTION 'This reveal round was cancelled' USING ERRCODE='42501';
  END IF;

  -- 5. Authorize
  is_creator_authorized := (actor_id IS NOT NULL AND t.owner_id = actor_id) OR
                           (manage_token_hash IS NOT NULL AND t.deletion_hash = manage_token_hash);

  IF is_creator_action THEN
    IF NOT is_creator_authorized THEN
      RAISE EXCEPTION 'Not authorized as creator' USING ERRCODE='42501';
    END IF;

    UPDATE public.template_private_reveals SET
      creator_answer = answers,
      creator_draft = NULL,
      creator_locked_at = now(),
      updated_at = now()
    WHERE id = r.id;
  ELSE
    IF in_partner_hash IS NULL THEN
      RAISE EXCEPTION 'Invalid partner session' USING ERRCODE='42501';
    END IF;
    IF r.partner_token_hash IS NOT NULL AND r.partner_token_hash <> in_partner_hash THEN
      IF NOT is_creator_authorized THEN
        RAISE EXCEPTION 'One person cannot answer as the other' USING ERRCODE='42501';
      END IF;
    END IF;

    UPDATE public.template_private_reveals SET
      partner_answer = answers,
      partner_draft = NULL,
      partner_locked_at = now(),
      partner_token_hash = coalesce(r.partner_token_hash, in_partner_hash),
      updated_at = now()
    WHERE id = r.id;
  END IF;

  -- 6. Refresh and determine new status
  SELECT * INTO r FROM public.template_private_reveals WHERE id = r.id;
  both_locked := (r.creator_locked_at IS NOT NULL AND r.partner_locked_at IS NOT NULL);

  IF both_locked THEN
    new_status := 'eligible';
  ELSE
    new_status := 'waiting';
  END IF;

  UPDATE public.template_private_reveals SET
    status = new_status,
    updated_at = now()
  WHERE id = r.id;

  RETURN jsonb_build_object(
    'success', true,
    'status', new_status,
    'is_eligible', both_locked
  );
END $$;

-- 6. Helper RPC to withdraw locked answer before reveal (cancels eligibility without releasing answers)
CREATE OR REPLACE FUNCTION public.bonded_withdraw_reveal_answer(
  link_code TEXT,
  expected_revision INT,
  is_creator_action BOOLEAN,
  manage_token_hash TEXT DEFAULT NULL,
  partner_token_hash TEXT DEFAULT NULL,
  actor_id UUID DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  t public.couple_templates;
  r public.template_private_reveals;
  is_creator_authorized BOOLEAN := false;
  in_partner_hash TEXT := partner_token_hash;
BEGIN
  -- 1. Validate template
  SELECT * INTO t FROM public.couple_templates WHERE short_code = link_code FOR UPDATE;
  IF t.id IS NULL OR t.deleting THEN
    RAISE EXCEPTION 'Template unavailable' USING ERRCODE='42501';
  END IF;

  -- 2. Find reveal
  SELECT * INTO r FROM public.template_private_reveals WHERE template_id = t.id AND tool_id = 'reveal_t06' FOR UPDATE;
  IF r.id IS NULL THEN
    RAISE EXCEPTION 'Private reveal tool not found' USING ERRCODE='42501';
  END IF;

  -- 3. If already revealed, answers cannot be withdrawn ("Information already seen cannot be made unseen")
  IF r.revealed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Answers have already been revealed and cannot be unseen' USING ERRCODE='42501';
  END IF;

  -- 4. Authorize
  is_creator_authorized := (actor_id IS NOT NULL AND t.owner_id = actor_id) OR
                           (manage_token_hash IS NOT NULL AND t.deletion_hash = manage_token_hash);

  IF is_creator_action THEN
    IF NOT is_creator_authorized THEN
      RAISE EXCEPTION 'Not authorized as creator' USING ERRCODE='42501';
    END IF;

    -- Reset creator lock and restore to draft
    UPDATE public.template_private_reveals SET
      creator_draft = coalesce(creator_answer, creator_draft),
      creator_answer = NULL,
      creator_locked_at = NULL,
      creator_ready_at = NULL,
      status = 'open',
      updated_at = now()
    WHERE id = r.id;
  ELSE
    IF in_partner_hash IS NULL THEN
      RAISE EXCEPTION 'Invalid partner session' USING ERRCODE='42501';
    END IF;
    IF r.partner_token_hash IS NOT NULL AND r.partner_token_hash <> in_partner_hash THEN
      IF NOT is_creator_authorized THEN
        RAISE EXCEPTION 'One person cannot answer as the other' USING ERRCODE='42501';
      END IF;
    END IF;

    -- Reset partner lock and restore to draft
    UPDATE public.template_private_reveals SET
      partner_draft = coalesce(partner_answer, partner_draft),
      partner_answer = NULL,
      partner_locked_at = NULL,
      partner_ready_at = NULL,
      status = 'open',
      updated_at = now()
    WHERE id = r.id;
  END IF;

  RETURN jsonb_build_object('success', true, 'status', 'open');
END $$;

-- 7. Helper RPC to confirm reveal (and mark user ready)
CREATE OR REPLACE FUNCTION public.bonded_confirm_reveal(
  link_code TEXT,
  expected_revision INT,
  is_creator_action BOOLEAN,
  manage_token_hash TEXT DEFAULT NULL,
  partner_token_hash TEXT DEFAULT NULL,
  actor_id UUID DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  t public.couple_templates;
  r public.template_private_reveals;
  is_creator_authorized BOOLEAN := false;
  in_partner_hash TEXT := partner_token_hash;
  both_locked BOOLEAN;
BEGIN
  -- 1. Validate template
  SELECT * INTO t FROM public.couple_templates WHERE short_code = link_code FOR UPDATE;
  IF t.id IS NULL OR t.deleting THEN
    RAISE EXCEPTION 'Template unavailable' USING ERRCODE='42501';
  END IF;

  -- 2. Find reveal
  SELECT * INTO r FROM public.template_private_reveals WHERE template_id = t.id AND tool_id = 'reveal_t06' FOR UPDATE;
  IF r.id IS NULL THEN
    RAISE EXCEPTION 'Private reveal tool not found' USING ERRCODE='42501';
  END IF;

  -- 3. Stale revision check
  IF expected_revision <> r.revision THEN
    RAISE EXCEPTION 'Stale reveal revision' USING ERRCODE='40001';
  END IF;

  -- 4. Eligibility check: Both must be locked before any reveal can happen!
  both_locked := (r.creator_locked_at IS NOT NULL AND r.partner_locked_at IS NOT NULL);
  IF NOT both_locked THEN
    RAISE EXCEPTION 'Cannot reveal answers until both partners have submitted and locked their answers' USING ERRCODE='42501';
  END IF;

  -- 5. Authorize
  is_creator_authorized := (actor_id IS NOT NULL AND t.owner_id = actor_id) OR
                           (manage_token_hash IS NOT NULL AND t.deletion_hash = manage_token_hash);

  IF is_creator_action THEN
    IF NOT is_creator_authorized THEN
      RAISE EXCEPTION 'Not authorized as creator' USING ERRCODE='42501';
    END IF;
    UPDATE public.template_private_reveals SET
      creator_ready_at = coalesce(r.creator_ready_at, now()),
      creator_revealed_at = coalesce(r.creator_revealed_at, now()),
      revealed_at = coalesce(r.revealed_at, now()),
      status = 'revealed',
      updated_at = now()
    WHERE id = r.id;
  ELSE
    IF in_partner_hash IS NULL THEN
      RAISE EXCEPTION 'Invalid partner session' USING ERRCODE='42501';
    END IF;
    IF r.partner_token_hash IS NOT NULL AND r.partner_token_hash <> in_partner_hash THEN
      IF NOT is_creator_authorized THEN
        RAISE EXCEPTION 'One person cannot answer as the other' USING ERRCODE='42501';
      END IF;
    END IF;
    UPDATE public.template_private_reveals SET
      partner_ready_at = coalesce(r.partner_ready_at, now()),
      partner_revealed_at = coalesce(r.partner_revealed_at, now()),
      revealed_at = coalesce(r.revealed_at, now()),
      status = 'revealed',
      updated_at = now()
    WHERE id = r.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'revealed',
    'revealed_at', now()
  );
END $$;

-- 8. Trigger to sync private reveal from couple_templates.tools
CREATE OR REPLACE FUNCTION public.bonded_sync_template_reveal()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  tool JSONB;
  existing_rec public.template_private_reveals;
  new_prompt TEXT;
  new_desc TEXT;
  new_questions JSONB;
  new_countdown INT;
BEGIN
  IF NEW.tools IS NOT NULL AND jsonb_typeof(NEW.tools) = 'array' THEN
    FOR tool IN SELECT * FROM jsonb_array_elements(NEW.tools) LOOP
      IF tool->>'type' = 'private_reveal' OR tool->>'id' = 'reveal_t06' THEN
        new_prompt := coalesce(tool->>'prompt', 'Answer privately, then reveal together');
        new_desc := coalesce(tool->>'description', '');
        new_questions := coalesce(tool->'questions', '[]'::jsonb);
        new_countdown := coalesce((tool->>'countdownSeconds')::int, 3);

        SELECT * INTO existing_rec
        FROM public.template_private_reveals
        WHERE template_id = NEW.id AND tool_id = 'reveal_t06';

        IF existing_rec.id IS NULL THEN
          INSERT INTO public.template_private_reveals (
            template_id, tool_id, prompt, description, questions, countdown_seconds, revision, status
          ) VALUES (
            NEW.id, 'reveal_t06', new_prompt, new_desc, new_questions, new_countdown, 1, 'open'
          );
        ELSE
          -- If prompt or questions have changed, bump revision and cancel previous unrevealed locks!
          IF existing_rec.prompt <> new_prompt OR existing_rec.questions <> new_questions THEN
            UPDATE public.template_private_reveals SET
              prompt = new_prompt,
              description = new_desc,
              questions = new_questions,
              countdown_seconds = new_countdown,
              revision = existing_rec.revision + 1,
              status = 'open',
              creator_locked_at = NULL,
              partner_locked_at = NULL,
              creator_ready_at = NULL,
              partner_ready_at = NULL,
              revealed_at = NULL,
              updated_at = now()
            WHERE id = existing_rec.id;
          ELSE
            UPDATE public.template_private_reveals SET
              prompt = new_prompt,
              description = new_desc,
              countdown_seconds = new_countdown,
              updated_at = now()
            WHERE id = existing_rec.id;
          END IF;
        END IF;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_template_reveal ON public.couple_templates;
CREATE TRIGGER trg_sync_template_reveal
  AFTER INSERT OR UPDATE OF tools ON public.couple_templates
  FOR EACH ROW EXECUTE FUNCTION public.bonded_sync_template_reveal();
