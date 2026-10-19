-- ============================================================
-- Migration: Template Question Cards (T05 Tool)
-- ============================================================

-- 1. Create template_question_cards table
CREATE TABLE IF NOT EXISTS public.template_question_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.couple_templates(id) ON DELETE CASCADE,
  tool_id TEXT NOT NULL DEFAULT 'question_t05',
  title TEXT NOT NULL DEFAULT 'A few questions for you',
  description TEXT NOT NULL DEFAULT '',
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  revision INT NOT NULL DEFAULT 1,
  partner_token_hash TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, tool_id)
);

CREATE INDEX IF NOT EXISTS idx_template_question_cards_template_id
  ON public.template_question_cards(template_id);

-- 2. Create template_question_submissions table (for drafts and submitted answers)
CREATE TABLE IF NOT EXISTS public.template_question_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.couple_templates(id) ON DELETE CASCADE,
  tool_id TEXT NOT NULL DEFAULT 'question_t05',
  author_role TEXT NOT NULL CHECK (author_role IN ('creator', 'partner')),
  author_token_hash TEXT,
  question_revision INT NOT NULL DEFAULT 1,
  is_draft BOOLEAN NOT NULL DEFAULT true,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, tool_id, author_role, question_revision, is_draft)
);

CREATE INDEX IF NOT EXISTS idx_template_question_submissions_lookup
  ON public.template_question_submissions(template_id, tool_id, author_role, question_revision);

-- 3. Restrict tables under RLS
ALTER TABLE public.template_question_cards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.template_question_cards FROM PUBLIC, anon, authenticated;

ALTER TABLE public.template_question_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.template_question_submissions FROM PUBLIC, anon, authenticated;

