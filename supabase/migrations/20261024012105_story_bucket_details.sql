-- Preserve story ownership and bucket-list activity details.
BEGIN;
CREATE OR REPLACE FUNCTION private.qubit_attach_memory_photo(p_url text,p_asset uuid,p_template uuid,p_actor uuid,p_guest text) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE m private.media_assets;
BEGIN
 IF coalesce(length(p_url),0) NOT BETWEEN 1 AND 1000 OR (p_url NOT LIKE '/api/media/%' AND p_url !~ '^https?://[^[:space:]]+$') THEN RAISE EXCEPTION 'Choose a valid memory photo' USING ERRCODE='22023'; END IF;
 IF p_url LIKE '/api/media/%' THEN
  IF p_asset IS NULL OR p_url<>'/api/media/'||p_asset::text THEN RAISE EXCEPTION 'This photo needs its upload receipt' USING ERRCODE='42501'; END IF;
 END IF;
 IF p_asset IS NOT NULL THEN
  IF p_url<>'/api/media/'||p_asset::text THEN RAISE EXCEPTION 'The photo does not match its upload receipt' USING ERRCODE='42501'; END IF;
  SELECT * INTO m FROM private.media_assets WHERE id=p_asset FOR UPDATE;
  IF m.id IS NULL OR m.resource_type<>'image' OR NOT (m.state='pending' OR (m.state='attached' AND m.template_id=p_template)) OR NOT coalesce((p_actor IS NOT NULL AND m.owner_id=p_actor) OR (m.owner_id IS NULL AND p_guest IS NOT NULL AND m.guest_hash=p_guest),false) THEN RAISE EXCEPTION 'Invalid media ownership' USING ERRCODE='42501'; END IF;
  UPDATE private.media_assets SET template_id=p_template,state='attached' WHERE id=p_asset;
 END IF;
END $$;

CREATE OR REPLACE FUNCTION public.bonded_get_template_our_story(
  p_link_code TEXT,
  p_manage_token_hash TEXT DEFAULT NULL,
  p_partner_token_hash TEXT DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  t public.couple_templates;
  s public.template_our_story;
  is_creator BOOLEAN := false;
  is_partner BOOLEAN := false;
  sanitized_contrib JSONB := NULL;
BEGIN
  -- 1. Validate template
  SELECT * INTO t FROM public.couple_templates WHERE short_code = p_link_code;
  IF t.id IS NULL OR t.deleting OR t.expires_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Template unavailable');
  END IF;

  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(t.tools) item WHERE item->>'type'='our_story' AND item->>'enabled' IS DISTINCT FROM 'false') THEN RETURN jsonb_build_object('success',true,'story',NULL); END IF;
  -- 2. Find story record
  SELECT * INTO s FROM public.template_our_story WHERE template_id = t.id AND tool_id = 'our_story_t10';
  IF s.id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'story', NULL);
  END IF;

  -- 3. Check creator authorization
  is_creator := coalesce(
    (p_actor_id IS NOT NULL AND t.owner_id = p_actor_id) OR
    (p_manage_token_hash IS NOT NULL AND t.deletion_hash = p_manage_token_hash),
    false
  );

  -- 4. Check partner contribution and sanitize
  IF s.partner_contribution IS NOT NULL THEN
    IF (p_partner_token_hash IS NOT NULL AND s.partner_contribution->>'partner_token_hash' = p_partner_token_hash) OR
       (p_actor_id IS NOT NULL AND s.partner_contribution->>'actor_id' IS NOT NULL AND s.partner_contribution->>'actor_id' = p_actor_id::text) THEN
      is_partner := true;
    END IF;

    sanitized_contrib := jsonb_build_object(
      'id', s.partner_contribution->>'id',
      'author_name', s.partner_contribution->>'author_name',
      'caption', s.partner_contribution->>'caption',
      'photo_url', s.partner_contribution->>'photo_url',
      'date', s.partner_contribution->>'date',
      'created_at', s.partner_contribution->>'created_at'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'is_creator', is_creator,
    'is_partner', is_partner,
    'story', jsonb_build_object(
      'id', s.id,
      'template_id', s.template_id,
      'tool_id', s.tool_id,
      'title', s.title,
      'description', s.description,
      'cards', s.cards,
      'partner_contribution', sanitized_contrib,
      'revision', s.revision,
      'created_at', s.created_at,
      'updated_at', s.updated_at
    )
  );
END $$;

