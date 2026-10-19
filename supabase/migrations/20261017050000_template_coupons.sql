-- ============================================================
-- Migration: Template Love Coupon (T08 Tool)
-- Single-use love coupon with request/accept/fulfill lifecycle
-- ============================================================

-- 1. Create template_coupons table
CREATE TABLE IF NOT EXISTS public.template_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.couple_templates(id) ON DELETE CASCADE,
  tool_id TEXT NOT NULL DEFAULT 'coupon_t08',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  expires_at TIMESTAMPTZ,
  enable_scheduling BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'requested', 'accepted', 'fulfilled', 'cancelled', 'expired')),
  revision INT NOT NULL DEFAULT 1,
  requested_at TIMESTAMPTZ,
  request_note TEXT,
  preferred_date TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, tool_id)
);

CREATE INDEX IF NOT EXISTS idx_template_coupons_template_id
  ON public.template_coupons(template_id);

-- 2. Restrict direct public access under RLS
ALTER TABLE public.template_coupons ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.template_coupons FROM PUBLIC, anon, authenticated;

-- 3. RPC to read coupon state with automatic expiry evaluation and creator flag
CREATE OR REPLACE FUNCTION public.bonded_get_template_coupon(
  p_link_code TEXT,
  p_manage_token_hash TEXT DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  t public.couple_templates;
  c public.template_coupons;
  is_creator BOOLEAN := false;
  effective_status TEXT;
BEGIN
  -- 1. Validate template
  SELECT * INTO t FROM public.couple_templates WHERE short_code = p_link_code;
  IF t.id IS NULL OR t.deleting OR t.expires_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Template unavailable');
  END IF;

  -- 2. Find coupon record
  SELECT * INTO c FROM public.template_coupons WHERE template_id = t.id AND tool_id = 'coupon_t08';
  IF c.id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'coupon', NULL);
  END IF;

  -- 3. Check creator authorization
  is_creator := (p_actor_id IS NOT NULL AND t.owner_id = p_actor_id) OR
                (p_manage_token_hash IS NOT NULL AND t.deletion_hash = p_manage_token_hash);

  -- 4. Check dynamic expiration
  effective_status := c.status;
  IF c.status IN ('available', 'requested') AND c.expires_at IS NOT NULL AND c.expires_at <= now() THEN
    effective_status := 'expired';
    UPDATE public.template_coupons
      SET status = 'expired', updated_at = now()
      WHERE id = c.id;
  END IF;

  -- 5. Return coupon object
  RETURN jsonb_build_object(
    'success', true,
    'is_creator', is_creator,
    'coupon', jsonb_build_object(
      'id', c.id,
      'template_id', c.template_id,
      'tool_id', c.tool_id,
      'title', c.title,
      'description', c.description,
      'expires_at', c.expires_at,
      'enable_scheduling', c.enable_scheduling,
      'status', effective_status,
      'revision', c.revision,
      'requested_at', c.requested_at,
      'request_note', c.request_note,
      'preferred_date', c.preferred_date,
      'accepted_at', c.accepted_at,
      'fulfilled_at', c.fulfilled_at,
      'cancelled_at', c.cancelled_at,
      'cancel_reason', c.cancel_reason,
      'created_at', c.created_at,
      'updated_at', c.updated_at
    )
  );
END $$;

-- 4. RPC for recipient to request coupon redemption
CREATE OR REPLACE FUNCTION public.bonded_request_template_coupon(
  p_link_code TEXT,
  p_request_note TEXT DEFAULT NULL,
  p_preferred_date TIMESTAMPTZ DEFAULT NULL,
  p_expected_revision INT DEFAULT 1
)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  t public.couple_templates;
  c public.template_coupons;