-- 4. Helper RPC to get questions and answers
CREATE OR REPLACE FUNCTION public.bonded_get_template_questions(
  link_code TEXT,
  manage_token_hash TEXT DEFAULT NULL,
  partner_receipt_hash TEXT DEFAULT NULL,
  actor_id UUID DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  t public.couple_templates;
  c public.template_question_cards;
  is_creator BOOLEAN := false;
  is_partner BOOLEAN := false;
  partner_has_submitted BOOLEAN := false;
  q_elem JSONB;
  clean_questions JSONB := '[]'::jsonb;
  my_draft_row public.template_question_submissions;
  my_sub_row public.template_question_submissions;
  partner_sub_row public.template_question_submissions;
  in_partner_hash TEXT := partner_receipt_hash;
BEGIN
  -- 1. Find template
  SELECT * INTO t FROM public.couple_templates WHERE short_code = link_code;
  IF t.id IS NULL OR t.deleting OR t.expires_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Template unavailable');
  END IF;

  -- 2. Find question card
  SELECT * INTO c FROM public.template_question_cards WHERE template_id = t.id AND tool_id = 'question_t05';
  IF c.id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'card', NULL);
  END IF;

  -- 3. Authorize
  is_creator := (actor_id IS NOT NULL AND t.owner_id = actor_id) OR
                (manage_token_hash IS NOT NULL AND t.deletion_hash = manage_token_hash);

  IF in_partner_hash IS NOT NULL AND (c.partner_token_hash IS NULL OR c.partner_token_hash = in_partner_hash) THEN
    is_partner := true;
  END IF;

  -- 4. Check if partner submitted answers for current revision
  SELECT * INTO partner_sub_row
  FROM public.template_question_submissions
  WHERE template_id = t.id AND tool_id = 'question_t05' AND author_role = 'partner'
    AND question_revision = c.revision AND is_draft = false;

  partner_has_submitted := (partner_sub_row.id IS NOT NULL);

  -- 5. Build filtered questions (protect sender_answer until explicitly allowed)
  FOR q_elem IN SELECT * FROM jsonb_array_elements(c.questions) LOOP
    IF is_creator THEN
      -- Creator sees everything
      clean_questions := clean_questions || jsonb_build_array(q_elem);
    ELSE
      -- Partner / guest: respect reveal_mode
      IF coalesce(q_elem->>'reveal_mode', 'after_partner_answers') = 'always' THEN
        clean_questions := clean_questions || jsonb_build_array(q_elem);
      ELSIF coalesce(q_elem->>'reveal_mode', 'after_partner_answers') = 'after_partner_answers' AND partner_has_submitted THEN
        clean_questions := clean_questions || jsonb_build_array(q_elem);
      ELSE
        -- Hide sender_answer
        clean_questions := clean_questions || jsonb_build_array(q_elem - 'sender_answer');
      END IF;
    END IF;
  END LOOP;

  -- 6. Load drafts and submissions
  -- DRAFTS ARE VISIBLE ONLY TO THEIR AUTHOR. Never return drafts to the other partner!
  IF is_creator THEN
    SELECT * INTO my_draft_row
    FROM public.template_question_submissions
    WHERE template_id = t.id AND tool_id = 'question_t05' AND author_role = 'creator'
      AND question_revision = c.revision AND is_draft = true;

    SELECT * INTO my_sub_row
    FROM public.template_question_submissions
    WHERE template_id = t.id AND tool_id = 'question_t05' AND author_role = 'creator'
      AND question_revision = c.revision AND is_draft = false;
  ELSIF is_partner THEN
    SELECT * INTO my_draft_row
    FROM public.template_question_submissions
    WHERE template_id = t.id AND tool_id = 'question_t05' AND author_role = 'partner'
      AND question_revision = c.revision AND is_draft = true;

    my_sub_row := partner_sub_row;

    -- For partner, partner_submission is creator's submitted answer (if creator submitted)
    SELECT * INTO partner_sub_row
    FROM public.template_question_submissions
    WHERE template_id = t.id AND tool_id = 'question_t05' AND author_role = 'creator'
      AND question_revision = c.revision AND is_draft = false;
  ELSE
    -- Anonymous reader without partner token
    my_draft_row := NULL;
    my_sub_row := NULL;
    partner_sub_row := NULL;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'is_creator', is_creator,
    'is_partner', is_partner,
    'card', jsonb_build_object(
      'id', c.id,
      'template_id', c.template_id,
      'tool_id', c.tool_id,
      'title', c.title,
      'description', c.description,
      'questions', clean_questions,
      'revision', c.revision,
      'status', c.status,
      'has_partner_submitted', partner_has_submitted,
      'created_at', c.created_at,
      'updated_at', c.updated_at
    ),
    'my_draft', CASE WHEN my_draft_row.id IS NOT NULL THEN my_draft_row.answers ELSE NULL END,
    'my_submission', CASE WHEN my_sub_row.id IS NOT NULL THEN jsonb_build_object(
      'answers', my_sub_row.answers,
      'submitted_at', my_sub_row.submitted_at
    ) ELSE NULL END,
    'partner_submission', CASE WHEN partner_sub_row.id IS NOT NULL THEN jsonb_build_object(
      'answers', partner_sub_row.answers,
      'submitted_at', partner_sub_row.submitted_at
    ) ELSE NULL END
  );
END $$;

