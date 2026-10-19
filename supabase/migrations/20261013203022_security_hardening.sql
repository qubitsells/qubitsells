BEGIN;

-- Keep private schemas out of the PostgREST exposed-schema list.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE CREATE ON SCHEMA public FROM PUBLIC,anon,authenticated;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA private REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
CREATE TABLE IF NOT EXISTS public.shared_wishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), short_code TEXT UNIQUE NOT NULL,
  slug TEXT NOT NULL, payload JSONB NOT NULL, deletion_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shared_wishes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shared_wishes FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.shared_wishes TO service_role;

ALTER TABLE public.couples ADD COLUMN IF NOT EXISTS couple_anthem JSONB;
ALTER TABLE public.couples ALTER COLUMN couple_code TYPE TEXT;
-- Retire guessable legacy codes while keeping the same couple rows and partner relationships.
UPDATE public.couples SET couple_code='LOVE-' || upper(replace(gen_random_uuid()::text,'-','')) WHERE length(couple_code)<37;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS couple_anthem JSONB;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS love_language TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS partner_love_language TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_reminders BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vibe_reminders BOOLEAN DEFAULT true;
ALTER TABLE public.time_capsules ADD COLUMN IF NOT EXISTS seal_mode TEXT NOT NULL DEFAULT 'solo';

CREATE TABLE IF NOT EXISTS private.capsule_payloads (
  capsule_id UUID PRIMARY KEY REFERENCES public.time_capsules(id) ON DELETE CASCADE,
  payload JSONB NOT NULL
);
-- Preserve every saved letter and media reference before removing browser-readable content.
INSERT INTO private.capsule_payloads (capsule_id, payload)
SELECT id, jsonb_build_object(
  'letter', letter, 'folders', folders, 'polaroids', polaroids,
  'voice_note', voice_note, 'voice_notes', voice_notes, 'video_note', video_note,
  'video_notes', video_notes, 'text_notes', text_notes, 'predictions', predictions,
  'secret_token', secret_token
) FROM public.time_capsules ON CONFLICT (capsule_id) DO NOTHING;
UPDATE public.time_capsules SET letter='{}', folders='[]', polaroids='[]',
  voice_note=NULL, voice_notes='[]', video_note=NULL, video_notes='[]',
  text_notes='[]', predictions='[]', secret_token=NULL;

