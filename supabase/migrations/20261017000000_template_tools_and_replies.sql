-- ============================================================
-- Migration: Template Tools & Replies (T01 Reply Tool)
-- ============================================================

-- 1. Add tools column to couple_templates if missing
ALTER TABLE public.couple_templates
  ADD COLUMN IF NOT EXISTS tools JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2. Create template_replies table
CREATE TABLE IF NOT EXISTS public.template_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.couple_templates(id) ON DELETE CASCADE,
  tool_id TEXT NOT NULL DEFAULT 'reply_t01',
  client_id UUID,
  author_name TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  reaction TEXT,
  media_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  partner_token_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_template_replies_template_id
  ON public.template_replies(template_id);

CREATE INDEX IF NOT EXISTS idx_template_replies_partner_hash
  ON public.template_replies(partner_token_hash);

-- 3. Restrict public access to template_replies under RLS
ALTER TABLE public.template_replies ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.template_replies FROM PUBLIC, anon, authenticated;

-- 4. Update bonded_create_template to persist tools JSONB
CREATE OR REPLACE FUNCTION public.bonded_create_template(actor_id UUID, guest_owner TEXT, deletion_hash TEXT, template_data JSONB, asset_ids UUID[])
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE t public.couple_templates; matched INT;
BEGIN
  IF actor_id IS NULL AND guest_owner IS NULL THEN RAISE EXCEPTION 'Upload session required'; END IF;
  PERFORM 1 FROM private.media_assets WHERE id=ANY(asset_ids) FOR UPDATE;
  SELECT count(*) INTO matched FROM private.media_assets m WHERE m.id=ANY(asset_ids) AND m.state='pending' AND
    ((actor_id IS NOT NULL AND m.owner_id=actor_id) OR (m.owner_id IS NULL AND guest_owner IS NOT NULL AND m.guest_hash=guest_owner));
  IF matched<>cardinality(asset_ids) THEN RAISE EXCEPTION 'Invalid media ownership' USING ERRCODE='42501'; END IF;

  INSERT INTO public.couple_templates(
    short_code, theme, scene_index, partner_name, partner_from, message,
    has_media, media_items, expires_at, sender_gender, music_track,
    owner_id, guest_hash, deletion_hash, media_migrated, tools
  )
  VALUES(
    template_data->>'short_code',
    template_data->>'theme',
    (template_data->>'scene_index')::int,
    template_data->>'partner_name',
    template_data->>'partner_from',
    template_data->>'message',
    cardinality(asset_ids)>0,
    (SELECT coalesce(jsonb_agg(jsonb_build_object('url','/api/media/' || m.id::text,'public_id',m.id::text,'type',m.resource_type)),'[]') FROM private.media_assets m WHERE m.id=ANY(asset_ids)),
    (template_data->>'expires_at')::timestamptz,
    template_data->>'sender_gender',
    template_data->'music_track',
    actor_id,
    guest_owner,
    deletion_hash,
    true,
    coalesce(template_data->'tools', '[]'::jsonb)
  ) RETURNING * INTO t;

  UPDATE private.media_assets SET template_id=t.id, state='attached' WHERE id=ANY(asset_ids);
  RETURN jsonb_build_object('short_code', t.short_code, 'expires_at', t.expires_at);
END $$;

