-- ============================================================
-- Migration: Template Polls & Choice Cards (T04 Tool)
-- ============================================================

-- 1. Create template_polls table
CREATE TABLE IF NOT EXISTS public.template_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.couple_templates(id) ON DELETE CASCADE,
  tool_id TEXT NOT NULL DEFAULT 'poll_t04',
  question TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  selection_mode TEXT NOT NULL DEFAULT 'both_vote' CHECK (selection_mode IN ('partner_chooses', 'both_vote')),
  allow_multiple BOOLEAN NOT NULL DEFAULT false,
  allow_custom_suggestion BOOLEAN NOT NULL DEFAULT true,
  closing_time TIMESTAMPTZ,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  custom_suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,
  creator_votes JSONB NOT NULL DEFAULT '[]'::jsonb,
  partner_votes JSONB NOT NULL DEFAULT '[]'::jsonb,
  partner_token_hash TEXT,
  resolved_option_id TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'resolved')),
  revision INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, tool_id)
);

CREATE INDEX IF NOT EXISTS idx_template_polls_template_id
  ON public.template_polls(template_id);

-- 2. Restrict public access under RLS
ALTER TABLE public.template_polls ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.template_polls FROM PUBLIC, anon, authenticated;

-- 3. Helper RPC to get poll details and user's vote
CREATE OR REPLACE FUNCTION public.bonded_get_template_poll(
  link_code TEXT,
  manage_token_hash TEXT DEFAULT NULL,
  partner_receipt_hash TEXT DEFAULT NULL,
  actor_id UUID DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARe
  t public.couple_templates;
  p public.template_polls;
  is_creator BOOLEAN := false;
  is_partner BOOLEAN := false;
  is_closed BOOLEAN := false;
  my_votes JSONB := '[]'::jsonb;
BEGIN
  SELECT * INTO t FROM public.couple_templates WHERE short_code = link_code;
  IF t.id IS NULL OR t.deleting OR t.expires_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Template unavailable');
  END IF;

  SELECT * INTO p FROM public.template_polls WHERE template_id = t.id AND tool_id = 'poll_t04';
  IF p.id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'poll', NULL);
  END IF;

  is_creator := (actor_id IS NOT NULL AND t.owner_id = actor_id) OR
                (manage_token_hash IS NOT NULL AND t.deletion_hash = manage_token_hash);

  IF partner_receipt_hash IS NOT NULL AND (p.partner_token_hash IS NULL OR p.partner_token_hash = partner_receipt_hash) THEN
    is_partner := true;
  END IF;

  IF is_creator THEN
    my_votes := p.creator_votes;
  ELSIF is_partner THEN
    my_votes := p.partner_votes;
  END IF;

  is_closed := p.status = 'closed' OR (p.closing_time IS NOT NULL AND p.closing_time <= now());

  RETURN jsonb_build_object(
    'success', true,
    'is_creator', is_creator,
    'is_partner', is_partner,
    'is_closed', is_closed,
    'my_votes', my_votes,
    'poll', jsonb_build_object(
      'id', p.id,
      'template_id', p.template_id,
      'tool_id', p.tool_id,
      'question', p.question,
      'description', p.description,
      'selection_mode', p.selection_mode,
      'allow_multiple', p.allow_multiple,
      'allow_custom_suggestion', p.allow_custom_suggestion,
      'closing_time', p.closing_time,
      'options', p.options,
      'custom_suggestions', p.custom_suggestions,
      'creator_voted', (jsonb_array_length(p.creator_votes) > 0),
      'partner_voted', (jsonb_array_length(p.partner_votes) > 0),
      'creator_votes', CASE WHEN is_creator OR (p.selection_mode = 'both_vote' AND jsonb_array_length(p.partner_votes) > 0) THEN p.creator_votes ELSE '[]'::jsonb END,
      'partner_votes', CASE WHEN is_creator OR is_partner OR is_closed THEN p.partner_votes ELSE '[]'::jsonb END,
      'resolved_option_id', p.resolved_option_id,
      'status', CASE WHEN is_closed AND p.status = 'open' THEN 'closed' ELSE p.status END,
      'revision', p.revision,
      'created_at', p.created_at,
      'updated_at', p.updated_at
    )
  );
END $$;

