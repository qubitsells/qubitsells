-- ============================================================
-- Migration: Template Mini Couple Bucket List (T11 Tool)
-- Up to five initial ideas, partner adding, mark interest,
-- Let's plan this (draft only), and explicit completion
-- ============================================================

-- 1. Create template_bucket_list table
CREATE TABLE IF NOT EXISTS public.template_bucket_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.couple_templates(id) ON DELETE CASCADE,
  tool_id TEXT NOT NULL DEFAULT 'bucket_list_t11',
  title TEXT NOT NULL DEFAULT 'Mini Couple Bucket List',
  description TEXT NOT NULL DEFAULT '',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  revision INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, tool_id)
);

CREATE INDEX IF NOT EXISTS idx_template_bucket_list_template_id
  ON public.template_bucket_list(template_id);

-- 2. Restrict direct public access under RLS
ALTER TABLE public.template_bucket_list ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.template_bucket_list FROM PUBLIC, anon, authenticated;

-- 3. RPC to read bucket list state
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

-- 4. RPC to mutate bucket list (add idea, toggle interest, plan draft, complete)
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
BEGIN
  -- 1. Validate template
  SELECT * INTO t FROM public.couple_templates WHERE short_code = p_link_code FOR UPDATE;
  IF t.id IS NULL OR t.deleting OR t.expires_at <= now() THEN
    RAISE EXCEPTION 'Template is unavailable or has expired' USING ERRCODE='42501';
  END IF;

  -- 2. Validate bucket list row
  SELECT * INTO b FROM public.template_bucket_list WHERE template_id = t.id AND tool_id = 'bucket_list_t11' FOR UPDATE;
  IF b.id IS NULL THEN
    RAISE EXCEPTION 'Bucket list not configured' USING ERRCODE='P0002';
  END IF;

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

    new_note := nullif(trim(p_payload->>'note'), '');

    new_item := jsonb_build_object(
      'id', coalesce(nullif(p_item_id, ''), 'item_' || gen_random_uuid()::text),
      'title', new_title,
      'note', new_note,
      'status', 'wished',
      'created_by', caller_role,
      'created_at', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
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

        IF p_action = 'toggle_interest' THEN
          IF caller_role = 'creator' THEN
            item := jsonb_set(item, '{creator_interested}', to_jsonb(NOT coalesce((item->>'creator_interested')::boolean, false)));
          ELSE
            item := jsonb_set(item, '{partner_interested}', to_jsonb(NOT coalesce((item->>'partner_interested')::boolean, false)));
          END IF;

        ELSIF p_action = 'plan_item' THEN
          -- Move to planning without automatically confirming an event
          item := jsonb_set(item, '{status}', '"planning"'::jsonb);
          IF item->>'planning_started_at' IS NULL THEN
            item := jsonb_set(item, '{planning_started_at}', to_jsonb(to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')));
          END IF;

        ELSIF p_action = 'complete_item' THEN
          -- Explicit completion action only
          item := jsonb_set(item, '{status}', '"completed"'::jsonb);
          item := jsonb_set(item, '{completed_at}', to_jsonb(to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')));

        ELSIF p_action = 'revert_status' THEN
          -- Revert to planning or wished
          item := jsonb_set(item, '{status}', to_jsonb(coalesce(nullif(p_payload->>'status', ''), 'wished')));
          IF p_payload->>'status' = 'wished' THEN
            item := jsonb_set(item, '{completed_at}', 'null'::jsonb);
            item := jsonb_set(item, '{planning_started_at}', 'null'::jsonb);
          END IF;

        ELSIF p_action = 'attach_memory' THEN
          -- Attach photo/note to completed item
          IF p_payload->>'memory_photo_url' IS NOT NULL THEN
            item := jsonb_set(item, '{memory_photo_url}', to_jsonb(trim(p_payload->>'memory_photo_url')));
          END IF;
          IF p_payload->>'memory_note' IS NOT NULL THEN
            item := jsonb_set(item, '{memory_note}', to_jsonb(trim(p_payload->>'memory_note')));
          END IF;

          -- Verify media asset if provided
          IF p_payload->>'asset_id' IS NOT NULL THEN
            asset_id_val := (p_payload->>'asset_id')::uuid;
            PERFORM 1 FROM private.media_assets WHERE id = asset_id_val FOR UPDATE;
            SELECT count(*) INTO matched FROM private.media_assets m
            WHERE m.id = asset_id_val AND m.state = 'pending' AND
              ((p_actor_id IS NOT NULL AND m.owner_id = p_actor_id) OR (m.owner_id IS NULL AND p_guest_owner IS NOT NULL AND m.guest_hash = p_guest_owner));
            IF matched = 1 THEN
              UPDATE private.media_assets
              SET template_id = t.id, state = 'attached'
              WHERE id = asset_id_val;
            END IF;
          END IF;
        END IF;
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

-- 5. Trigger to automatically sync template_bucket_list row from couple_templates tools
CREATE OR REPLACE FUNCTION public.bonded_sync_template_bucket_list()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  tool JSONB;
BEGIN
  IF NEW.tools IS NOT NULL AND jsonb_typeof(NEW.tools) = 'array' THEN
    FOR tool IN SELECT * FROM jsonb_array_elements(NEW.tools) LOOP
      IF tool->>'type' = 'bucket_list' OR tool->>'id' = 'bucket_list_t11' THEN
        INSERT INTO public.template_bucket_list (
          template_id, tool_id, title, description, items, revision
        )
        VALUES (
          NEW.id,
          'bucket_list_t11',
          coalesce(tool->>'title', 'Mini Couple Bucket List'),
          coalesce(tool->>'description', ''),
          coalesce(tool->'items', '[]'::jsonb),
          1
        )
        ON CONFLICT (template_id, tool_id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          items = CASE
            WHEN jsonb_array_length(public.template_bucket_list.items) > 0 THEN public.template_bucket_list.items
            ELSE EXCLUDED.items
          END,
          revision = public.template_bucket_list.revision + 1,
          updated_at = now();
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_template_bucket_list ON public.couple_templates;
CREATE TRIGGER trg_sync_template_bucket_list
  AFTER INSERT OR UPDATE ON public.couple_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.bonded_sync_template_bucket_list();