-- 5. Helper RPC to save draft answers (visible ONLY to author)
CREATE OR REPLACE FUNCTION public.bonded_save_question_draft(
  link_code TEXT,
  expected_revision INT,
  answers JSONB,
  is_creator_draft BOOLEAN,
  manage_token_hash TEXT DEFAULT NULL,
  partner_token_hash TEXT DEFAULT NULL,
  actor_id UUID DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  t public.couple_templates;
  c public.template_question_cards;
  is_creator_authorized BOOLEAN := false;
  in_partner_hash TEXT := partner_token_hash;
  target_role TEXT;
BEGIN
  -- 1. Validate template
  SELECT * INTO t FROM public.couple_templates WHERE short_code = link_code FOR UPDATE;
  IF t.id IS NULL OR t.deleting OR t.expires_at <= now() THEN
    RAISE EXCEPTION 'Template is unavailable or has expired' USING ERRCODE='42501';
  END IF;

  -- 2. Validate card
  SELECT * INTO c FROM public.template_question_cards WHERE template_id = t.id AND tool_id = 'question_t05' FOR UPDATE;
  IF c.id IS NULL THEN
    RAISE EXCEPTION 'Question card not found' USING ERRCODE='42501';
  END IF;

  -- 3. Stale revision check
  IF expected_revision <> c.revision THEN
    RAISE EXCEPTION 'Stale question revision. The questions have changed.' USING ERRCODE='40001';
  END IF;

  -- 4. Authorize
  is_creator_authorized := (actor_id IS NOT NULL AND t.owner_id = actor_id) OR
                           (manage_token_hash IS NOT NULL AND t.deletion_hash = manage_token_hash);

  IF is_creator_draft THEN
    IF NOT is_creator_authorized THEN
      RAISE EXCEPTION 'Not authorized as creator' USING ERRCODE='42501';
    END IF;
    target_role := 'creator';
  ELSE
    IF in_partner_hash IS NULL THEN
      RAISE EXCEPTION 'Invalid partner session' USING ERRCODE='42501';
    END IF;
    IF c.partner_token_hash IS NOT NULL AND c.partner_token_hash <> in_partner_hash THEN
      IF NOT is_creator_authorized THEN
        RAISE EXCEPTION 'One person cannot answer as the other' USING ERRCODE='42501';
      END IF;
    END IF;
    target_role := 'partner';
  END IF;

  -- 5. Upsert draft
  INSERT INTO public.template_question_submissions (
    template_id, tool_id, author_role, author_token_hash, question_revision, is_draft, answers, updated_at
  ) VALUES (
    t.id, 'question_t05', target_role,
    CASE WHEN is_creator_draft THEN NULL ELSE in_partner_hash END,
    c.revision, true, answers, now()
  )
  ON CONFLICT (template_id, tool_id, author_role, question_revision, is_draft)
  DO UPDATE SET
    answers = EXCLUDED.answers,
    author_token_hash = coalesce(template_question_submissions.author_token_hash, EXCLUDED.author_token_hash),
    updated_at = now();

  RETURN jsonb_build_object('success', true, 'is_draft', true, 'saved_at', now());
END $$;

-- 6. Helper RPC to submit final answers
CREATE OR REPLACE FUNCTION public.bonded_submit_question_answers(
  link_code TEXT,
  expected_revision INT,
  answers JSONB,
  is_creator_submission BOOLEAN,
  manage_token_hash TEXT DEFAULT NULL,
  partner_token_hash TEXT DEFAULT NULL,
  actor_id UUID DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  t public.couple_templates;
  c public.template_question_cards;
  is_creator_authorized BOOLEAN := false;
  in_partner_hash TEXT := partner_token_hash;
  target_role TEXT;
  q_elem JSONB;
  q_id TEXT;
  q_skippable BOOLEAN;
  ans_elem JSONB;
BEGIN
  -- 1. Validate template
  SELECT * INTO t FROM public.couple_templates WHERE short_code = link_code FOR UPDATE;
  IF t.id IS NULL OR t.deleting OR t.expires_at <= now() THEN
    RAISE EXCEPTION 'Template is unavailable or has expired' USING ERRCODE='42501';
  END IF;

  -- 2. Validate card
  SELECT * INTO c FROM public.template_question_cards WHERE template_id = t.id AND tool_id = 'question_t05' FOR UPDATE;
  IF c.id IS NULL THEN
    RAISE EXCEPTION 'Question card not found' USING ERRCODE='42501';
  END IF;

  -- 3. Stale revision check
  IF expected_revision <> c.revision THEN
    RAISE EXCEPTION 'Stale question revision. The questions have changed.' USING ERRCODE='40001';
  END IF;

  -- 4. Authorize
  is_creator_authorized := (actor_id IS NOT NULL AND t.owner_id = actor_id) OR
                           (manage_token_hash IS NOT NULL AND t.deletion_hash = manage_token_hash);

  IF is_creator_submission THEN
    IF NOT is_creator_authorized THEN
      RAISE EXCEPTION 'Not authorized as creator' USING ERRCODE='42501';
    END IF;
    target_role := 'creator';
  ELSE
    IF in_partner_hash IS NULL THEN
      RAISE EXCEPTION 'Invalid partner session' USING ERRCODE='42501';
    END IF;
    IF c.partner_token_hash IS NOT NULL AND c.partner_token_hash <> in_partner_hash THEN
      IF NOT is_creator_authorized THEN
        RAISE EXCEPTION 'One person cannot answer as the other' USING ERRCODE='42501';
      END IF;
    END IF;
    target_role := 'partner';
  END IF;

  -- 5. Validate answers against required questions
  FOR q_elem IN SELECT * FROM jsonb_array_elements(c.questions) LOOP
    q_id := q_elem->>'id';
    q_skippable := coalesce((q_elem->>'skippable')::boolean, true);
    ans_elem := answers->q_id;

    IF NOT q_skippable THEN
      IF ans_elem IS NULL OR (coalesce((ans_elem->>'skipped')::boolean, false) = true) THEN
        RAISE EXCEPTION 'Question % is required and cannot be skipped', q_id USING ERRCODE='42501';
      END IF;
    END IF;
  END LOOP;

  -- 6. Upsert submission (is_draft = false)
  INSERT INTO public.template_question_submissions (
    template_id, tool_id, author_role, author_token_hash, question_revision, is_draft, answers, submitted_at, updated_at
  ) VALUES (
    t.id, 'question_t05', target_role,
    CASE WHEN is_creator_submission THEN NULL ELSE in_partner_hash END,
    c.revision, false, answers, now(), now()
  )
  ON CONFLICT (template_id, tool_id, author_role, question_revision, is_draft)
  DO UPDATE SET
    answers = EXCLUDED.answers,
    submitted_at = now(),
    updated_at = now();

  -- 7. Remove any leftover draft for this role & revision
  DELETE FROM public.template_question_submissions
  WHERE template_id = t.id AND tool_id = 'question_t05' AND author_role = target_role
    AND question_revision = c.revision AND is_draft = true;

  -- 8. If partner submission, lock partner_token_hash if not set
  IF NOT is_creator_submission THEN
    UPDATE public.template_question_cards SET
      partner_token_hash = coalesce(c.partner_token_hash, in_partner_hash),
      updated_at = now()
    WHERE id = c.id;
  END IF;

  RETURN jsonb_build_object('success', true, 'submitted_at', now());
END $$;

-- 7. Trigger to automatically sync questions from couple_templates.tools and bump revision when edited
CREATE OR REPLACE FUNCTION public.bonded_sync_template_question_card()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  tool JSONB;
  existing_card public.template_question_cards;
  new_questions JSONB;
  new_title TEXT;
  new_desc TEXT;
BEGIN
  IF NEW.tools IS NOT NULL AND jsonb_typeof(NEW.tools) = 'array' THEN
    FOR tool IN SELECT * FROM jsonb_array_elements(NEW.tools) LOOP
      IF tool->>'type' = 'question' OR tool->>'id' = 'question_t05' THEN
        new_title := coalesce(tool->>'title', 'A few questions for you');
        new_desc := coalesce(tool->>'description', '');
        new_questions := coalesce(tool->'questions', '[]'::jsonb);

        SELECT * INTO existing_card
        FROM public.template_question_cards
        WHERE template_id = NEW.id AND tool_id = 'question_t05';

        IF existing_card.id IS NULL THEN
          INSERT INTO public.template_question_cards (
            template_id, tool_id, title, description, questions, revision, status
          ) VALUES (
            NEW.id, 'question_t05', new_title, new_desc, new_questions, 1, 'open'
          );
        ELSE
          -- If questions JSON has changed, increment revision to prevent reinterpreting old answers!
          IF existing_card.questions <> new_questions THEN
            UPDATE public.template_question_cards SET
              title = new_title,
              description = new_desc,
              questions = new_questions,
              revision = existing_card.revision + 1,
              updated_at = now()
            WHERE id = existing_card.id;
          ELSE
            UPDATE public.template_question_cards SET
              title = new_title,
              description = new_desc,
              updated_at = now()
            WHERE id = existing_card.id;
          END IF;
        END IF;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_template_question_card ON public.couple_templates;
CREATE TRIGGER trg_sync_template_question_card
  AFTER INSERT OR UPDATE OF tools ON public.couple_templates
  FOR EACH ROW EXECUTE FUNCTION public.bonded_sync_template_question_card();
