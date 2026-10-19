-- ============================================================
-- Migration: Template Our Story Memories (T10 Tool)
-- Three to five ordered photo cards with "Add your side"
-- ============================================================

-- 1. Create template_our_story table
CREATE TABLE IF NOT EXISTS public.template_our_story (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.couple_templates(id) ON DELETE CASCADE,
  tool_id TEXT NOT NULL DEFAULT 'our_story_t10',
  title TEXT NOT NULL DEFAULT 'Our Story Memories',
  description TEXT NOT NULL DEFAULT '',
  cards JSONB NOT NULL DEFAULT '[]'::jsonb,
  partner_contribution JSONB DEFAULT NULL,
  revision INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, tool_id)
);

CREATE INDEX IF NOT EXISTS idx_template_our_story_template_id
  ON public.template_our_story(template_id);

-- 2. Restrict direct public access under RLS
ALTER TABLE public.template_our_story ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.template_our_story FROM PUBLIC, anon, authenticated;

-- 3. RPC to read our story memories state
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

-- 4. RPC for partner to submit "Add your side"
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

  -- 2. Verify creator cannot submit partner side
  IF p_actor_id IS NOT NULL AND t.owner_id = p_actor_id THEN
    RAISE EXCEPTION 'Creators cannot submit partner side' USING ERRCODE='42501';
  END IF;

  -- 3. Verify story record exists
  SELECT * INTO s FROM public.template_our_story WHERE template_id = t.id AND tool_id = 'our_story_t10' FOR UPDATE;
  IF s.id IS NULL THEN
    RAISE EXCEPTION 'Our Story Memories not configured' USING ERRCODE='P0002';
  END IF;

  -- 4. Verify media ownership if asset_id provided
  IF p_asset_id IS NOT NULL THEN
    PERFORM 1 FROM private.media_assets WHERE id = p_asset_id FOR UPDATE;
    SELECT count(*) INTO matched FROM private.media_assets m
    WHERE m.id = p_asset_id AND m.state = 'pending' AND
      ((p_actor_id IS NOT NULL AND m.owner_id = p_actor_id) OR (m.owner_id IS NULL AND p_guest_owner IS NOT NULL AND m.guest_hash = p_guest_owner));
    IF matched <> 1 THEN
      RAISE EXCEPTION 'Invalid media ownership' USING ERRCODE='42501';
    END IF;

    -- Attach media to template for retention & lifecycle cleanup
    UPDATE private.media_assets
    SET template_id = t.id, state = 'attached'
    WHERE id = p_asset_id;
  END IF;

  -- 5. Construct separately authored partner contribution
  new_contrib := jsonb_build_object(
    'id', contribution_id,
    'author_name', coalesce(nullif(trim(p_author_name), ''), 'My Love'),
    'caption', trim(p_caption),
    'photo_url', trim(p_photo_url),
    'date', nullif(trim(p_date), ''),
    'created_at', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
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
      'created_at', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    )
  );
END $$;

-- 5. RPC to delete partner side contribution
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

-- 6. Trigger to automatically sync template_our_story row from couple_templates tools
CREATE OR REPLACE FUNCTION public.bonded_sync_template_our_story()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  tool JSONB;
BEGIN
  IF NEW.tools IS NOT NULL AND jsonb_typeof(NEW.tools) = 'array' THEN
    FOR tool IN SELECT * FROM jsonb_array_elements(NEW.tools) LOOP
      IF tool->>'type' = 'our_story' OR tool->>'id' = 'our_story_t10' THEN
        INSERT INTO public.template_our_story (
          template_id, tool_id, title, description, cards, revision
        )
        VALUES (
          NEW.id,
          'our_story_t10',
          coalesce(tool->>'title', 'Our Story Memories'),
          coalesce(tool->>'description', ''),
          coalesce(tool->'cards', '[]'::jsonb),
          1
        )
        ON CONFLICT (template_id, tool_id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          cards = EXCLUDED.cards,
          revision = public.template_our_story.revision + 1,
          updated_at = now();
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_template_our_story ON public.couple_templates;
CREATE TRIGGER trg_sync_template_our_story
  AFTER INSERT OR UPDATE ON public.couple_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.bonded_sync_template_our_story();