CREATE TABLE IF NOT EXISTS private.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id TEXT NOT NULL, resource_type TEXT NOT NULL CHECK (resource_type IN ('image','video')),
  delivery_type TEXT NOT NULL DEFAULT 'authenticated' CHECK (delivery_type IN ('authenticated','upload')),
  format TEXT NOT NULL, owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, guest_hash TEXT,
  capsule_id UUID REFERENCES public.time_capsules(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.couple_templates(id) ON DELETE SET NULL,
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','attached','deleting')),
  lease_until TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (public_id, resource_type, delivery_type),
  CHECK (owner_id IS NOT NULL OR guest_hash IS NOT NULL OR state='deleting')
);
CREATE INDEX IF NOT EXISTS media_capsule_idx ON private.media_assets(capsule_id);
CREATE INDEX IF NOT EXISTS media_template_idx ON private.media_assets(template_id);
CREATE INDEX IF NOT EXISTS media_cleanup_idx ON private.media_assets(state, created_at);
CREATE TABLE IF NOT EXISTS private.rate_limits (
  bucket_key TEXT PRIMARY KEY, window_start TIMESTAMPTZ NOT NULL, requests INT NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_limit_expiry_idx ON private.rate_limits(window_start);
ALTER TABLE public.couple_templates ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.couple_templates ADD COLUMN IF NOT EXISTS guest_hash TEXT;
ALTER TABLE public.couple_templates ADD COLUMN IF NOT EXISTS deletion_hash TEXT;
ALTER TABLE public.couple_templates ADD COLUMN IF NOT EXISTS deleting BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.couple_templates ADD COLUMN IF NOT EXISTS media_migrated BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS private.legacy_media_retirement (
  public_id TEXT NOT NULL, resource_type TEXT NOT NULL, format TEXT NOT NULL,
  PRIMARY KEY(public_id,resource_type)
);
CREATE INDEX IF NOT EXISTS capsules_couple_idx ON public.time_capsules(couple_id);
CREATE INDEX IF NOT EXISTS capsules_creator_idx ON public.time_capsules(creator_id);
CREATE INDEX IF NOT EXISTS requests_capsule_idx ON public.capsule_seal_requests(capsule_id);
CREATE INDEX IF NOT EXISTS requests_requester_idx ON public.capsule_seal_requests(requester_id);
CREATE INDEX IF NOT EXISTS requests_partner_idx ON public.capsule_seal_requests(partner_id);
CREATE INDEX IF NOT EXISTS couples_partner1_idx ON public.couples(partner_1_id);
CREATE INDEX IF NOT EXISTS couples_partner2_idx ON public.couples(partner_2_id);
CREATE INDEX IF NOT EXISTS profiles_couple_idx ON public.profiles(couple_id);
DROP INDEX IF EXISTS public.idx_couple_templates_short_code;

-- Replace all old permissive policies, including policies with names not in this repository.
DO $$ DECLARE p RECORD; t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['couples','profiles','time_capsules','capsule_seal_requests','couple_templates','wishlists'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t);
      EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
      FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
        EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
      END LOOP;
    END IF;
  END LOOP;
END $$;
GRANT SELECT ON public.couples, public.profiles, public.time_capsules, public.capsule_seal_requests TO authenticated;
GRANT UPDATE (anniversary_date, couple_motto, couple_anthem, updated_at) ON public.couples TO authenticated;
GRANT INSERT (id, couple_id, full_name, partner_nickname, love_language, partner_love_language, email_reminders, vibe_reminders, couple_anthem, updated_at),
  UPDATE (id, couple_id, full_name, partner_nickname, love_language, partner_love_language, email_reminders, vibe_reminders, couple_anthem, updated_at) ON public.profiles TO authenticated;

CREATE POLICY couple_members ON public.couples FOR SELECT TO authenticated
  USING ((select auth.uid()) IN (partner_1_id, partner_2_id));
CREATE POLICY couple_members_update ON public.couples FOR UPDATE TO authenticated
  USING ((select auth.uid()) IN (partner_1_id, partner_2_id))
  WITH CHECK ((select auth.uid()) IN (partner_1_id, partner_2_id));
CREATE POLICY profile_read ON public.profiles FOR SELECT TO authenticated USING (
  id=(select auth.uid()) OR EXISTS (SELECT 1 FROM public.couples c WHERE c.id=profiles.couple_id AND (select auth.uid()) IN (c.partner_1_id,c.partner_2_id))
);
CREATE POLICY profile_insert ON public.profiles FOR INSERT TO authenticated WITH CHECK (
  id=(select auth.uid()) AND (couple_id IS NULL OR EXISTS (SELECT 1 FROM public.couples c WHERE c.id=profiles.couple_id AND (select auth.uid()) IN (c.partner_1_id,c.partner_2_id)))
);
CREATE POLICY profile_update ON public.profiles FOR UPDATE TO authenticated USING (id=(select auth.uid())) WITH CHECK (
  id=(select auth.uid()) AND (couple_id IS NULL OR EXISTS (SELECT 1 FROM public.couples c WHERE c.id=profiles.couple_id AND (select auth.uid()) IN (c.partner_1_id,c.partner_2_id)))
);
CREATE POLICY capsule_metadata_read ON public.time_capsules FOR SELECT TO authenticated USING (
  (seal_mode='solo' AND creator_id=(select auth.uid())) OR (seal_mode='couple' AND EXISTS (SELECT 1 FROM public.couples c WHERE c.id=time_capsules.couple_id AND (select auth.uid()) IN (c.partner_1_id,c.partner_2_id)))
);
CREATE POLICY request_read ON public.capsule_seal_requests FOR SELECT TO authenticated
  USING ((select auth.uid()) IN (requester_id,partner_id));
-- Browser clients have no direct capsule, vote, template or wishlist write grants.

CREATE OR REPLACE FUNCTION public.bonded_take_rate_limit(bucket_key TEXT, max_requests INT, window_seconds INT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE count_now INT; start_now TIMESTAMPTZ := date_trunc('second', now());
BEGIN
  IF max_requests < 1 OR window_seconds < 1 THEN RAISE EXCEPTION 'Invalid rate limit'; END IF;
  INSERT INTO private.rate_limits AS b VALUES (bucket_key,start_now,1)
  ON CONFLICT ON CONSTRAINT rate_limits_pkey DO UPDATE SET
    requests=CASE WHEN b.window_start <= start_now-make_interval(secs=>window_seconds) THEN 1 ELSE b.requests+1 END,
    window_start=CASE WHEN b.window_start <= start_now-make_interval(secs=>window_seconds) THEN start_now ELSE b.window_start END
  RETURNING requests INTO count_now;
  RETURN count_now <= max_requests;
END $$;

-- Authenticated entry points use a private, guarded function for atomic membership changes.
CREATE OR REPLACE FUNCTION private.couple_operation(join_code TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor UUID := auth.uid(); own public.couples; target public.couples; meta JSONB;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('bonded-membership'));
  SELECT * INTO own FROM public.couples WHERE actor IN (partner_1_id,partner_2_id)
    ORDER BY (id=(SELECT couple_id FROM public.profiles WHERE id=actor)) DESC NULLS LAST, (partner_2_id IS NOT NULL) DESC, created_at LIMIT 1 FOR UPDATE;
  IF join_code IS NULL THEN
    IF own.id IS NULL THEN
      SELECT raw_user_meta_data INTO meta FROM auth.users WHERE id=actor;
      INSERT INTO public.couples(couple_code,partner_1_id,couple_motto)
      VALUES ('LOVE-' || upper(replace(gen_random_uuid()::text,'-','')),actor,'Hand in hand, writing our forever story.') RETURNING * INTO own;
    END IF;
    INSERT INTO public.profiles(id,couple_id,full_name,partner_nickname)
    VALUES (actor,own.id,left(coalesce(meta->>'full_name',''),100),left(coalesce(meta->>'partner_nickname',''),100))
    ON CONFLICT(id) DO UPDATE SET couple_id=excluded.couple_id;
    RETURN to_jsonb(own);
  END IF;
  IF NOT public.bonded_take_rate_limit('pair:' || actor::text,10,3600) THEN
    RETURN jsonb_build_object('success',false,'message','Too many pairing attempts. Please try again later.');
  END IF;
  IF length(join_code)>100 THEN RETURN jsonb_build_object('success',false,'message','Invalid Love Code.'); END IF;
  SELECT * INTO target FROM public.couples WHERE couple_code=upper(trim(join_code)) FOR UPDATE;
  IF target.id IS NULL THEN RETURN jsonb_build_object('success',false,'message','Invalid Love Code.'); END IF;
  IF target.partner_1_id=actor THEN RETURN jsonb_build_object('success',false,'message','Share your own code with your partner.'); END IF;
  IF target.partner_2_id=actor THEN RETURN jsonb_build_object('success',true,'message','You are already connected.'); END IF;
  IF target.partner_2_id IS NOT NULL OR (own.id IS NOT NULL AND own.partner_2_id IS NOT NULL) THEN
    RETURN jsonb_build_object('success',false,'message','A partner is already connected.');
  END IF;
  IF own.id IS NOT NULL THEN
    UPDATE public.time_capsules SET couple_id=target.id WHERE couple_id=own.id AND creator_id=actor;
    UPDATE public.profiles SET couple_id=target.id WHERE id=actor;
    -- Never cascade-delete legacy memories whose owner still needs recovery.
    DELETE FROM public.couples WHERE id=own.id AND NOT EXISTS(SELECT 1 FROM public.time_capsules WHERE couple_id=own.id);
  END IF;
  UPDATE public.couples SET partner_2_id=actor,updated_at=now() WHERE id=target.id;
  INSERT INTO public.profiles(id,couple_id) VALUES(actor,target.id) ON CONFLICT(id) DO UPDATE SET couple_id=excluded.couple_id;
  RETURN jsonb_build_object('success',true,'message','Hearts connected! Your shared space is ready.');
END $$;
REVOKE ALL ON FUNCTION private.couple_operation(TEXT) FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.couple_operation(TEXT) TO authenticated;
CREATE OR REPLACE FUNCTION public.ensure_couple() RETURNS JSONB LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.couple_operation(NULL); $$;
DROP FUNCTION IF EXISTS public.join_couple_by_code(TEXT);
CREATE FUNCTION public.join_couple_by_code(code_input TEXT) RETURNS JSONB LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.couple_operation(code_input); $$;
REVOKE ALL ON FUNCTION public.ensure_couple(), public.join_couple_by_code(TEXT) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ensure_couple(), public.join_couple_by_code(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION private.can_access_capsule(c public.time_capsules, actor UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
SELECT actor IS NOT NULL AND ((c.seal_mode='solo' AND c.creator_id=actor) OR (c.seal_mode='couple' AND EXISTS (
  SELECT 1 FROM public.couples pair WHERE pair.id=c.couple_id AND actor IN(pair.partner_1_id,pair.partner_2_id)
))); $$;
CREATE OR REPLACE FUNCTION private.capsule_result(c public.time_capsules, actor UUID)
RETURNS JSONB LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
SELECT to_jsonb(c) || jsonb_build_object('content',CASE WHEN NOT c.is_locked AND (
  c.seal_mode='solo' OR c.creator_id=actor OR EXISTS(SELECT 1 FROM public.capsule_seal_requests r WHERE r.capsule_id=c.id AND r.status='accepted')
) THEN (SELECT payload FROM private.capsule_payloads WHERE capsule_id=c.id) ELSE NULL END); $$;

CREATE OR REPLACE FUNCTION public.bonded_capsule_operation(actor_id UUID, operation TEXT, capsule_id UUID DEFAULT NULL,
  metadata JSONB DEFAULT '{}', content JSONB DEFAULT NULL, asset_ids UUID[] DEFAULT '{}')
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE c public.time_capsules; pair public.couples; r public.capsule_seal_requests; matched INT; result JSONB;
BEGIN
  IF actor_id IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
  IF operation='list' THEN
    SELECT coalesce(jsonb_agg(private.capsule_result(t,actor_id) ORDER BY t.created_at DESC),'[]') INTO result
    FROM public.time_capsules t WHERE private.can_access_capsule(t,actor_id);
    RETURN result;
  END IF;
  IF operation='create' THEN
    PERFORM pg_advisory_xact_lock(hashtext('capsule:' || capsule_id::text));
    IF EXISTS(SELECT 1 FROM public.time_capsules WHERE id=capsule_id) THEN
      SELECT * INTO c FROM public.time_capsules WHERE id=capsule_id;
      IF c.creator_id IS DISTINCT FROM actor_id THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE='42501'; END IF;
      RETURN private.capsule_result(c,actor_id);
    END IF;
    SELECT * INTO pair FROM public.couples WHERE actor_id IN(partner_1_id,partner_2_id)
      ORDER BY (id=(SELECT couple_id FROM public.profiles WHERE id=actor_id)) DESC NULLS LAST, (partner_2_id IS NOT NULL) DESC, created_at LIMIT 1 FOR UPDATE;
    IF metadata->>'seal_mode'='couple' AND (pair.id IS NULL OR pair.partner_2_id IS NULL) THEN RAISE EXCEPTION 'Connect your partner first'; END IF;
    IF metadata->>'category'<>'open_when' THEN PERFORM (metadata->>'unlock_date')::timestamptz; END IF;
    INSERT INTO public.time_capsules(id,creator_id,couple_id,title,category,unlock_date,seal_mode,is_locked,seal_color,seal_stamp)
    VALUES(capsule_id,actor_id,pair.id,metadata->>'title',metadata->>'category',metadata->>'unlock_date',metadata->>'seal_mode',metadata->>'seal_mode'='solo',metadata->>'seal_color',metadata->>'seal_stamp') RETURNING * INTO c;
    INSERT INTO private.capsule_payloads VALUES(c.id,content);
    IF c.seal_mode='couple' THEN
      INSERT INTO public.capsule_seal_requests(capsule_id,requester_id,partner_id)
      VALUES(c.id,actor_id,CASE WHEN pair.partner_1_id=actor_id THEN pair.partner_2_id ELSE pair.partner_1_id END);
    END IF;
  ELSE
    SELECT * INTO c FROM public.time_capsules WHERE id=capsule_id FOR UPDATE;
    IF c.id IS NULL OR NOT private.can_access_capsule(c,actor_id) THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE='42501'; END IF;
    SELECT * INTO r FROM public.capsule_seal_requests WHERE capsule_seal_requests.capsule_id=c.id ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
    IF operation='get' THEN RETURN private.capsule_result(c,actor_id); END IF;
    IF operation='delete' THEN
      UPDATE private.media_assets SET state='deleting',lease_until=NULL WHERE media_assets.capsule_id=c.id;
      DELETE FROM public.time_capsules WHERE id=c.id;
      RETURN jsonb_build_object('success',true);
    END IF;
    IF operation='update' THEN
      IF c.is_locked OR (c.seal_mode='couple' AND r.status IS DISTINCT FROM 'accepted' AND c.creator_id<>actor_id) THEN RAISE EXCEPTION 'This capsule is sealed' USING ERRCODE='42501'; END IF;
      UPDATE private.capsule_payloads SET payload=content WHERE capsule_payloads.capsule_id=c.id;
      UPDATE public.time_capsules SET updated_at=now() WHERE id=c.id RETURNING * INTO c;
    ELSIF operation='unlock' THEN
      IF c.seal_mode='couple' AND (r.status IS DISTINCT FROM 'accepted' OR NOT r.unlock_vote_requester OR NOT r.unlock_vote_partner) THEN RAISE EXCEPTION 'Both partners must approve'; END IF;
      IF c.category<>'open_when' AND now() < c.unlock_date::timestamptz THEN RAISE EXCEPTION 'The unlock date has not arrived'; END IF;
      UPDATE public.time_capsules SET is_locked=false,updated_at=now() WHERE id=c.id RETURNING * INTO c;
      RETURN private.capsule_result(c,actor_id);
    ELSIF operation='seal' THEN
      IF c.seal_mode<>'couple' OR r.status IS DISTINCT FROM 'accepted' THEN RAISE EXCEPTION 'Partner approval required'; END IF;
      RETURN private.capsule_result(c,actor_id);
    ELSE RAISE EXCEPTION 'Unknown operation'; END IF;
  END IF;
  -- Attach only trusted pending uploads belonging to the verified creator, or this capsule's existing media.
  PERFORM 1 FROM private.media_assets m WHERE m.id=ANY(asset_ids) FOR UPDATE;
  SELECT count(*) INTO matched FROM private.media_assets m WHERE m.id=ANY(asset_ids) AND (
    (m.owner_id=actor_id AND m.state='pending' AND m.capsule_id IS NULL AND m.template_id IS NULL)
    OR (m.capsule_id=c.id AND m.state='attached')
  );
  IF matched<>cardinality(asset_ids) THEN RAISE EXCEPTION 'Invalid media ownership' USING ERRCODE='42501'; END IF;
  UPDATE private.media_assets SET state='deleting',lease_until=NULL WHERE media_assets.capsule_id=c.id AND NOT(id=ANY(asset_ids));
  UPDATE private.media_assets SET capsule_id=c.id,state='attached' WHERE id=ANY(asset_ids);
  RETURN private.capsule_result(c,actor_id);
END $$;

CREATE OR REPLACE FUNCTION public.bonded_seal_operation(actor_id UUID, operation TEXT, request_id UUID DEFAULT NULL, target_capsule UUID DEFAULT NULL, response TEXT DEFAULT NULL, vote BOOLEAN DEFAULT true)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE r public.capsule_seal_requests; c public.time_capsules;
BEGIN
  IF actor_id IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
  IF request_id IS NOT NULL THEN SELECT capsule_id INTO target_capsule FROM public.capsule_seal_requests WHERE id=request_id; END IF;
  SELECT * INTO c FROM public.time_capsules WHERE id=target_capsule FOR UPDATE;
  IF c.id IS NULL OR c.seal_mode<>'couple' OR NOT private.can_access_capsule(c,actor_id) THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE='42501'; END IF;
  SELECT * INTO r FROM public.capsule_seal_requests WHERE capsule_id=c.id ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF r.id IS NULL OR actor_id NOT IN(r.requester_id,r.partner_id) THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE='42501'; END IF;
  IF operation='request' THEN
    IF actor_id<>r.requester_id THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE='42501'; END IF;
    RETURN to_jsonb(r);
  ELSIF operation='resend' THEN
    IF actor_id<>r.requester_id OR r.status='accepted' THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE='42501'; END IF;
    UPDATE public.capsule_seal_requests SET status='pending',unlock_vote_requester=false,unlock_vote_partner=false,updated_at=now() WHERE id=r.id RETURNING * INTO r;
  ELSIF operation='respond' THEN
    IF actor_id<>r.partner_id OR r.status<>'pending' OR response NOT IN('accepted','rejected') THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE='42501'; END IF;
    UPDATE public.capsule_seal_requests SET status=response,updated_at=now() WHERE id=r.id RETURNING * INTO r;
    UPDATE public.time_capsules SET is_locked=response='accepted',updated_at=now() WHERE id=c.id;
  ELSIF operation IN('vote','reset') THEN
    IF r.status<>'accepted' OR NOT c.is_locked THEN RAISE EXCEPTION 'This capsule is not sealed'; END IF;
    IF c.category<>'open_when' AND now() < c.unlock_date::timestamptz THEN RAISE EXCEPTION 'The unlock date has not arrived'; END IF;
    IF operation='reset' THEN
      UPDATE public.capsule_seal_requests SET unlock_vote_requester=false,unlock_vote_partner=false,updated_at=now() WHERE id=r.id RETURNING * INTO r;
    ELSE
      UPDATE public.capsule_seal_requests SET
        unlock_vote_requester=CASE WHEN actor_id=requester_id THEN vote ELSE unlock_vote_requester END,
        unlock_vote_partner=CASE WHEN actor_id=partner_id THEN vote ELSE unlock_vote_partner END,updated_at=now()
      WHERE id=r.id RETURNING * INTO r;
      IF r.unlock_vote_requester AND r.unlock_vote_partner THEN UPDATE public.time_capsules SET is_locked=false,updated_at=now() WHERE id=c.id; END IF;
    END IF;
  ELSE RAISE EXCEPTION 'Unknown operation'; END IF;
  RETURN to_jsonb(r);
END $$;

CREATE OR REPLACE FUNCTION public.bonded_register_media(asset JSONB)
RETURNS UUID LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE result UUID;
BEGIN
  INSERT INTO private.media_assets(id,public_id,resource_type,format,owner_id,guest_hash)
  VALUES((asset->>'id')::uuid,asset->>'public_id',asset->>'resource_type',asset->>'format',(asset->>'owner_id')::uuid,asset->>'guest_hash') RETURNING id INTO result;
  RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.bonded_media_operation(actor_id UUID, guest_owner TEXT, asset_id UUID, operation TEXT, link_code TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE m private.media_assets; c public.time_capsules; t public.couple_templates; allowed BOOLEAN:=false;
BEGIN
  SELECT * INTO m FROM private.media_assets WHERE id=asset_id FOR UPDATE;
  IF operation IN('inspect','discard') THEN
    IF m.id IS NULL THEN RETURN NULL; END IF;
    IF NOT coalesce((actor_id IS NOT NULL AND m.owner_id=actor_id) OR (m.owner_id IS NULL AND guest_owner IS NOT NULL AND m.guest_hash=guest_owner),false) THEN
      RAISE EXCEPTION 'Not allowed' USING ERRCODE='42501';
    END IF;
    -- Cancellation may only discard unattached uploads. A lost save response must never destroy saved media.
    IF operation='discard' AND m.state='pending' THEN UPDATE private.media_assets SET state='deleting',lease_until=NULL WHERE id=m.id; END IF;
    RETURN to_jsonb(m);
  END IF;
  IF m.id IS NULL OR m.state='deleting' THEN RAISE EXCEPTION 'Not found' USING ERRCODE='42501'; END IF;
  IF m.capsule_id IS NOT NULL THEN
    SELECT * INTO c FROM public.time_capsules WHERE id=m.capsule_id;
    allowed:=private.can_access_capsule(c,actor_id) AND NOT c.is_locked AND
      (c.creator_id=actor_id OR EXISTS(SELECT 1 FROM public.capsule_seal_requests r WHERE r.capsule_id=c.id AND r.status='accepted'));
  ELSIF m.template_id IS NOT NULL THEN
    SELECT * INTO t FROM public.couple_templates WHERE id=m.template_id;
    allowed:=operation='read' AND NOT t.deleting AND t.expires_at>now() AND t.short_code=link_code;
  ELSE
    allowed:=(actor_id IS NOT NULL AND m.owner_id=actor_id) OR (m.owner_id IS NULL AND guest_owner IS NOT NULL AND m.guest_hash=guest_owner);
  END IF;
  IF NOT coalesce(allowed,false) THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE='42501'; END IF;
  IF operation<>'read' THEN RAISE EXCEPTION 'Unknown operation'; END IF;
  RETURN to_jsonb(m);
END $$;

CREATE OR REPLACE FUNCTION public.bonded_create_template(actor_id UUID, guest_owner TEXT, deletion_hash TEXT, template_data JSONB, asset_ids UUID[])
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE t public.couple_templates; matched INT;
BEGIN
  IF actor_id IS NULL AND guest_owner IS NULL THEN RAISE EXCEPTION 'Upload session required'; END IF;
  PERFORM 1 FROM private.media_assets WHERE id=ANY(asset_ids) FOR UPDATE;
  SELECT count(*) INTO matched FROM private.media_assets m WHERE m.id=ANY(asset_ids) AND m.state='pending' AND
    ((actor_id IS NOT NULL AND m.owner_id=actor_id) OR (m.owner_id IS NULL AND guest_owner IS NOT NULL AND m.guest_hash=guest_owner));
  IF matched<>cardinality(asset_ids) THEN RAISE EXCEPTION 'Invalid media ownership' USING ERRCODE='42501'; END IF;
  INSERT INTO public.couple_templates(short_code,theme,scene_index,partner_name,partner_from,message,has_media,media_items,expires_at,sender_gender,music_track,owner_id,guest_hash,deletion_hash,media_migrated)
  VALUES(template_data->>'short_code',template_data->>'theme',(template_data->>'scene_index')::int,template_data->>'partner_name',template_data->>'partner_from',template_data->>'message',cardinality(asset_ids)>0,
    (SELECT coalesce(jsonb_agg(jsonb_build_object('url','/api/media/' || m.id::text,'public_id',m.id::text,'type',m.resource_type)),'[]') FROM private.media_assets m WHERE m.id=ANY(asset_ids)),
    (template_data->>'expires_at')::timestamptz,template_data->>'sender_gender',template_data->'music_track',actor_id,guest_owner,deletion_hash,true) RETURNING * INTO t;
  UPDATE private.media_assets SET template_id=t.id,state='attached' WHERE id=ANY(asset_ids);
  RETURN jsonb_build_object('short_code',t.short_code,'expires_at',t.expires_at);
END $$;
CREATE OR REPLACE FUNCTION public.bonded_template_operation(link_code TEXT, operation TEXT, provided_hash TEXT DEFAULT NULL, actor_id UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE t public.couple_templates;
BEGIN
  SELECT * INTO t FROM public.couple_templates WHERE short_code=link_code FOR UPDATE;
  IF t.id IS NULL THEN RETURN NULL; END IF;
  IF operation='delete' THEN
    IF t.deletion_hash IS NULL OR provided_hash IS DISTINCT FROM t.deletion_hash OR (t.owner_id IS NOT NULL AND t.owner_id IS DISTINCT FROM actor_id) THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE='42501'; END IF;
    UPDATE public.couple_templates SET deleting=true WHERE id=t.id;
    UPDATE private.media_assets SET state='deleting',lease_until=NULL WHERE template_id=t.id;
    RETURN jsonb_build_object('success',true);
  END IF;
  IF t.expires_at<=now() OR t.deleting THEN RETURN jsonb_build_object('expired',true); END IF;
  IF operation<>'read' THEN RAISE EXCEPTION 'Unknown operation'; END IF;
  UPDATE public.couple_templates SET view_count=view_count+1 WHERE id=t.id;
  RETURN jsonb_build_object('id',t.id,'short_code',t.short_code,'theme',t.theme,
    'sender_gender',t.sender_gender,'music_track',t.music_track,'scene_index',t.scene_index,
    'partner_name',t.partner_name,'partner_from',t.partner_from,'message',t.message,
    'has_media',t.has_media,'media_items',t.media_items,'expires_at',t.expires_at,
    'view_count',t.view_count+1,'created_at',t.created_at);
END $$;

-- Durable leased cleanup: failed provider deletions retain rows and retry after lease expiry.
CREATE OR REPLACE FUNCTION public.bonded_claim_cleanup(batch_size INT DEFAULT 20, target_ids UUID[] DEFAULT NULL)
RETURNS SETOF private.media_assets LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  UPDATE public.couple_templates SET deleting=true WHERE expires_at<=now();
  UPDATE private.media_assets m SET state='deleting' WHERE
    (m.state='pending' AND m.created_at<now()-interval '24 hours') OR
    (m.template_id IN(SELECT id FROM public.couple_templates WHERE deleting));
  DELETE FROM private.rate_limits WHERE window_start<now()-interval '2 days';
  RETURN QUERY UPDATE private.media_assets m SET lease_until=now()+interval '5 minutes'
    WHERE m.id IN(SELECT id FROM private.media_assets WHERE state='deleting' AND (target_ids IS NULL OR id=ANY(target_ids)) AND (lease_until IS NULL OR lease_until<now()) ORDER BY created_at LIMIT least(greatest(batch_size,1),50) FOR UPDATE SKIP LOCKED)
    RETURNING m.*;
END $$;
CREATE OR REPLACE FUNCTION public.bonded_finish_cleanup(asset_id UUID)
RETURNS VOID LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ DELETE FROM private.media_assets WHERE id=asset_id AND state='deleting'; $$;
CREATE OR REPLACE FUNCTION public.bonded_finish_templates()
RETURNS INT LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE removed INT;
BEGIN
  -- Legacy templates with unregistered media are retained until the migration utility registers them.
  DELETE FROM public.couple_templates t WHERE deleting AND NOT EXISTS(SELECT 1 FROM private.media_assets m WHERE m.template_id=t.id)
    AND (t.media_items='[]'::jsonb OR t.media_migrated);
  GET DIAGNOSTICS removed=ROW_COUNT; RETURN removed;
END $$;

-- Service-only migration utilities. These never grant callers access to other users' memories.
CREATE OR REPLACE FUNCTION public.bonded_migration_snapshot(kind TEXT, cursor_id UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
SELECT CASE WHEN kind='capsules' THEN (
  SELECT coalesce(jsonb_agg(to_jsonb(s)),'[]') FROM (
    SELECT c.id,c.creator_id,p.payload AS content FROM public.time_capsules c JOIN private.capsule_payloads p ON p.capsule_id=c.id
    WHERE cursor_id IS NULL OR c.id>cursor_id ORDER BY c.id LIMIT 20
  ) s
) ELSE (
  SELECT coalesce(jsonb_agg(to_jsonb(s)),'[]') FROM (
    SELECT id,media_items AS content FROM public.couple_templates WHERE cursor_id IS NULL OR id>cursor_id ORDER BY id LIMIT 20
  ) s
) END; $$;
CREATE OR REPLACE FUNCTION public.bonded_save_migrated(kind TEXT, target_id UUID, payload JSONB, asset_ids UUID[], legacy_assets JSONB)
RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE item JSONB;
BEGIN
  IF kind='capsules' THEN
    PERFORM 1 FROM public.time_capsules WHERE id=target_id FOR UPDATE;
    UPDATE private.capsule_payloads SET payload=bonded_save_migrated.payload WHERE capsule_id=target_id;
    UPDATE private.media_assets SET capsule_id=target_id,state='attached' WHERE id=ANY(asset_ids) AND state='pending';
  ELSIF kind='templates' THEN
    PERFORM 1 FROM public.couple_templates WHERE id=target_id FOR UPDATE;
    UPDATE public.couple_templates SET media_items=payload,media_migrated=true WHERE id=target_id;
    UPDATE private.media_assets SET template_id=target_id,state='attached' WHERE id=ANY(asset_ids) AND state='pending';
  ELSE RAISE EXCEPTION 'Unknown migration target'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(legacy_assets) LOOP
    INSERT INTO private.legacy_media_retirement(public_id,resource_type,format)
    VALUES(item->>'public_id',item->>'resource_type',item->>'format') ON CONFLICT DO NOTHING;
  END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.bonded_retire_legacy_media()
RETURNS INT LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE affected INT;
BEGIN
  INSERT INTO private.media_assets(public_id,resource_type,format,delivery_type,guest_hash,state)
  SELECT public_id,resource_type,format,'upload','legacy-retirement','deleting' FROM private.legacy_media_retirement
  ON CONFLICT(public_id,resource_type,delivery_type) DO UPDATE SET state='deleting',lease_until=NULL;
  GET DIAGNOSTICS affected=ROW_COUNT;
  DELETE FROM private.legacy_media_retirement;
  RETURN affected;
END $$;

-- Revoke old public SECURITY DEFINER cleanup/read/write helpers.
DO $$ DECLARE f RECORD;
BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN('increment_template_views','get_expired_templates','check_template_rate_limit','delete_expired_templates') LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
  END LOOP;
END $$;
GRANT ALL ON ALL TABLES IN SCHEMA private TO service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO service_role;
GRANT EXECUTE ON FUNCTION private.couple_operation(TEXT) TO authenticated;
ALTER TABLE private.capsule_payloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.legacy_media_retirement ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE f RECORD;
BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname LIKE 'bonded_%' LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
  END LOOP;
END $$;
-- Realtime carries metadata and vote state only, never capsule contents or public templates.
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='couple_templates') THEN ALTER PUBLICATION supabase_realtime DROP TABLE public.couple_templates; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='couples') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.couples; END IF;
END $$;
COMMIT;