CREATE OR REPLACE FUNCTION public.bonded_submit_our_story_partner_side(
  p_link_code TEXT,
  p_author_name TEXT,
  p_caption TEXT,
  p_photo_url TEXT,
  p_date TEXT DEFAULT NULL,
  p_asset_id UUID DEFAULT NULL,
  p_partner_token_hash TEXT DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL,
  p_guest_owner TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  t public.couple_templates;
  s public.template_our_story;
  matched INT;
  contribution_id UUID := gen_random_uuid();
  new_contrib JSONB;
BEGIN
  -- 1. Validate template
  SELECT * INTO t FROM public.couple_templates WHERE short_code = p_link_code FOR UPDATE;
  IF t.id IS NULL OR t.deleting OR t.expires_at <= now() THEN
    RAISE EXCEPTION 'Template is unavailable or has expired' USING ERRCODE='42501';
  END IF;


  PERFORM private.qubit_require_activity(t.tools,'our_story');
  -- 2. Verify creator cannot submit partner side
  IF p_actor_id IS NOT NULL AND t.owner_id = p_actor_id THEN
    RAISE EXCEPTION 'Creators cannot submit partner side' USING ERRCODE='42501';
  END IF;

  -- 3. Verify story record exists
  SELECT * INTO s FROM public.template_our_story WHERE template_id = t.id AND tool_id = 'our_story_t10' FOR UPDATE;
  IF s.id IS NULL THEN
    RAISE EXCEPTION 'Our Story Memories not configured' USING ERRCODE='P0002';
  END IF;

  IF coalesce(length(trim(p_caption)),0) NOT BETWEEN 1 AND 500 OR length(coalesce(p_author_name,''))>50 OR length(coalesce(p_date,''))>100 THEN RAISE EXCEPTION 'Check your memory details' USING ERRCODE='22023'; END IF;
  IF p_partner_token_hash IS NULL AND p_actor_id IS NULL THEN RAISE EXCEPTION 'A contribution receipt is required' USING ERRCODE='42501'; END IF;
  IF s.partner_contribution IS NOT NULL AND NOT coalesce((p_partner_token_hash IS NOT NULL AND s.partner_contribution->>'partner_token_hash'=p_partner_token_hash) OR (p_actor_id IS NOT NULL AND s.partner_contribution->>'actor_id'=p_actor_id::text),false) THEN RAISE EXCEPTION 'This memory belongs to another contributor' USING ERRCODE='42501'; END IF;
  PERFORM private.qubit_attach_memory_photo(p_photo_url,p_asset_id,t.id,p_actor_id,p_guest_owner);
  -- 5. Construct separately authored partner contribution
  new_contrib := jsonb_build_object(
    'id', contribution_id,
    'author_name', coalesce(nullif(trim(p_author_name), ''), 'My Love'),
    'caption', trim(p_caption),
    'photo_url', trim(p_photo_url),
    'date', nullif(trim(p_date), ''),
    'created_at', to_jsonb(now()),
    'partner_token_hash', p_partner_token_hash,
    'actor_id', p_actor_id
  );

  -- 6. Update story row
  UPDATE public.template_our_story SET
    partner_contribution = new_contrib,
    updated_at = now()
  WHERE id = s.id;

  RETURN jsonb_build_object(
    'success', true,
    'partner_contribution', jsonb_build_object(
      'id', contribution_id,
      'author_name', coalesce(nullif(trim(p_author_name), ''), 'My Love'),
      'caption', trim(p_caption),
      'photo_url', trim(p_photo_url),
      'date', nullif(trim(p_date), ''),
      'created_at', to_jsonb(now())
    )
  );
END $$;

CREATE OR REPLACE FUNCTION public.bonded_delete_our_story_partner_side(
  p_link_code TEXT,
  p_partner_token_hash TEXT DEFAULT NULL,
  p_manage_token_hash TEXT DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  t public.couple_templates;
  s public.template_our_story;
  is_creator BOOLEAN := false;
  is_contrib_owner BOOLEAN := false;
BEGIN
  SELECT * INTO t FROM public.couple_templates WHERE short_code = p_link_code FOR UPDATE;
  IF t.id IS NULL OR t.deleting OR t.expires_at <= now() THEN
    RAISE EXCEPTION 'Template is unavailable or has expired' USING ERRCODE='42501';
  END IF;


  PERFORM private.qubit_require_activity(t.tools,'our_story');
  SELECT * INTO s FROM public.template_our_story WHERE template_id = t.id AND tool_id = 'our_story_t10' FOR UPDATE;
  IF s.id IS NULL OR s.partner_contribution IS NULL THEN
    RAISE EXCEPTION 'No contribution found' USING ERRCODE='P0002';
  END IF;

  is_creator := coalesce(
    (p_actor_id IS NOT NULL AND t.owner_id = p_actor_id) OR
    (p_manage_token_hash IS NOT NULL AND t.deletion_hash = p_manage_token_hash),
    false
  );

  is_contrib_owner := coalesce(
    (p_partner_token_hash IS NOT NULL AND s.partner_contribution->>'partner_token_hash' = p_partner_token_hash) OR
    (p_actor_id IS NOT NULL AND s.partner_contribution->>'actor_id' IS NOT NULL AND s.partner_contribution->>'actor_id' = p_actor_id::text),
    false
  );

  IF NOT is_creator AND NOT is_contrib_owner THEN
    RAISE EXCEPTION 'Not authorized to delete this contribution' USING ERRCODE='42501';
  END IF;

  UPDATE public.template_our_story SET
    partner_contribution = NULL,
    updated_at = now()
  WHERE id = s.id;

  RETURN jsonb_build_object('success', true);
END $$;

CREATE OR REPLACE FUNCTION public.bonded_get_template_bucket_list(
  p_link_code TEXT,
  p_manage_token_hash TEXT DEFAULT NULL,
  p_partner_token_hash TEXT DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  t public.couple_templates;
  b public.template_bucket_list;
  is_creator BOOLEAN := false;
  is_partner BOOLEAN := false;
BEGIN
  -- 1. Validate template
  SELECT * INTO t FROM public.couple_templates WHERE short_code = p_link_code;
  IF t.id IS NULL OR t.deleting OR t.expires_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Template unavailable');
  END IF;

  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(t.tools) item WHERE item->>'type'='bucket_list' AND item->>'enabled' IS DISTINCT FROM 'false') THEN RETURN jsonb_build_object('success',true,'bucket_list',NULL); END IF;
  -- 2. Find bucket list record
  SELECT * INTO b FROM public.template_bucket_list WHERE template_id = t.id AND tool_id = 'bucket_list_t11';
  IF b.id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'bucket_list', NULL);
  END IF;

  -- 3. Check authorization
  is_creator := coalesce(
    (p_actor_id IS NOT NULL AND t.owner_id = p_actor_id) OR
    (p_manage_token_hash IS NOT NULL AND t.deletion_hash = p_manage_token_hash),
    false
  );

  is_partner := coalesce(
    (p_partner_token_hash IS NOT NULL) OR
    (p_actor_id IS NOT NULL AND (t.owner_id IS NULL OR t.owner_id <> p_actor_id)),
    false
  );

  RETURN jsonb_build_object(
    'success', true,
    'is_creator', is_creator,
    'is_partner', is_partner,
    'bucket_list', jsonb_build_object(
      'id', b.id,
      'template_id', b.template_id,
      'tool_id', b.tool_id,
      'title', b.title,
      'description', b.description,
      'items', b.items,
      'revision', b.revision,
      'created_at', b.created_at,
      'updated_at', b.updated_at
    )
  );
END $$;

CREATE OR REPLACE FUNCTION public.bonded_mutate_template_bucket_list(
  p_link_code TEXT,
  p_action TEXT,
  p_item_id TEXT DEFAULT NULL,
  p_payload JSONB DEFAULT '{}'::jsonb,
  p_partner_token_hash TEXT DEFAULT NULL,
  p_manage_token_hash TEXT DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL,
  p_guest_owner TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  t public.couple_templates;
  b public.template_bucket_list;
  is_creator BOOLEAN := false;
  is_partner BOOLEAN := false;
  caller_role TEXT := 'partner';
  curr_items JSONB;
  updated_items JSONB := '[]'::jsonb;
  item JSONB;
  found BOOLEAN := false;
  new_item JSONB;
  new_title TEXT;
  new_note TEXT;
  asset_id_val UUID;
  matched INT;
  original jsonb;
  event jsonb;
BEGIN
  -- 1. Validate template
  SELECT * INTO t FROM public.couple_templates WHERE short_code = p_link_code FOR UPDATE;
  IF t.id IS NULL OR t.deleting OR t.expires_at <= now() THEN
    RAISE EXCEPTION 'Template is unavailable or has expired' USING ERRCODE='42501';
  END IF;


  PERFORM private.qubit_require_activity(t.tools,'bucket_list');
  -- 2. Validate bucket list row
  SELECT * INTO b FROM public.template_bucket_list WHERE template_id = t.id AND tool_id = 'bucket_list_t11' FOR UPDATE;
  IF b.id IS NULL THEN
    RAISE EXCEPTION 'Bucket list not configured' USING ERRCODE='P0002';
  END IF;

  IF p_payload ? 'expected_revision' AND (p_payload->>'expected_revision')::int<>b.revision THEN RAISE EXCEPTION 'This list changed. Refresh before trying again.' USING ERRCODE='40001'; END IF;
  -- 3. Check authorization
  is_creator := coalesce(
    (p_actor_id IS NOT NULL AND t.owner_id = p_actor_id) OR
    (p_manage_token_hash IS NOT NULL AND t.deletion_hash = p_manage_token_hash),
    false
  );

  is_partner := coalesce(
    (p_partner_token_hash IS NOT NULL) OR
    (p_actor_id IS NOT NULL AND (t.owner_id IS NULL OR t.owner_id <> p_actor_id)) OR
    (p_guest_owner IS NOT NULL),
    false
  );

  IF NOT is_creator AND NOT is_partner THEN
    RAISE EXCEPTION 'Not authorized to modify bucket list' USING ERRCODE='42501';
  END IF;

  IF is_creator THEN
    caller_role := 'creator';
  ELSE
    caller_role := 'partner';
  END IF;

  curr_items := coalesce(b.items, '[]'::jsonb);

  -- 4. Execute action
  IF p_action = 'add_item' THEN
    new_title := nullif(trim(p_payload->>'title'), '');
    IF new_title IS NULL THEN
      RAISE EXCEPTION 'Idea title is required' USING ERRCODE='22023';
    END IF;

    IF jsonb_array_length(curr_items) >= 20 THEN
      RAISE EXCEPTION 'Maximum 20 bucket list ideas reached' USING ERRCODE='22023';
    END IF;

    IF length(new_title)>120 OR length(coalesce(p_payload->>'note',''))>500 THEN RAISE EXCEPTION 'Check the idea title and note' USING ERRCODE='22023'; END IF;
    IF p_item_id IS NOT NULL AND EXISTS(SELECT 1 FROM jsonb_array_elements(curr_items) i WHERE i->>'id'=p_item_id) THEN RAISE EXCEPTION 'Each idea needs a unique ID' USING ERRCODE='22023'; END IF;
    new_note := nullif(trim(p_payload->>'note'), '');

    new_item := jsonb_build_object(
      'id', coalesce(nullif(p_item_id, ''), 'item_' || gen_random_uuid()::text),
      'history',jsonb_build_array(jsonb_build_object('action','idea_added','by',caller_role,'at',now(),'status','wished','note',new_note)),
      'title', new_title,
      'note', new_note,
      'status', 'wished',
      'created_by', caller_role,
      'created_at', to_jsonb(now()),
      'creator_interested', (caller_role = 'creator'),
      'partner_interested', (caller_role = 'partner'),
      'planning_started_at', NULL,
      'completed_at', NULL,
      'memory_photo_url', NULL,
      'memory_note', NULL
    );

    updated_items := curr_items || jsonb_build_array(new_item);

  ELSIF p_action IN ('toggle_interest', 'plan_item', 'complete_item', 'attach_memory', 'revert_status') THEN
    IF p_item_id IS NULL OR trim(p_item_id) = '' THEN
      RAISE EXCEPTION 'Item ID is required' USING ERRCODE='22023';
    END IF;

    FOR item IN SELECT * FROM jsonb_array_elements(curr_items) LOOP
      IF item->>'id' = p_item_id THEN
        found := true;
        original:=item;

        IF p_action = 'toggle_interest' THEN
          IF caller_role = 'creator' THEN
            item := jsonb_set(item, '{creator_interested}', to_jsonb(coalesce((p_payload->>'interested')::boolean,NOT coalesce((item->>'creator_interested')::boolean,false))));
          ELSE
            item := jsonb_set(item, '{partner_interested}', to_jsonb(coalesce((p_payload->>'interested')::boolean,NOT coalesce((item->>'partner_interested')::boolean,false))));
          END IF;

        ELSIF p_action = 'plan_item' THEN
          IF item->>'status'='completed' THEN RAISE EXCEPTION 'Move this idea back to planning first' USING ERRCODE='22023'; END IF;
          -- Move to planning without automatically confirming an event
          item := jsonb_set(item, '{status}', '"planning"'::jsonb);
          IF item->>'planning_started_at' IS NULL THEN
            item := jsonb_set(item, '{planning_started_at}', to_jsonb(to_jsonb(now())));
          END IF;

        ELSIF p_action = 'complete_item' THEN
          -- Explicit completion action only
          item := jsonb_set(item, '{status}', '"completed"'::jsonb);
          IF item->>'completed_at' IS NULL THEN item := jsonb_set(item, '{completed_at}', to_jsonb(now())); END IF;

        ELSIF p_action = 'revert_status' THEN
          IF coalesce(p_payload->>'status','') NOT IN ('wished','planning') THEN RAISE EXCEPTION 'Choose dreaming or planning' USING ERRCODE='22023'; END IF;
          item:=jsonb_set(item,'{completed_at}','null'::jsonb);
          -- Revert to planning or wished
          item := jsonb_set(item, '{status}', to_jsonb(coalesce(nullif(p_payload->>'status', ''), 'wished')));
          IF p_payload->>'status' = 'wished' THEN
            item := jsonb_set(item, '{completed_at}', 'null'::jsonb);
            item := jsonb_set(item, '{planning_started_at}', 'null'::jsonb);
          END IF;

        ELSIF p_action = 'attach_memory' THEN
          IF item->>'status'<>'completed' THEN RAISE EXCEPTION 'Complete this idea before adding its memory' USING ERRCODE='22023'; END IF;
          IF length(coalesce(p_payload->>'memory_note',''))>500 THEN RAISE EXCEPTION 'Keep your memory within 500 characters' USING ERRCODE='22023'; END IF;
          IF coalesce(nullif(trim(p_payload->>'memory_note'),''),nullif(trim(p_payload->>'memory_photo_url'),''),nullif(item->>'memory_photo_url','')) IS NULL THEN RAISE EXCEPTION 'Add a memory note or photo' USING ERRCODE='22023'; END IF;
          IF nullif(p_payload->>'memory_photo_url','') IS NOT NULL THEN PERFORM private.qubit_attach_memory_photo(p_payload->>'memory_photo_url',nullif(p_payload->>'asset_id','')::uuid,t.id,p_actor_id,p_guest_owner); END IF;
          -- Attach photo/note to completed item
          IF p_payload->>'memory_photo_url' IS NOT NULL THEN
            item := jsonb_set(item, '{memory_photo_url}', to_jsonb(trim(p_payload->>'memory_photo_url')));
          END IF;
          IF p_payload->>'memory_note' IS NOT NULL THEN
            item := jsonb_set(item, '{memory_note}', to_jsonb(trim(p_payload->>'memory_note')));
          END IF;

          item:=item||jsonb_build_object('memory_saved_at',now(),'memory_by',caller_role);
        END IF;
      END IF;

      IF found AND item->>'id'=p_item_id AND item IS DISTINCT FROM original THEN
        event:=jsonb_build_object('action',p_action,'by',caller_role,'at',now(),'status',item->>'status','note',CASE WHEN p_action='attach_memory' THEN item->>'memory_note' ELSE NULL END,'photo_url',CASE WHEN p_action='attach_memory' THEN item->>'memory_photo_url' ELSE NULL END);
        item:=jsonb_set(item,'{history}',coalesce(item->'history','[]'::jsonb)||jsonb_build_array(event));
      END IF;
      updated_items := updated_items || jsonb_build_array(item);
    END LOOP;

    IF NOT found THEN
      RAISE EXCEPTION 'Item not found' USING ERRCODE='P0002';
    END IF;

  ELSE
    RAISE EXCEPTION 'Unknown action' USING ERRCODE='22023';
  END IF;

  UPDATE public.template_bucket_list SET
    items = updated_items,
    revision = b.revision + 1,
    updated_at = now()
  WHERE id = b.id;

  RETURN jsonb_build_object(
    'success', true,
    'action', p_action,
    'item_id', p_item_id,
    'items', updated_items,
    'revision', b.revision + 1
  );
END $$;
REVOKE ALL ON FUNCTION private.qubit_attach_memory_photo(text,uuid,uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.qubit_attach_memory_photo(text,uuid,uuid,uuid,text) TO service_role;
REVOKE ALL ON FUNCTION public.bonded_get_template_our_story(text,text,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bonded_get_template_our_story(text,text,text,uuid) TO service_role;
REVOKE ALL ON FUNCTION public.bonded_submit_our_story_partner_side(text,text,text,text,text,uuid,text,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bonded_submit_our_story_partner_side(text,text,text,text,text,uuid,text,uuid,text) TO service_role;
REVOKE ALL ON FUNCTION public.bonded_delete_our_story_partner_side(text,text,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bonded_delete_our_story_partner_side(text,text,text,uuid) TO service_role;
REVOKE ALL ON FUNCTION public.bonded_get_template_bucket_list(text,text,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bonded_get_template_bucket_list(text,text,text,uuid) TO service_role;
REVOKE ALL ON FUNCTION public.bonded_mutate_template_bucket_list(text,text,text,jsonb,text,text,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bonded_mutate_template_bucket_list(text,text,text,jsonb,text,text,uuid,text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
