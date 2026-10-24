-- Persist scratch reveals, preserve coupon request history, and validate letter opens.
BEGIN;
CREATE TABLE public.template_scratch_reveals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),template_id uuid NOT NULL UNIQUE REFERENCES public.couple_templates(id) ON DELETE CASCADE,
 opened_at timestamptz NOT NULL DEFAULT now(),method text NOT NULL CHECK(method IN ('scratch','button','keyboard')),config_snapshot jsonb NOT NULL
);
ALTER TABLE public.template_scratch_reveals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.template_scratch_reveals FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.template_scratch_reveals TO service_role;
ALTER TABLE public.template_coupons ADD COLUMN history jsonb NOT NULL DEFAULT '[]'::jsonb;
CREATE OR REPLACE FUNCTION private.qubit_coupon_history() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE action text; snapshot jsonb;
BEGIN
 IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
 action:=CASE WHEN NEW.status='available' AND OLD.status='requested' THEN 'request_declined' ELSE NEW.status END;
 snapshot:=jsonb_build_object('action',action,'status',NEW.status,'at',now(),'request_note',coalesce(NEW.request_note,OLD.request_note),'preferred_date',coalesce(NEW.preferred_date,OLD.preferred_date),'cancel_reason',NEW.cancel_reason);
 NEW.history:=coalesce(OLD.history,'[]'::jsonb)||jsonb_build_array(snapshot);
 RETURN NEW;
END $$;
CREATE TRIGGER qubit_coupon_history BEFORE UPDATE OF status ON public.template_coupons FOR EACH ROW EXECUTE FUNCTION private.qubit_coupon_history();

CREATE OR REPLACE FUNCTION public.bonded_get_template_scratch(p_link_code text,p_manage_token_hash text DEFAULT NULL,p_actor_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE t public.couple_templates; tool jsonb; record public.template_scratch_reveals; creator boolean;
BEGIN
 SELECT * INTO t FROM public.couple_templates WHERE short_code=p_link_code;
 IF t.id IS NULL OR t.deleting OR t.expires_at<=now() THEN RETURN jsonb_build_object('success',false,'error','Template unavailable'); END IF;
 SELECT entry INTO tool FROM jsonb_array_elements(coalesce(t.tools,'[]'::jsonb)) entry WHERE entry->>'type'='scratch_reveal' AND entry->>'enabled' IS DISTINCT FROM 'false' LIMIT 1;
 IF tool IS NULL THEN RETURN jsonb_build_object('success',true,'scratch',NULL); END IF;
 creator:=coalesce((p_actor_id IS NOT NULL AND t.owner_id=p_actor_id) OR (p_manage_token_hash IS NOT NULL AND t.deletion_hash=p_manage_token_hash),false);
 SELECT * INTO record FROM public.template_scratch_reveals WHERE template_id=t.id;
 IF record.id IS NOT NULL THEN tool:=record.config_snapshot; END IF;
 RETURN jsonb_build_object('success',true,'is_creator',creator,'scratch',jsonb_build_object('config',CASE WHEN creator OR record.id IS NOT NULL THEN tool ELSE tool-'hiddenMessage'-'hiddenPhotoUrl' END,'opened_at',record.opened_at,'method',record.method,'target_available',EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(t.tools,'[]'::jsonb)) item WHERE item->>'id'=coalesce(tool->>'invitationRefId','invitation_t02') AND item->>'enabled' IS DISTINCT FROM 'false')));
