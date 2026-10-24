-- Validate activity answers, protect private drafts, and keep saved details usable.
BEGIN;
-- Earlier API versions accidentally stored JSON objects as JSON strings.
CREATE OR REPLACE FUNCTION private.qubit_activity_object(value jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF jsonb_typeof(value)='object' THEN RETURN value; END IF;
  IF jsonb_typeof(value)='string' THEN
    BEGIN value:=(value#>>'{}')::jsonb; EXCEPTION WHEN OTHERS THEN RETURN NULL; END;
    IF jsonb_typeof(value)='object' THEN RETURN value; END IF;
  END IF;
  RETURN NULL;
END $$;
UPDATE public.template_question_submissions SET answers=coalesce(private.qubit_activity_object(answers),'{}'::jsonb) WHERE jsonb_typeof(answers)<>'object';
UPDATE public.template_private_reveals SET creator_draft=private.qubit_activity_object(creator_draft),partner_draft=private.qubit_activity_object(partner_draft),creator_answer=private.qubit_activity_object(creator_answer),partner_answer=private.qubit_activity_object(partner_answer);
DROP FUNCTION private.qubit_activity_object(jsonb);
UPDATE public.template_question_cards c SET partner_token_hash=(SELECT s.author_token_hash FROM public.template_question_submissions s WHERE s.template_id=c.template_id AND s.tool_id=c.tool_id AND s.author_role='partner' AND s.author_token_hash IS NOT NULL ORDER BY s.updated_at DESC LIMIT 1) WHERE c.partner_token_hash IS NULL;
ALTER TABLE public.template_question_submissions ADD COLUMN question_snapshot jsonb;
CREATE OR REPLACE FUNCTION private.qubit_question_snapshot() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF TG_OP='UPDATE' AND OLD.question_revision=NEW.question_revision AND OLD.question_snapshot IS NOT NULL THEN NEW.question_snapshot:=OLD.question_snapshot;
  ELSE SELECT c.questions INTO NEW.question_snapshot FROM public.template_question_cards c WHERE c.template_id=NEW.template_id AND c.tool_id=NEW.tool_id; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER qubit_question_snapshot BEFORE INSERT OR UPDATE OF answers ON public.template_question_submissions FOR EACH ROW EXECUTE FUNCTION private.qubit_question_snapshot();

CREATE OR REPLACE FUNCTION private.qubit_require_activity(tools jsonb, activity_type text) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(tools,'[]'::jsonb)) item WHERE item->>'type'=activity_type AND item->>'enabled' IS DISTINCT FROM 'false') THEN RAISE EXCEPTION 'This activity is not enabled' USING ERRCODE='42501'; END IF;
END $$;

CREATE OR REPLACE FUNCTION private.qubit_validate_question_answers(questions jsonb, answers jsonb, final_submission boolean)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE q jsonb; a jsonb; key text;
BEGIN
  IF jsonb_typeof(answers) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Answers must be an object' USING ERRCODE='22023'; END IF;
  FOR key IN SELECT jsonb_object_keys(answers) LOOP
    IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(questions) candidate WHERE candidate->>'id'=key) THEN RAISE EXCEPTION 'Unknown question' USING ERRCODE='22023'; END IF;
  END LOOP;
  FOR q IN SELECT * FROM jsonb_array_elements(questions) LOOP
    a:=answers->(q->>'id');
    IF a IS NULL THEN
      IF final_submission AND NOT coalesce((q->>'skippable')::boolean,true) THEN RAISE EXCEPTION 'Question % is required',q->>'id' USING ERRCODE='22023'; END IF;
      CONTINUE;
    END IF;
    IF jsonb_typeof(a)<>'object' OR a->>'question_id' IS DISTINCT FROM q->>'id' THEN RAISE EXCEPTION 'Invalid question answer' USING ERRCODE='22023'; END IF;
    IF length(coalesce(a->>'answer_text',''))>2000 OR length(coalesce(a->>'selected_choice',''))>200 THEN RAISE EXCEPTION 'Answer is too long' USING ERRCODE='22023'; END IF;
    IF coalesce((a->>'skipped')::boolean,false) THEN
      IF NOT coalesce((q->>'skippable')::boolean,true) THEN RAISE EXCEPTION 'Question % is required and cannot be skipped',q->>'id' USING ERRCODE='22023'; END IF;
      CONTINUE;
    END IF;
    IF q->>'type'='choice' THEN
      IF nullif(btrim(a->>'selected_choice'),'') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(q->'options') v WHERE v=a->>'selected_choice') THEN RAISE EXCEPTION 'Choose an offered answer' USING ERRCODE='22023'; END IF;
      IF final_submission AND nullif(btrim(a->>'selected_choice'),'') IS NULL THEN RAISE EXCEPTION 'Choose an answer or skip the optional question' USING ERRCODE='22023'; END IF;
    ELSIF final_submission AND nullif(btrim(a->>'answer_text'),'') IS NULL THEN RAISE EXCEPTION 'Write an answer or skip the optional question' USING ERRCODE='22023'; END IF;
  END LOOP;