-- 5. Update bonded_template_operation to return tools
CREATE OR REPLACE FUNCTION public.bonded_template_operation(link_code TEXT, operation TEXT, provided_hash TEXT DEFAULT NULL, actor_id UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE t public.couple_templates;
BEGIN
  SELECT * INTO t FROM public.couple_templates WHERE short_code=link_code FOR UPDATE;
  IF t.id IS NULL THEN RETURN NULL; END IF;
  IF operation='delete' THEN
    IF t.deletion_hash IS NULL OR provided_hash IS DISTINCT FROM t.deletion_hash OR (t.owner_id IS NOT NULL AND t.owner_id IS DISTINCT FROM actor_id) THEN
      RAISE EXCEPTION 'Not allowed' USING ERRCODE='42501';
    END IF;
    UPDATE public.couple_templates SET deleting=true WHERE id=t.id;
    UPDATE private.media_assets SET state='deleting', lease_until=NULL WHERE template_id=t.id;
    RETURN jsonb_build_object('success',true);
  END IF;
  IF t.expires_at<=now() OR t.deleting THEN RETURN jsonb_build_object('expired',true); END IF;
  IF operation<>'read' THEN RAISE EXCEPTION 'Unknown operation'; END IF;
  UPDATE public.couple_templates SET view_count=view_count+1 WHERE id=t.id;
  RETURN jsonb_build_object(
    'id', t.id,
    'short_code', t.short_code,
    'theme', t.theme,
    'sender_gender', t.sender_gender,
    'music_track', t.music_track,
    'scene_index', t.scene_index,
    'partner_name', t.partner_name,
    'partner_from', t.partner_from,
    'message', t.message,
    'has_media', t.has_media,
    'media_items', t.media_items,
    'expires_at', t.expires_at,
    'view_count', t.view_count+1,
    'created_at', t.created_at,
    'tools', coalesce(t.tools, '[]'::jsonb)
  );
END $$;

-- 6. Helper RPC to submit a template reply (idempotent retry safe)
CREATE OR REPLACE FUNCTION public.bonded_submit_template_reply(
  link_code TEXT,
  client_id UUID,
  author_name TEXT,
  message_content TEXT,
  reaction_content TEXT,
  asset_ids UUID[],
  partner_token_hash TEXT,
  actor_id UUID DEFAULT NULL,
  guest_owner TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  t public.couple_templates;
  existing public.template_replies;
  new_reply public.template_replies;
  matched INT;
  reply_media JSONB;
BEGIN
  -- 1. Find and validate template
  SELECT * INTO t FROM public.couple_templates WHERE short_code = link_code FOR UPDATE;
  IF t.id IS NULL OR t.deleting OR t.expires_at <= now() THEN
    RAISE EXCEPTION 'Template is unavailable or has expired' USING ERRCODE='42501';
  END IF;

  -- 2. Check for idempotent retry
  IF client_id IS NOT NULL THEN
    SELECT * INTO existing FROM public.template_replies
    WHERE template_id = t.id AND public.template_replies.client_id = bonded_submit_template_reply.client_id;
    IF existing.id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'idempotent', true,
        'reply', jsonb_build_object(
          'id', existing.id,
          'tool_id', existing.tool_id,
          'author_name', existing.author_name,
          'message', existing.message,
          'reaction', existing.reaction,
          'media_items', existing.media_items,
          'created_at', existing.created_at
        )
      );
    END IF;
  END IF;

  -- 3. Verify media assets ownership if any provided
  IF cardinality(asset_ids) > 0 THEN
    PERFORM 1 FROM private.media_assets WHERE id = ANY(asset_ids) FOR UPDATE;
    SELECT count(*) INTO matched FROM private.media_assets m
    WHERE m.id = ANY(asset_ids) AND m.state = 'pending' AND
      ((actor_id IS NOT NULL AND m.owner_id = actor_id) OR (m.owner_id IS NULL AND guest_owner IS NOT NULL AND m.guest_hash = guest_owner));
    IF matched <> cardinality(asset_ids) THEN
      RAISE EXCEPTION 'Invalid media ownership' USING ERRCODE='42501';
    END IF;
    -- Build media references JSON
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'url', '/api/media/' || m.id::text,
      'public_id', m.id::text,
      'type', m.resource_type
    )), '[]'::jsonb) INTO reply_media
    FROM private.media_assets m WHERE m.id = ANY(asset_ids);
  ELSE
    reply_media := '[]'::jsonb;
  END IF;

  -- 4. Insert reply
  INSERT INTO public.template_replies (
    template_id, tool_id, client_id, author_name, message, reaction,
    media_items, partner_token_hash
  )
  VALUES (
    t.id, 'reply_t01', client_id, author_name, message_content, reaction_content,
    reply_media, partner_token_hash
  ) RETURNING * INTO new_reply;

  -- 5. Attach media to template for lifecycle & access control
  IF cardinality(asset_ids) > 0 THEN
    UPDATE private.media_assets
    SET template_id = t.id, state = 'attached'
    WHERE id = ANY(asset_ids);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'idempotent', false,
    'reply', jsonb_build_object(
      'id', new_reply.id,
      'tool_id', new_reply.tool_id,
      'author_name', new_reply.author_name,
      'message', new_reply.message,
      'reaction', new_reply.reaction,
      'media_items', new_reply.media_items,
      'created_at', new_reply.created_at
    )
  );