END $$;
CREATE OR REPLACE FUNCTION public.bonded_open_template_scratch(p_link_code text,p_method text,p_manage_token_hash text DEFAULT NULL,p_actor_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE t public.couple_templates; creator boolean;
BEGIN
 SELECT * INTO t FROM public.couple_templates WHERE short_code=p_link_code FOR UPDATE;
 IF t.id IS NULL OR t.deleting OR t.expires_at<=now() THEN RAISE EXCEPTION 'Template unavailable' USING ERRCODE='42501'; END IF;
 PERFORM private.qubit_require_activity(t.tools,'scratch_reveal');
 IF p_method NOT IN ('scratch','button','keyboard') OR p_method IS NULL THEN RAISE EXCEPTION 'Choose a valid reveal method' USING ERRCODE='22023'; END IF;
 creator:=coalesce((p_actor_id IS NOT NULL AND t.owner_id=p_actor_id) OR (p_manage_token_hash IS NOT NULL AND t.deletion_hash=p_manage_token_hash),false);
 IF NOT creator THEN INSERT INTO public.template_scratch_reveals(template_id,method,config_snapshot) SELECT t.id,p_method,item FROM jsonb_array_elements(t.tools) item WHERE item->>'type'='scratch_reveal' AND item->>'enabled' IS DISTINCT FROM 'false' LIMIT 1 ON CONFLICT(template_id) DO NOTHING; END IF;
 RETURN public.bonded_get_template_scratch(p_link_code,p_manage_token_hash,p_actor_id);
END $$;
CREATE OR REPLACE FUNCTION private.qubit_scratch_notification() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE t public.couple_templates;
BEGIN
 SELECT * INTO t FROM public.couple_templates WHERE id=NEW.template_id;
 IF t.owner_id IS NOT NULL AND NOT t.deleting AND t.expires_at>now() THEN
  INSERT INTO public.store_notifications(user_id,kind,title,message,href,dedupe_key) VALUES(t.owner_id,'template_response','A scratch surprise was revealed','Open My Creations to see your gift activity.','/creator-center#creation-'||t.id::text,'scratch:'||NEW.id::text) ON CONFLICT(user_id,dedupe_key) DO NOTHING;
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER qubit_scratch_notification AFTER INSERT ON public.template_scratch_reveals FOR EACH ROW EXECUTE FUNCTION private.qubit_scratch_notification();

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
  is_creator := coalesce(((p_actor_id IS NOT NULL AND t.owner_id = p_actor_id) OR
                (p_manage_token_hash IS NOT NULL AND t.deletion_hash = p_manage_token_hash)),false);

  -- 4. Check dynamic expiration
  effective_status := c.status;
  IF c.status IN ('available', 'requested') AND c.expires_at IS NOT NULL AND c.expires_at <= now() THEN
    effective_status := 'expired';
    -- Effective expiry is read-only; avoid racing a completed redemption.
  END IF;

  -- 5. Return coupon object
  RETURN jsonb_build_object(
    'success', true,
    'is_creator', is_creator,
    'coupon', jsonb_build_object(
      'id', c.id,
      'template_id', c.template_id,
      'tool_id', c.tool_id,
      'history', c.history,
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
  PERFORM private.qubit_require_activity(t.tools,'coupon');
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

  IF length(coalesce(p_request_note,''))>500 THEN RAISE EXCEPTION 'Request note is too long' USING ERRCODE='22023'; END IF;
  IF p_preferred_date IS NOT NULL AND NOT c.enable_scheduling THEN RAISE EXCEPTION 'This coupon does not accept a preferred date' USING ERRCODE='22023'; END IF;
  -- 6. Transition to requested (NOT fulfilled - issuer must accept first!)
  UPDATE public.template_coupons SET
    status = 'requested',
    requested_at = now(),
    request_note = p_request_note,
    cancel_reason = NULL,
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
  IF t.id IS NULL OR t.deleting OR t.expires_at<=now() THEN
    RAISE EXCEPTION 'Template unavailable' USING ERRCODE='42501';
  END IF;

  -- 2. Verify creator authorization
  is_creator := coalesce(((p_actor_id IS NOT NULL AND t.owner_id = p_actor_id) OR
                (p_manage_token_hash IS NOT NULL AND t.deletion_hash = p_manage_token_hash)),false);
  IF NOT is_creator THEN
    RAISE EXCEPTION 'Not authorized to manage this coupon' USING ERRCODE='42501';
  END IF;

  -- 3. Validate coupon
  PERFORM private.qubit_require_activity(t.tools,'coupon');
  SELECT * INTO c FROM public.template_coupons WHERE template_id = t.id AND tool_id = 'coupon_t08' FOR UPDATE;
  IF c.id IS NULL THEN
    RAISE EXCEPTION 'Coupon not found' USING ERRCODE='42501';
  END IF;

  -- 4. Check revision concurrency
  IF p_expected_revision <> c.revision THEN
    RAISE EXCEPTION 'Stale coupon state. Please refresh.' USING ERRCODE='40001';
  END IF;

  IF length(coalesce(p_cancel_reason,''))>200 THEN RAISE EXCEPTION 'Your note is too long' USING ERRCODE='22023'; END IF;
  IF p_action_type='accept' AND c.expires_at IS NOT NULL AND c.expires_at<=now() THEN RAISE EXCEPTION 'This coupon has expired' USING ERRCODE='42501'; END IF;
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
  is_creator := coalesce(((p_actor_id IS NOT NULL AND t.owner_id = p_actor_id) OR
                (p_manage_token_hash IS NOT NULL AND t.deletion_hash = p_manage_token_hash)),false);

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
      'attach_reply', o.attach_reply AND EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(t.tools,'[]'::jsonb)) item WHERE item->>'type'='reply' AND item->>'enabled' IS DISTINCT FROM 'false'),
      'envelopes', (SELECT coalesce(jsonb_agg(CASE WHEN is_creator THEN entry WHEN o.opened_envelopes ? (entry->>'id') THEN coalesce(o.opened_envelopes->(entry->>'id')->'envelope',entry) ELSE entry-'message'-'mediaUrl' END),'[]'::jsonb) FROM jsonb_array_elements(o.envelopes || coalesce((SELECT jsonb_agg(value->'envelope') FROM jsonb_each(o.opened_envelopes) history WHERE value->'envelope' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(o.envelopes) current_letter WHERE current_letter->>'id'=history.key)),'[]'::jsonb)) entry),
      'opened_envelopes', o.opened_envelopes,
      'revision', o.revision,
      'created_at', o.created_at,
      'updated_at', o.updated_at
    )
  );