-- 4. Helper RPC to cast or change a vote
CREATE OR REPLACE FUNCTION public.bonded_vote_template_poll(
  link_code TEXT,
  expected_revision INT,
  selected_option_ids JSONB,
  is_creator_vote BOOLEAN,
  manage_token_hash TEXT DEFAULT NULL,
  partner_token_hash TEXT DEFAULT NULL,
  actor_id UUID DEFAULT NULL,
  custom_suggestion_text TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  t public.couple_templates;
  p public.template_polls;
  opt JSONB;
  valid_ids TEXT[] := ARRAY[]::TEXT[];
  chosen_id TEXT;
  new_custom_id TEXT;
  updated_suggestions JSONB;
  updated_creator_votes JSONB;
  updated_partner_votes JSONB;
  new_resolved_id TEXT := NULL;
  is_creator_authorized BOOLEAN := false;
  common_count INT := 0;
  is_closed BOOLEAN := false;
  in_partner_hash TEXT := partner_token_hash;
BEGIN
  -- 1. Validate template
  SELECT * INTO t FROM public.couple_templates WHERE short_code = link_code FOR UPDATE;
  IF t.id IS NULL OR t.deleting OR t.expires_at <= now() THEN
    RAISE EXCEPTION 'Template is unavailable or has expired' USING ERRCODE='42501';
  END IF;

  -- 2. Validate poll
  SELECT * INTO p FROM public.template_polls WHERE template_id = t.id AND tool_id = 'poll_t04' FOR UPDATE;
  IF p.id IS NULL THEN
    RAISE EXCEPTION 'No poll found for this template' USING ERRCODE='42501';
  END IF;

  is_closed := p.status = 'closed' OR (p.closing_time IS NOT NULL AND p.closing_time <= now());
  IF is_closed THEN
    RAISE EXCEPTION 'This poll is closed and no longer accepting votes' USING ERRCODE='42501';
  END IF;

  -- 3. Stale Check
  IF expected_revision <> p.revision THEN
    RAISE EXCEPTION 'Stale poll revision. The poll options have changed.' USING ERRCODE='40001';
  END IF;

  -- 4. Check Authorization
  is_creator_authorized := (actor_id IS NOT NULL AND t.owner_id = actor_id) OR
                           (manage_token_hash IS NOT NULL AND t.deletion_hash = manage_token_hash);

  IF is_creator_vote THEN
    IF NOT is_creator_authorized THEN
      RAISE EXCEPTION 'Not authorized to vote as creator' USING ERRCODE='42501';
    END IF;
  ELSE
    IF in_partner_hash IS NULL THEN
      RAISE EXCEPTION 'Invalid partner session' USING ERRCODE='42501';
    END IF;
    -- Lock partner token hash to this poll if not set
    IF p.partner_token_hash IS NOT NULL AND p.partner_token_hash <> in_partner_hash THEN
      -- If caller is creator, allow them to manage, else verify token matches
      IF NOT is_creator_authorized THEN
        RAISE EXCEPTION 'One person cannot vote as the other' USING ERRCODE='42501';
      END IF;
    END IF;
  END IF;

  -- 5. Collect valid option IDs
  FOR opt IN SELECT * FROM jsonb_array_elements(p.options) LOOP
    valid_ids := array_append(valid_ids, opt->>'id');
  END LOOP;
  FOR opt IN SELECT * FROM jsonb_array_elements(p.custom_suggestions) LOOP
    valid_ids := array_append(valid_ids, opt->>'id');
  END LOOP;

  updated_suggestions := p.custom_suggestions;

  -- Handle Custom Suggestion
  IF custom_suggestion_text IS NOT NULL AND trim(custom_suggestion_text) <> '' THEN
    IF NOT p.allow_custom_suggestion THEN
      RAISE EXCEPTION 'Custom suggestions are not enabled for this poll' USING ERRCODE='42501';
    END IF;

    new_custom_id := 'custom_' || substr(md5(random()::text || clock_timestamp()::text), 1, 8);
    updated_suggestions := updated_suggestions || jsonb_build_array(jsonb_build_object(
      'id', new_custom_id,
      'text', trim(custom_suggestion_text),
      'suggested_by', CASE WHEN is_creator_vote THEN 'creator' ELSE 'partner' END,
      'created_at', now()
    ));
    valid_ids := array_append(valid_ids, new_custom_id);

    -- Auto-select the newly suggested option
    IF NOT p.allow_multiple THEN
      selected_option_ids := jsonb_build_array(new_custom_id);
    ELSE
      selected_option_ids := selected_option_ids || jsonb_build_array(new_custom_id);
    END IF;
  END IF;

  -- 6. Validate selected options
  IF jsonb_array_length(selected_option_ids) = 0 THEN
    RAISE EXCEPTION 'Please select at least one option' USING ERRCODE='42501';
  END IF;

  IF NOT p.allow_multiple AND jsonb_array_length(selected_option_ids) > 1 THEN
    RAISE EXCEPTION 'Multiple choices are not allowed for this poll' USING ERRCODE='42501';
  END IF;

  FOR opt IN SELECT * FROM jsonb_array_elements(selected_option_ids) LOOP
    chosen_id := opt#>>'{}';
    IF NOT (chosen_id = ANY(valid_ids)) THEN
      RAISE EXCEPTION 'Option % is not valid for this poll', chosen_id USING ERRCODE='42501';
    END IF;
  END LOOP;

  -- 7. Apply Votes
  updated_creator_votes := p.creator_votes;
  updated_partner_votes := p.partner_votes;

  IF is_creator_vote THEN
    updated_creator_votes := selected_option_ids;
  ELSE
    updated_partner_votes := selected_option_ids;
  END IF;

  -- 8. Compute Resolved Selection
  IF p.selection_mode = 'partner_chooses' THEN
    IF jsonb_array_length(updated_partner_votes) > 0 THEN
      new_resolved_id := updated_partner_votes->>0;
    END IF;
  ELSE
    -- both_vote mode:
    -- Agreement requires a match between creator and partner votes!
    -- Disagreement or tie has NO automatic majority winner (remains unresolved).
    IF jsonb_array_length(updated_creator_votes) > 0 AND jsonb_array_length(updated_partner_votes) > 0 THEN
      SELECT c.val INTO new_resolved_id
      FROM jsonb_array_elements_text(updated_creator_votes) AS c(val)
      INNER JOIN jsonb_array_elements_text(updated_partner_votes) AS pt(val)
        ON c.val = pt.val
      LIMIT 1;
      -- If no match found, new_resolved_id will be NULL (disagreement remains unresolved!)
    END IF;
  END IF;

  UPDATE public.template_polls SET
    creator_votes = updated_creator_votes,
    partner_votes = updated_partner_votes,
    partner_token_hash = coalesce(p.partner_token_hash, in_partner_hash),
    custom_suggestions = updated_suggestions,
    resolved_option_id = new_resolved_id,
    status = CASE WHEN new_resolved_id IS NOT NULL THEN 'resolved' ELSE p.status END,
    updated_at = now()
  WHERE id = p.id;

  RETURN jsonb_build_object(
    'success', true,
    'resolved_option_id', new_resolved_id,
    'has_agreement', (new_resolved_id IS NOT NULL),
    'creator_voted', (jsonb_array_length(updated_creator_votes) > 0),
    'partner_voted', (jsonb_array_length(updated_partner_votes) > 0)
  );
END $$;

-- 5. Helper RPC to resolve tie or disagreement manually
CREATE OR REPLACE FUNCTION public.bonded_resolve_poll_manually(
  link_code TEXT,
  agreed_option_id TEXT,
  manage_token_hash TEXT DEFAULT NULL,
  actor_id UUID DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  t public.couple_templates;
  p public.template_polls;
  is_creator BOOLEAN := false;
BEGIN
  SELECT * INTO t FROM public.couple_templates WHERE short_code = link_code FOR UPDATE;
  IF t.id IS NULL OR t.deleting THEN
    RAISE EXCEPTION 'Template unavailable' USING ERRCODE='42501';
  END IF;

  is_creator := (actor_id IS NOT NULL AND t.owner_id = actor_id) OR
                (manage_token_hash IS NOT NULL AND t.deletion_hash = manage_token_hash);
  IF NOT is_creator THEN
    RAISE EXCEPTION 'Not authorized to resolve this poll' USING ERRCODE='42501';
  END IF;

  SELECT * INTO p FROM public.template_polls WHERE template_id = t.id AND tool_id = 'poll_t04' FOR UPDATE;
  IF p.id IS NULL THEN
    RAISE EXCEPTION 'Poll not found' USING ERRCODE='42501';
  END IF;

  UPDATE public.template_polls SET
    resolved_option_id = agreed_option_id,
    status = 'resolved',
    updated_at = now()
  WHERE id = p.id;

  RETURN jsonb_build_object('success', true, 'resolved_option_id', agreed_option_id);
END $$;

-- 6. Trigger to automatically initialize template_polls from couple_templates tools
CREATE OR REPLACE FUNCTION public.bonded_sync_template_poll()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  tool JSONB;
BEGIN
  IF NEW.tools IS NOT NULL AND jsonb_typeof(NEW.tools) = 'array' THEN
    FOR tool IN SELECT * FROM jsonb_array_elements(NEW.tools) LOOP
      IF tool->>'type' = 'poll' OR tool->>'id' = 'poll_t04' THEN
        INSERT INTO public.template_polls (
          template_id, tool_id, question, description, selection_mode,
          allow_multiple, allow_custom_suggestion, closing_time,
          options, status, revision
        )
        VALUES (
          NEW.id,
          'poll_t04',
          coalesce(tool->>'question', 'What should we do?'),
          coalesce(tool->>'description', ''),
          coalesce(tool->>'selectionMode', 'both_vote'),
          coalesce((tool->>'allowMultiple')::boolean, false),
          coalesce((tool->>'allowCustomSuggestion')::boolean, true),
          (tool->>'closingTime')::timestamptz,
          coalesce(tool->'options', '[]'::jsonb),
          'open',
          1
        )
        ON CONFLICT (template_id, tool_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_template_poll ON public.couple_templates;
CREATE TRIGGER trg_sync_template_poll
  AFTER INSERT OR UPDATE OF tools ON public.couple_templates
  FOR EACH ROW EXECUTE FUNCTION public.bonded_sync_template_poll();
