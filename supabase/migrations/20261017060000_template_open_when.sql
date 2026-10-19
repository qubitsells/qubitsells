-- ============================================================
-- Migration: Template Open When Letters (T09 Tool)
-- Up to three personal envelopes opened by choice
-- ============================================================

-- 1. Create template_open_when_letters table
CREATE TABLE IF NOT EXISTS public.template_open_when_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.couple_templates(id) ON DELETE CASCADE,
  tool_id TEXT NOT NULL DEFAULT 'open_when_t09',
  title TEXT NOT NULL DEFAULT 'Open When Letters',
  description TEXT NOT NULL DEFAULT '',
  attach_reply BOOLEAN NOT NULL DEFAULT true,
  envelopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  opened_envelopes JSONB NOT NULL DEFAULT '{}'::jsonb,
  revision INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, tool_id)
);

CREATE INDEX IF NOT EXISTS idx_template_open_when_template_id
  ON public.template_open_when_letters(template_id);

-- 2. Restrict direct public access under RLS
ALTER TABLE public.template_open_when_letters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.template_open_when_letters FROM PUBLIC, anon, authenticated;

-- 3. RPC to read open when letters state
CREATE OR REPLACE FUNCTION public.bonded_get_template_open_when(
  p_link_code TEXT,
  p_manage_token_hash TEXT DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  t public.couple_templates;
  o public.template_open_when_letters;
  is_creator BOOLEAN := false;
BEGIN
  -- 1. Validate template
  SELECT * INTO t FROM public.couple_templates WHERE short_code = p_link_code;
  IF t.id IS NULL OR t.deleting OR t.expires_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Template unavailable');
  END IF;

  -- 2. Find record
  SELECT * INTO o FROM public.template_open_when_letters WHERE template_id = t.id AND tool_id = 'open_when_t09';
  IF o.id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'letters', NULL);
  END IF;

  -- 3. Check creator authorization
  is_creator := (p_actor_id IS NOT NULL AND t.owner_id = p_actor_id) OR
                (p_manage_token_hash IS NOT NULL AND t.deletion_hash = p_manage_token_hash);

  -- 4. Return letters state
  RETURN jsonb_build_object(
    'success', true,
    'is_creator', is_creator,
    'letters', jsonb_build_object(
      'id', o.id,
      'template_id', o.template_id,
      'tool_id', o.tool_id,
      'title', o.title,
      'description', o.description,
      'attach_reply', o.attach_reply,
      'envelopes', o.envelopes,
      'opened_envelopes', o.opened_envelopes,
      'revision', o.revision,
      'created_at', o.created_at,
      'updated_at', o.updated_at
    )
  );
END $$;

-- 4. RPC for recipient to open an envelope by choice
CREATE OR REPLACE FUNCTION public.bonded_open_template_envelope(
  p_link_code TEXT,
  p_envelope_id TEXT
)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  t public.couple_templates;
  o public.template_open_when_letters;
  current_opened JSONB;
  opened_at_val TEXT;
BEGIN
  -- 1. Validate template
  SELECT * INTO t FROM public.couple_templates WHERE short_code = p_link_code FOR UPDATE;
  IF t.id IS NULL OR t.deleting OR t.expires_at <= now() THEN
    RAISE EXCEPTION 'Template is unavailable or has expired' USING ERRCODE='42501';
  END IF;

  -- 2. Validate open when record
  SELECT * INTO o FROM public.template_open_when_letters WHERE template_id = t.id AND tool_id = 'open_when_t09' FOR UPDATE;
  IF o.id IS NULL THEN
    RAISE EXCEPTION 'No open when letters found for this template' USING ERRCODE='42501';
  END IF;

  current_opened := o.opened_envelopes;
  IF current_opened ? p_envelope_id THEN
    -- Already opened, return existing timestamp
    opened_at_val := current_opened->p_envelope_id->>'opened_at';
  ELSE
    opened_at_val := to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
    current_opened := current_opened || jsonb_build_object(
      p_envelope_id,
      jsonb_build_object('opened_at', opened_at_val)
    );

    UPDATE public.template_open_when_letters SET
      opened_envelopes = current_opened,
      updated_at = now()
    WHERE id = o.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'envelope_id', p_envelope_id,
    'opened_at', opened_at_val,
    'opened_envelopes', current_opened
  );
END $$;

-- 5. Trigger to automatically initialize template_open_when_letters row if template tools contain open_when
CREATE OR REPLACE FUNCTION public.bonded_sync_template_open_when()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  tool JSONB;
BEGIN
  IF NEW.tools IS NOT NULL AND jsonb_typeof(NEW.tools) = 'array' THEN
    FOR tool IN SELECT * FROM jsonb_array_elements(NEW.tools) LOOP
      IF tool->>'type' = 'open_when' OR tool->>'id' = 'open_when_t09' THEN
        INSERT INTO public.template_open_when_letters (
          template_id, tool_id, title, description, attach_reply, envelopes, revision
        )
        VALUES (
          NEW.id,
          'open_when_t09',
          coalesce(tool->>'title', 'Open When Letters'),
          coalesce(tool->>'description', 'These envelopes open whenever you choose — for comfort, love, and sweet memories.'),
          coalesce((tool->>'attachReply')::boolean, true),
          coalesce(tool->'envelopes', '[]'::jsonb),
          1
        )
        ON CONFLICT (template_id, tool_id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          attach_reply = EXCLUDED.attach_reply,
          envelopes = EXCLUDED.envelopes,
          updated_at = now();
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_template_open_when ON public.couple_templates;
CREATE TRIGGER trg_sync_template_open_when
  AFTER INSERT OR UPDATE OF tools ON public.couple_templates
  FOR EACH ROW EXECUTE FUNCTION public.bonded_sync_template_open_when();