END $$;
CREATE OR REPLACE FUNCTION private.qubit_validate_secret_answers(prompt_questions jsonb, answers jsonb, final_submission boolean)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE q jsonb; key text;
BEGIN
  IF jsonb_typeof(answers) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Secret answers must be an object' USING ERRCODE='22023'; END IF;
  IF coalesce(jsonb_array_length(prompt_questions),0)=0 THEN prompt_questions:='[{"id":"main"}]'::jsonb; END IF;
  FOR key IN SELECT jsonb_object_keys(answers) LOOP
    IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(prompt_questions) candidate WHERE candidate->>'id'=key) OR jsonb_typeof(answers->key)<>'string' OR length(answers->>key)>2000 THEN RAISE EXCEPTION 'Invalid secret answer' USING ERRCODE='22023'; END IF;
  END LOOP;
  IF final_submission THEN
    FOR q IN SELECT * FROM jsonb_array_elements(prompt_questions) LOOP
      IF nullif(btrim(answers->>(q->>'id')),'') IS NULL THEN RAISE EXCEPTION 'Answer every secret question before locking' USING ERRCODE='22023'; END IF;
    END LOOP;
  END IF;
END $$;

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
      'creator_votes', CASE WHEN is_creator OR (is_partner AND p.selection_mode = 'both_vote' AND jsonb_array_length(p.partner_votes) > 0) THEN p.creator_votes ELSE '[]'::jsonb END,
      'partner_votes', CASE WHEN is_creator OR is_partner THEN p.partner_votes ELSE '[]'::jsonb END,
      'resolved_option_id', p.resolved_option_id,
      'status', CASE WHEN is_closed AND p.status = 'open' THEN 'closed' ELSE p.status END,
      'revision', p.revision,
      'created_at', p.created_at,
      'updated_at', p.updated_at
    )
  );
END $$;

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
  PERFORM private.qubit_require_activity(t.tools,'poll');
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
      RAISE EXCEPTION 'One person cannot vote as the other' USING ERRCODE='42501';
    END IF;
  END IF;

  IF jsonb_typeof(selected_option_ids) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Choose valid poll options' USING ERRCODE='22023'; END IF;
  SELECT coalesce(jsonb_agg(value),'[]'::jsonb) INTO selected_option_ids FROM (SELECT DISTINCT value FROM jsonb_array_elements(selected_option_ids)) ids;
  IF length(coalesce(custom_suggestion_text,''))>200 THEN RAISE EXCEPTION 'Suggestion is too long' USING ERRCODE='22023'; END IF;
  IF is_creator_vote AND p.selection_mode='partner_chooses' THEN RAISE EXCEPTION 'This poll is for your receiver to choose' USING ERRCODE='22023'; END IF;
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
    status = CASE WHEN new_resolved_id IS NOT NULL THEN 'resolved' ELSE 'open' END,
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
  IF t.id IS NULL OR t.deleting OR t.expires_at<=now() THEN
    RAISE EXCEPTION 'Template unavailable' USING ERRCODE='42501';
  END IF;

  is_creator := (actor_id IS NOT NULL AND t.owner_id = actor_id) OR
                (manage_token_hash IS NOT NULL AND t.deletion_hash = manage_token_hash);
  IF NOT is_creator THEN
    RAISE EXCEPTION 'Not authorized to resolve this poll' USING ERRCODE='42501';
  END IF;

  PERFORM private.qubit_require_activity(t.tools,'poll');
  SELECT * INTO p FROM public.template_polls WHERE template_id = t.id AND tool_id = 'poll_t04' FOR UPDATE;
  IF p.id IS NULL THEN
    RAISE EXCEPTION 'Poll not found' USING ERRCODE='42501';
  END IF;

  IF p.status='closed' OR (p.closing_time IS NOT NULL AND p.closing_time<=now()) THEN RAISE EXCEPTION 'This poll is closed' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p.options || p.custom_suggestions) opt WHERE opt->>'id'=agreed_option_id) THEN RAISE EXCEPTION 'Choose an offered poll option' USING ERRCODE='22023'; END IF;
  UPDATE public.template_polls SET
    resolved_option_id = agreed_option_id,
    status = 'resolved',
    updated_at = now()
  WHERE id = p.id;

  RETURN jsonb_build_object('success', true, 'resolved_option_id', agreed_option_id);
