-- Complete the sender's side atomically with publishing, never in the recipient flow.
BEGIN;
ALTER TABLE public.template_polls ADD COLUMN sender_prepared boolean NOT NULL DEFAULT false;
ALTER TABLE public.template_private_reveals ADD COLUMN sender_prepared boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.qubit_publish_order(p_order_id uuid,p_actor_id uuid,p_guest_owner text,p_deletion_hash text,p_template_data jsonb,p_asset_ids uuid[])
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE purchased public.store_orders; result jsonb; link_id uuid; raw_tools jsonb; clean_tools jsonb:='[]'::jsonb; tool jsonb; q jsonb; answers jsonb; choices jsonb; code text;
BEGIN
 SELECT * INTO purchased FROM public.store_orders WHERE id=p_order_id FOR UPDATE;
 IF purchased.id IS NULL OR purchased.buyer_id IS DISTINCT FROM p_actor_id OR purchased.status<>'paid' OR purchased.fulfilled_at IS NOT NULL THEN RAISE EXCEPTION 'A paid, unused order belonging to this account is required' USING ERRCODE='42501'; END IF;
 IF p_template_data->>'theme' IS DISTINCT FROM purchased.product_slug THEN RAISE EXCEPTION 'This order is for a different product' USING ERRCODE='42501'; END IF;
 raw_tools:=coalesce(p_template_data->'tools','[]'::jsonb);
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(raw_tools) entry WHERE entry->>'enabled' IS DISTINCT FROM 'false' GROUP BY entry->>'id' HAVING count(*)>1) THEN RAISE EXCEPTION 'Each tool can be added only once' USING ERRCODE='22023'; END IF;
 FOR tool IN SELECT * FROM jsonb_array_elements(raw_tools) LOOP
  clean_tools:=clean_tools||jsonb_build_array(tool-'senderAnswers'-'senderOptionIds');
  IF tool->>'enabled'='false' THEN CONTINUE; END IF;
  IF tool->>'type'='poll' AND coalesce(tool->>'selectionMode','both_vote')='both_vote' THEN
   choices:=tool->'senderOptionIds';
   IF jsonb_typeof(choices) IS DISTINCT FROM 'array' OR coalesce(jsonb_array_length(choices),0)=0 THEN RAISE EXCEPTION 'Choose your own answer in Vibe Check & Poll before publishing' USING ERRCODE='22023'; END IF;
  ELSIF tool->>'type'='question' THEN
   IF coalesce(jsonb_array_length(tool->'questions'),0)=0 THEN RAISE EXCEPTION 'Add a question and your answer before publishing' USING ERRCODE='22023'; END IF;
   FOR q IN SELECT * FROM jsonb_array_elements(tool->'questions') LOOP
    IF nullif(btrim(q->>'sender_answer'),'') IS NULL THEN RAISE EXCEPTION 'Write your answer in Heart-to-Heart Q&A before publishing' USING ERRCODE='22023'; END IF;
   END LOOP;
  ELSIF tool->>'type'='private_reveal' THEN
   PERFORM private.qubit_validate_secret_answers(coalesce(tool->'questions','[]'::jsonb),tool->'senderAnswers',true);
  END IF;
 END LOOP;
 p_template_data:=p_template_data||jsonb_build_object('tools',clean_tools,'expires_at',now()+make_interval(hours=>purchased.duration_hours));
 result:=public.bonded_create_template(p_actor_id,p_guest_owner,p_deletion_hash,p_template_data,p_asset_ids);
 code:=result->>'short_code';SELECT id INTO link_id FROM public.couple_templates WHERE short_code=code;
 FOR tool IN SELECT * FROM jsonb_array_elements(raw_tools) LOOP
  IF tool->>'enabled'='false' THEN CONTINUE; END IF;
  IF tool->>'type'='poll' THEN
   IF coalesce(tool->>'selectionMode','both_vote')='both_vote' THEN
    PERFORM public.bonded_vote_template_poll(code,1,tool->'senderOptionIds',true,p_deletion_hash,NULL,p_actor_id,NULL);
   END IF;
   UPDATE public.template_polls SET sender_prepared=true WHERE template_id=link_id;
  ELSIF tool->>'type'='question' THEN
   answers:='{}'::jsonb;
   FOR q IN SELECT * FROM jsonb_array_elements(tool->'questions') LOOP
    answers:=answers||jsonb_build_object(q->>'id',jsonb_build_object('question_id',q->>'id','skipped',false)||CASE WHEN q->>'type'='choice' THEN jsonb_build_object('selected_choice',btrim(q->>'sender_answer')) ELSE jsonb_build_object('answer_text',btrim(q->>'sender_answer')) END);
   END LOOP;
   PERFORM public.bonded_submit_question_answers(code,1,answers,true,p_deletion_hash,NULL,p_actor_id);
  ELSIF tool->>'type'='private_reveal' THEN
   PERFORM public.bonded_lock_reveal_answer(code,1,tool->'senderAnswers',true,p_deletion_hash,NULL,p_actor_id);
   UPDATE public.template_private_reveals SET sender_prepared=true,creator_ready_at=now() WHERE template_id=link_id;
  END IF;
 END LOOP;
 UPDATE public.store_orders SET template_id=link_id,fulfilled_at=now(),updated_at=now() WHERE id=p_order_id;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.qubit_publish_order(uuid,uuid,text,text,jsonb,uuid[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.qubit_publish_order(uuid,uuid,text,text,jsonb,uuid[]) TO service_role;


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
      'sender_prepared', p.sender_prepared,
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
      'sender_prepared', r.sender_prepared,
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
  IF is_creator_vote AND p.sender_prepared THEN RAISE EXCEPTION 'Your poll choice was saved during setup' USING ERRCODE='22023'; END IF;
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
  IF is_creator_action AND r.sender_prepared THEN RAISE EXCEPTION 'Your secret answer was locked during setup' USING ERRCODE='22023'; END IF;
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
  IF is_creator_action AND r.sender_prepared THEN RAISE EXCEPTION 'Your secret answer was locked during setup' USING ERRCODE='22023'; END IF;
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

  IF is_creator_action AND r.sender_prepared THEN RAISE EXCEPTION 'Your secret answer was locked during setup' USING ERRCODE='22023'; END IF;
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
DO $$ DECLARE f record; BEGIN FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('bonded_get_template_poll','bonded_get_template_reveal','bonded_vote_template_poll','bonded_save_reveal_draft','bonded_lock_reveal_answer','bonded_withdraw_reveal_answer') LOOP EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);END LOOP;END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