BEGIN
  -- 1. Validate template
  SELECT * INTO t FROM public.couple_templates WHERE short_code = p_link_code FOR UPDATE;
  IF t.id IS NULL OR t.deleting OR t.expires_at <= now() THEN
    RAISE EXCEPTION 'Template is unavailable or has expired' USING ERRCODE='42501';
  END IF;

  -- 2. Validate coupon
  SELECT * INTO c FROM public.template_coupons WHERE template_id = t.id AND tool_id = 'coupon_t08' FOR UPDATE;
  IF c.id IS NULL THEN
    RAISE EXCEPTION 'No coupon found for this template' USING ERRCODE='42501';
  END IF;

  -- 3. Stale revision check
  IF p_expected_revision <> c.revision THEN
    RAISE EXCEPTION 'Stale coupon state. Please refresh.' USING ERRCODE='40001';
  END IF;

  -- 4. Check expiration
  IF c.expires_at IS NOT NULL AND c.expires_at <= now() THEN
    UPDATE public.template_coupons SET status = 'expired', updated_at = now() WHERE id = c.id;
    RAISE EXCEPTION 'This coupon has expired' USING ERRCODE='42501';
  END IF;

  -- 5. Prevent duplicate request or invalid transitions
  IF c.status = 'requested' THEN
    RAISE EXCEPTION 'This coupon has already been requested' USING ERRCODE='42501';
  ELSIF c.status = 'accepted' THEN
    RAISE EXCEPTION 'This coupon has already been accepted' USING ERRCODE='42501';
  ELSIF c.status = 'fulfilled' THEN
    RAISE EXCEPTION 'This coupon has already been redeemed' USING ERRCODE='42501';
  ELSIF c.status = 'cancelled' THEN
    RAISE EXCEPTION 'This coupon has been cancelled' USING ERRCODE='42501';
  ELSIF c.status = 'expired' THEN
    RAISE EXCEPTION 'This coupon has expired' USING ERRCODE='42501';
  ELSIF c.status <> 'available' THEN
    RAISE EXCEPTION 'Coupon is not available for redemption' USING ERRCODE='42501';
  END IF;

  -- 6. Transition to requested (NOT fulfilled - issuer must accept first!)
  UPDATE public.template_coupons SET
    status = 'requested',
    requested_at = now(),
    request_note = p_request_note,
    preferred_date = p_preferred_date,
    revision = c.revision + 1,
    updated_at = now()
  WHERE id = c.id;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'requested',
    'revision', c.revision + 1
  );
END $$;