END $$;

-- 7. Helper RPC to get template replies (strictly authorized)
CREATE OR REPLACE FUNCTION public.bonded_get_template_replies(
  link_code TEXT,
  partner_receipt_hash TEXT DEFAULT NULL,
  manage_token_hash TEXT DEFAULT NULL,
  actor_id UUID DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  t public.couple_templates;
  is_creator BOOLEAN := false;
  results JSONB;
BEGIN
  SELECT * INTO t FROM public.couple_templates WHERE short_code = link_code;
  IF t.id IS NULL OR t.deleting OR t.expires_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Template unavailable', 'replies', '[]'::jsonb, 'is_creator', false);
  END IF;

  -- Creator check: authenticated owner or matching manage_token_hash
  is_creator := (actor_id IS NOT NULL AND t.owner_id = actor_id) OR
                (manage_token_hash IS NOT NULL AND t.deletion_hash = manage_token_hash);

  IF is_creator THEN
    -- Creator sees all replies
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id,
      'tool_id', r.tool_id,
      'author_name', r.author_name,
      'message', r.message,
      'reaction', r.reaction,
      'media_items', r.media_items,
      'created_at', r.created_at
    ) ORDER BY r.created_at DESC), '[]'::jsonb) INTO results
    FROM public.template_replies r
    WHERE r.template_id = t.id;

    RETURN jsonb_build_object('success', true, 'is_creator', true, 'replies', results);
  ELSIF partner_receipt_hash IS NOT NULL THEN
    -- Partner only sees their own submitted receipt
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id,
      'tool_id', r.tool_id,
      'author_name', r.author_name,
      'message', r.message,
      'reaction', r.reaction,
      'media_items', r.media_items,
      'created_at', r.created_at
    )), '[]'::jsonb) INTO results
    FROM public.template_replies r
    WHERE r.template_id = t.id AND r.partner_token_hash = partner_receipt_hash;

    RETURN jsonb_build_object('success', true, 'is_creator', false, 'replies', results);
  ELSE
    -- Unrelated viewer sees NO replies
    RETURN jsonb_build_object('success', true, 'is_creator', false, 'replies', '[]'::jsonb);
  END IF;
END $$;

-- 8. Helper RPC to delete a reply
CREATE OR REPLACE FUNCTION public.bonded_delete_template_reply(
  reply_id UUID,
  link_code TEXT,
  partner_receipt_hash TEXT DEFAULT NULL,
  manage_token_hash TEXT DEFAULT NULL,
  actor_id UUID DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  t public.couple_templates;
  r public.template_replies;
  is_creator BOOLEAN := false;
  is_partner BOOLEAN := false;
  media_ids UUID[];
BEGIN
  SELECT * INTO t FROM public.couple_templates WHERE short_code = link_code;
  IF t.id IS NULL THEN RAISE EXCEPTION 'Template not found' USING ERRCODE='42501'; END IF;

  SELECT * INTO r FROM public.template_replies WHERE id = reply_id AND template_id = t.id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Reply not found' USING ERRCODE='42501'; END IF;

  is_creator := (actor_id IS NOT NULL AND t.owner_id = actor_id) OR
                (manage_token_hash IS NOT NULL AND t.deletion_hash = manage_token_hash);
  is_partner := partner_receipt_hash IS NOT NULL AND r.partner_token_hash = partner_receipt_hash;

  IF NOT (is_creator OR is_partner) THEN
    RAISE EXCEPTION 'Not allowed to delete this reply' USING ERRCODE='42501';
  END IF;

  -- Extract public_ids from media_items to queue for cleanup
  SELECT array_agg((item->>'public_id')::uuid) INTO media_ids
  FROM jsonb_array_elements(r.media_items) item
  WHERE item->>'public_id' ~* '^[0-9a-f-]{36}$';

  IF cardinality(media_ids) > 0 THEN
    UPDATE private.media_assets
    SET state = 'deleting', lease_until = NULL
    WHERE id = ANY(media_ids) AND template_id = t.id;
  END IF;

  DELETE FROM public.template_replies WHERE id = r.id;
  RETURN jsonb_build_object('success', true);
END $$;