END $$;

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
  PERFORM private.qubit_require_activity(t.tools,'open_when');
  SELECT * INTO o FROM public.template_open_when_letters WHERE template_id = t.id AND tool_id = 'open_when_t09' FOR UPDATE;
  IF o.id IS NULL THEN
    RAISE EXCEPTION 'No open when letters found for this template' USING ERRCODE='42501';
  END IF;

  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(o.envelopes) envelope WHERE envelope->>'id'=p_envelope_id) THEN RAISE EXCEPTION 'Letter not found' USING ERRCODE='22023'; END IF;
  current_opened := o.opened_envelopes;
  IF current_opened ? p_envelope_id THEN
    -- Already opened, return existing timestamp
    opened_at_val := current_opened->p_envelope_id->>'opened_at';
  ELSE
    opened_at_val := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
    current_opened := current_opened || jsonb_build_object(
      p_envelope_id,
      jsonb_build_object('opened_at', opened_at_val,'envelope',(SELECT entry FROM jsonb_array_elements(o.envelopes) entry WHERE entry->>'id'=p_envelope_id LIMIT 1))
    );

    UPDATE public.template_open_when_letters SET
      opened_envelopes = current_opened,
      updated_at = now()
    WHERE id = o.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'envelope', (SELECT entry FROM jsonb_array_elements(o.envelopes) entry WHERE entry->>'id'=p_envelope_id LIMIT 1),
    'envelope_id', p_envelope_id,
    'opened_at', opened_at_val,
    'opened_envelopes', current_opened
  );
END $$;

DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE (n.nspname='public' AND p.proname IN ('bonded_get_template_scratch','bonded_open_template_scratch','bonded_get_template_coupon','bonded_request_template_coupon','bonded_manage_template_coupon','bonded_get_template_open_when','bonded_open_template_envelope')) OR (n.nspname='private' AND p.proname IN ('qubit_coupon_history','qubit_scratch_notification')) LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
 END LOOP;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