-- 5. RPC for issuer/creator to manage coupon (accept, fulfill, cancel, decline_request)
CREATE OR REPLACE FUNCTION public.bonded_manage_template_coupon(
  p_link_code TEXT,
  p_action_type TEXT, -- 'accept' | 'fulfill' | 'cancel' | 'decline_request'
  p_manage_token_hash TEXT DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL,
  p_expected_revision INT DEFAULT 1,
  p_cancel_reason TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  t public.couple_templates;
  c public.template_coupons;
  is_creator BOOLEAN := false;
BEGIN
  -- 1. Validate template
  SELECT * INTO t FROM public.couple_templates WHERE short_code = p_link_code FOR UPDATE;
  IF t.id IS NULL OR t.deleting THEN
    RAISE EXCEPTION 'Template unavailable' USING ERRCODE='42501';
  END IF;

  -- 2. Verify creator authorization
  is_creator := (p_actor_id IS NOT NULL AND t.owner_id = p_actor_id) OR
                (p_manage_token_hash IS NOT NULL AND t.deletion_hash = p_manage_token_hash);
  IF NOT is_creator THEN
    RAISE EXCEPTION 'Not authorized to manage this coupon' USING ERRCODE='42501';
  END IF;

  -- 3. Validate coupon
  SELECT * INTO c FROM public.template_coupons WHERE template_id = t.id AND tool_id = 'coupon_t08' FOR UPDATE;
  IF c.id IS NULL THEN
    RAISE EXCEPTION 'Coupon not found' USING ERRCODE='42501';
  END IF;

  -- 4. Check revision concurrency
  IF p_expected_revision <> c.revision THEN
    RAISE EXCEPTION 'Stale coupon state. Please refresh.' USING ERRCODE='40001';
  END IF;

  -- 5. Execute action
  IF p_action_type = 'accept' THEN
    IF c.status <> 'requested' THEN
      RAISE EXCEPTION 'Only requested coupons can be accepted' USING ERRCODE='42501';
    END IF;

    UPDATE public.template_coupons SET
      status = 'accepted',
      accepted_at = now(),
      revision = c.revision + 1,
      updated_at = now()
    WHERE id = c.id;

  ELSIF p_action_type = 'fulfill' THEN
    IF c.status = 'fulfilled' THEN
      RAISE EXCEPTION 'Coupon has already been fulfilled' USING ERRCODE='42501';
    END IF;
    IF c.status <> 'accepted' THEN
      RAISE EXCEPTION 'Coupon must be accepted before marking fulfilled' USING ERRCODE='42501';
    END IF;

    UPDATE public.template_coupons SET
      status = 'fulfilled',
      fulfilled_at = now(),
      revision = c.revision + 1,
      updated_at = now()
    WHERE id = c.id;

  ELSIF p_action_type = 'decline_request' THEN
    IF c.status <> 'requested' THEN
      RAISE EXCEPTION 'Only requested coupons can have their request declined' USING ERRCODE='42501';
    END IF;

    -- Reset back to available so partner can request at a better time
    UPDATE public.template_coupons SET
      status = 'available',
      requested_at = NULL,
      request_note = NULL,
      preferred_date = NULL,
      cancel_reason = p_cancel_reason,
      revision = c.revision + 1,
      updated_at = now()
    WHERE id = c.id;

  ELSIF p_action_type = 'cancel' THEN
    IF c.status = 'fulfilled' THEN
      RAISE EXCEPTION 'Cannot cancel a fulfilled coupon' USING ERRCODE='42501';
    END IF;

    UPDATE public.template_coupons SET
      status = 'cancelled',
      cancelled_at = now(),
      cancel_reason = p_cancel_reason,
      revision = c.revision + 1,
      updated_at = now()
    WHERE id = c.id;

  ELSE
    RAISE EXCEPTION 'Unknown coupon management action' USING ERRCODE='42501';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'status', (SELECT status FROM public.template_coupons WHERE id = c.id),
    'revision', c.revision + 1
  );
END $$;

-- 6. Trigger to automatically initialize template_coupons row if template tools contain coupon
CREATE OR REPLACE FUNCTION public.bonded_sync_template_coupon()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  tool JSONB;
BEGIN
  IF NEW.tools IS NOT NULL AND jsonb_typeof(NEW.tools) = 'array' THEN
    FOR tool IN SELECT * FROM jsonb_array_elements(NEW.tools) LOOP
      IF tool->>'type' = 'coupon' OR tool->>'id' = 'coupon_t08' THEN
        INSERT INTO public.template_coupons (
          template_id, tool_id, title, description, expires_at,
          enable_scheduling, status, revision
        )
        VALUES (
          NEW.id,
          'coupon_t08',
          coalesce(tool->>'title', 'Love Coupon'),
          coalesce(tool->>'description', ''),
          (tool->>'expiresAt')::timestamptz,
          coalesce((tool->>'enableScheduling')::boolean, false),
          'available',
          1
        )
        ON CONFLICT (template_id, tool_id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          expires_at = EXCLUDED.expires_at,
          enable_scheduling = EXCLUDED.enable_scheduling,
          updated_at = now()
        WHERE public.template_coupons.status = 'available';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_template_coupon ON public.couple_templates;
CREATE TRIGGER trg_sync_template_coupon
  AFTER INSERT OR UPDATE OF tools ON public.couple_templates
  FOR EACH ROW EXECUTE FUNCTION public.bonded_sync_template_coupon();
