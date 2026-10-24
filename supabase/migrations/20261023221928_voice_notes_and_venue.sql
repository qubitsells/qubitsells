-- Keep provider-verified recording metadata and enforce reply settings on saved assets.
BEGIN;
ALTER TABLE private.media_assets ADD COLUMN duration double precision CHECK (duration IS NULL OR duration BETWEEN 0 AND 86400);
CREATE OR REPLACE FUNCTION public.bonded_register_media(asset jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE result uuid;
BEGIN
  INSERT INTO private.media_assets(id,public_id,resource_type,format,owner_id,guest_hash,duration)
  VALUES((asset->>'id')::uuid,asset->>'public_id',asset->>'resource_type',asset->>'format',(asset->>'owner_id')::uuid,asset->>'guest_hash',nullif(asset->>'duration','')::double precision) RETURNING id INTO result;
  RETURN result;
END $$;

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
  tool jsonb;
  photo_count integer;
  voice_count integer;
BEGIN
  -- 1. Find and validate template
  SELECT * INTO t FROM public.couple_templates WHERE short_code = link_code FOR UPDATE;
  IF t.id IS NULL OR t.deleting OR t.expires_at <= now() THEN
    RAISE EXCEPTION 'Template is unavailable or has expired' USING ERRCODE='42501';
  END IF;

  SELECT item INTO tool FROM jsonb_array_elements(coalesce(t.tools,'[]'::jsonb)) item WHERE item->>'type'='reply' LIMIT 1;
  IF tool->>'enabled'='false' OR (tool IS NULL AND t.theme IN ('our-little-pink-day','halloween-pumpkin-moon','halloween-midnight-key','starlit-story','spooky-the-haunted-waltz','anime-storm-and-flame')) THEN
    RAISE EXCEPTION 'Replies are not enabled for this template' USING ERRCODE='22023';
  END IF;
  IF length(coalesce(message_content,'')) > least(5000,coalesce((tool->>'maxChars')::integer,2000)) OR length(coalesce(author_name,'')) > 100 OR length(coalesce(reaction_content,'')) > 20 THEN
    RAISE EXCEPTION 'Reply details exceed the allowed length' USING ERRCODE='22023';
  END IF;
  IF nullif(message_content,'') IS NOT NULL AND tool->'enabledFormats'->>'text'='false' THEN RAISE EXCEPTION 'Text replies are disabled' USING ERRCODE='22023'; END IF;
  IF coalesce(cardinality(asset_ids),0)>6 THEN RAISE EXCEPTION 'Too many attachments' USING ERRCODE='22023'; END IF;
  IF coalesce(message_content,'')='' AND coalesce(reaction_content,'')='' AND coalesce(cardinality(asset_ids),0)=0 THEN RAISE EXCEPTION 'Add a message, reaction, photo, or voice note' USING ERRCODE='22023'; END IF;

  -- 2. Check for idempotent retry
  IF client_id IS NOT NULL THEN
    SELECT * INTO existing FROM public.template_replies
    WHERE template_id = t.id AND public.template_replies.client_id = bonded_submit_template_reply.client_id;
    IF existing.id IS NOT NULL THEN
      IF existing.partner_token_hash IS DISTINCT FROM partner_token_hash THEN RAISE EXCEPTION 'Reply belongs to another receipt' USING ERRCODE='42501'; END IF;
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

  IF tool->>'allowMultiple'='false' AND EXISTS(SELECT 1 FROM public.template_replies r WHERE r.template_id=t.id AND r.partner_token_hash=bonded_submit_template_reply.partner_token_hash) THEN
    RAISE EXCEPTION 'A reply is already saved. Delete it before writing another.' USING ERRCODE='22023';
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
    SELECT count(*) FILTER (WHERE resource_type='image'),count(*) FILTER (WHERE resource_type='video') INTO photo_count,voice_count FROM private.media_assets WHERE id=ANY(asset_ids);
    IF photo_count > least(5,coalesce((tool->>'maxPhotos')::integer,3)) OR voice_count>1 THEN RAISE EXCEPTION 'Too many photos or voice notes' USING ERRCODE='22023'; END IF;
    IF photo_count>0 AND tool->'enabledFormats'->>'photo'='false' THEN RAISE EXCEPTION 'Photo replies are disabled' USING ERRCODE='22023'; END IF;
    IF voice_count>0 AND tool->'enabledFormats'->>'voice'='false' THEN RAISE EXCEPTION 'Voice replies are disabled' USING ERRCODE='22023'; END IF;
    IF EXISTS(SELECT 1 FROM private.media_assets WHERE id=ANY(asset_ids) AND resource_type='video' AND duration > least(180,coalesce((tool->>'maxVoiceSeconds')::integer,60))+1) THEN RAISE EXCEPTION 'Voice note exceeds the recording limit' USING ERRCODE='22023'; END IF;
    -- Build media references JSON
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'url', '/api/media/' || m.id::text,
      'public_id', m.id::text,
      'type', m.resource_type,
      'media_type', CASE WHEN m.resource_type='image' THEN 'photo' ELSE 'voice' END,
      'format', m.format, 'duration', m.duration
    ) ORDER BY array_position(asset_ids,m.id)), '[]'::jsonb) INTO reply_media
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


-- Existing receipts retain their files and gain readable media types/formats.
UPDATE public.template_replies r SET media_items=(SELECT coalesce(jsonb_agg(entry || CASE WHEN m.id IS NOT NULL THEN jsonb_build_object('media_type',CASE WHEN m.resource_type='image' THEN 'photo' ELSE 'voice' END,'format',m.format,'duration',m.duration) ELSE '{}'::jsonb END ORDER BY position),'[]'::jsonb) FROM jsonb_array_elements(r.media_items) WITH ORDINALITY AS items(entry,position) LEFT JOIN private.media_assets m ON m.id::text=entry->>'public_id') WHERE jsonb_array_length(r.media_items)>0;
REVOKE ALL ON FUNCTION public.bonded_register_media(jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.bonded_submit_template_reply(text,uuid,text,text,text,uuid[],text,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bonded_register_media(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.bonded_submit_template_reply(text,uuid,text,text,text,uuid[],text,uuid,text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