END $$;

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
      ELSIF coalesce(q_elem->>'reveal_mode', 'after_partner_answers') = 'after_partner_answers' AND partner_has_submitted AND is_partner THEN
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

  IF is_partner AND NOT is_creator AND partner_sub_row.id IS NOT NULL THEN
    SELECT coalesce(jsonb_object_agg(entry.key,entry.value),'{}'::jsonb) INTO partner_sub_row.answers FROM jsonb_each(partner_sub_row.answers) entry WHERE EXISTS(SELECT 1 FROM jsonb_array_elements(c.questions) question WHERE question->>'id'=entry.key AND (question->>'reveal_mode'='always' OR (coalesce(question->>'reveal_mode','after_partner_answers')='after_partner_answers' AND partner_has_submitted)));
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
  PERFORM private.qubit_require_activity(t.tools,'question');
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
      RAISE EXCEPTION 'One person cannot answer as the other' USING ERRCODE='42501';
    END IF;
    target_role := 'partner';
  END IF;

  PERFORM private.qubit_validate_question_answers(c.questions,answers,false);
  IF NOT is_creator_draft THEN UPDATE public.template_question_cards SET partner_token_hash=coalesce(c.partner_token_hash,in_partner_hash) WHERE id=c.id; END IF;
  IF EXISTS(SELECT 1 FROM public.template_question_submissions WHERE template_id=t.id AND tool_id='question_t05' AND author_role=target_role AND question_revision=c.revision AND is_draft=false) THEN RAISE EXCEPTION 'Answers are already submitted' USING ERRCODE='22023'; END IF;
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
  PERFORM private.qubit_require_activity(t.tools,'question');
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
      RAISE EXCEPTION 'One person cannot answer as the other' USING ERRCODE='42501';
    END IF;
    target_role := 'partner';
  END IF;

  PERFORM private.qubit_validate_question_answers(c.questions,answers,true);
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
    IF is_revealed THEN
      partner_ans_out := r.partner_answer;
    ELSE
      partner_ans_out := NULL; -- STRICTLY WITHHELD
    END IF;
  ELSIF is_partner THEN
    my_draft_out := r.partner_draft;
    my_ans_out := r.partner_answer;
    IF is_revealed THEN
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
  PERFORM private.qubit_require_activity(t.tools,'private_reveal');
  SELECT * INTO r FROM public.template_private_reveals WHERE template_id = t.id AND tool_id = 'reveal_t06' FOR UPDATE;
  IF r.id IS NULL THEN
    RAISE EXCEPTION 'Private reveal tool not found' USING ERRCODE='42501';
  END IF;

  PERFORM private.qubit_validate_secret_answers(r.questions,answers,false);
  IF r.revealed_at IS NOT NULL OR r.status='cancelled' THEN RAISE EXCEPTION 'This secret round is no longer editable' USING ERRCODE='42501'; END IF;
  
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
      RAISE EXCEPTION 'One person cannot answer as the other' USING ERRCODE='42501';
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
  PERFORM private.qubit_require_activity(t.tools,'private_reveal');
  SELECT * INTO r FROM public.template_private_reveals WHERE template_id = t.id AND tool_id = 'reveal_t06' FOR UPDATE;
  IF r.id IS NULL THEN
    RAISE EXCEPTION 'Private reveal tool not found' USING ERRCODE='42501';
  END IF;

  PERFORM private.qubit_validate_secret_answers(r.questions,answers,true);
  IF r.revealed_at IS NOT NULL OR r.status='cancelled' THEN RAISE EXCEPTION 'This secret round is no longer editable' USING ERRCODE='42501'; END IF;
  IF (is_creator_action AND r.creator_locked_at IS NOT NULL) OR (NOT is_creator_action AND r.partner_locked_at IS NOT NULL) THEN RAISE EXCEPTION 'Withdraw your locked answer before editing' USING ERRCODE='42501'; END IF;
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
      RAISE EXCEPTION 'One person cannot answer as the other' USING ERRCODE='42501';
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
  IF t.id IS NULL OR t.deleting OR t.expires_at<=now() THEN
    RAISE EXCEPTION 'Template unavailable' USING ERRCODE='42501';
  END IF;

  -- 2. Find reveal
  PERFORM private.qubit_require_activity(t.tools,'private_reveal');
  SELECT * INTO r FROM public.template_private_reveals WHERE template_id = t.id AND tool_id = 'reveal_t06' FOR UPDATE;
  IF r.id IS NULL THEN
    RAISE EXCEPTION 'Private reveal tool not found' USING ERRCODE='42501';
  END IF;

  IF expected_revision<>r.revision THEN RAISE EXCEPTION 'Stale reveal revision' USING ERRCODE='40001'; END IF;
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
      RAISE EXCEPTION 'One person cannot answer as the other' USING ERRCODE='42501';
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
  IF t.id IS NULL OR t.deleting OR t.expires_at<=now() THEN
    RAISE EXCEPTION 'Template unavailable' USING ERRCODE='42501';
  END IF;

  -- 2. Find reveal
  PERFORM private.qubit_require_activity(t.tools,'private_reveal');
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
      RAISE EXCEPTION 'One person cannot answer as the other' USING ERRCODE='42501';
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

-- Restrict all changed RPCs and validation helpers to the server role.
DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE (n.nspname='public' AND p.proname IN ('bonded_get_template_poll','bonded_vote_template_poll','bonded_resolve_poll_manually','bonded_get_template_questions','bonded_save_question_draft','bonded_submit_question_answers','bonded_get_template_reveal','bonded_save_reveal_draft','bonded_lock_reveal_answer','bonded_withdraw_reveal_answer','bonded_confirm_reveal')) OR (n.nspname='private' AND p.proname IN ('qubit_validate_question_answers','qubit_validate_secret_answers','qubit_require_activity','qubit_question_snapshot')) LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
  END LOOP;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
