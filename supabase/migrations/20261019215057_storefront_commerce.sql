-- Individual-account commerce. Browser clients cannot grant purchases or reviews.
CREATE TABLE public.store_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkout_key uuid NOT NULL,
  product_slug text NOT NULL CHECK (product_slug IN ('halloween-pumpkin-moon','our-little-pink-day','halloween-midnight-key','starlit-story','spooky-the-haunted-waltz','anime-storm-and-flame')),
  product_name text NOT NULL CHECK (length(product_name) BETWEEN 1 AND 120),
  duration_hours integer NOT NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd' CHECK (currency='usd'),
  payment_mode text NOT NULL DEFAULT 'test' CHECK (payment_mode IN ('test','live')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','expired','refunded')),
  stripe_session_id text UNIQUE,
  stripe_payment_intent_id text UNIQUE,
  checkout_url text,
  refunded_amount_cents integer NOT NULL DEFAULT 0 CHECK (refunded_amount_cents>=0 AND refunded_amount_cents<=amount_cents),
  template_id uuid REFERENCES public.couple_templates(id) ON DELETE SET NULL,
  fulfilled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(buyer_id,checkout_key),
  CHECK ((duration_hours=72 AND amount_cents=200) OR (duration_hours=168 AND amount_cents=300) OR (duration_hours=720 AND amount_cents=349))
);
CREATE INDEX store_orders_buyer_created ON public.store_orders(buyer_id,created_at DESC);
CREATE INDEX store_orders_template ON public.store_orders(template_id) WHERE template_id IS NOT NULL;

CREATE TABLE public.store_wishlist (
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_slug text NOT NULL CHECK (product_slug IN ('halloween-pumpkin-moon','our-little-pink-day','halloween-midnight-key','starlit-story','spooky-the-haunted-waltz','anime-storm-and-flame')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(buyer_id,product_slug)
);
CREATE TABLE public.store_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
  product_slug text NOT NULL,
  payment_mode text NOT NULL CHECK (payment_mode IN ('test','live')),
  author_name text NOT NULL CHECK (length(author_name) BETWEEN 1 AND 80),
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text NOT NULL CHECK (length(title) BETWEEN 3 AND 120),
  body text NOT NULL CHECK (length(body) BETWEEN 15 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(buyer_id,product_slug,payment_mode)
);
CREATE INDEX store_reviews_product_created ON public.store_reviews(product_slug,payment_mode,created_at DESC);
CREATE INDEX store_reviews_order ON public.store_reviews(order_id);
CREATE TABLE public.store_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('order','template_response','review_request')),
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  href text NOT NULL CHECK (href LIKE '/%' AND href NOT LIKE '//%'),
  dedupe_key text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,dedupe_key)
);
CREATE INDEX store_notifications_user_created ON public.store_notifications(user_id,created_at DESC);
CREATE INDEX store_notifications_unread ON public.store_notifications(user_id) WHERE read_at IS NULL;

ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.store_orders,public.store_wishlist,public.store_reviews,public.store_notifications FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.store_orders,public.store_wishlist,public.store_reviews,public.store_notifications TO authenticated;
CREATE POLICY own_orders ON public.store_orders FOR SELECT TO authenticated USING (buyer_id=(select auth.uid()));
CREATE POLICY own_wishlist ON public.store_wishlist FOR SELECT TO authenticated USING (buyer_id=(select auth.uid()));
CREATE POLICY own_reviews ON public.store_reviews FOR SELECT TO authenticated USING (buyer_id=(select auth.uid()));
CREATE POLICY own_notifications ON public.store_notifications FOR SELECT TO authenticated USING (user_id=(select auth.uid()));
GRANT ALL ON public.store_orders,public.store_wishlist,public.store_reviews,public.store_notifications TO service_role;

-- Service-only, atomic paid-order fulfillment. Deleting an expired link never
-- restores an entitlement: fulfilled_at persists even if template_id becomes NULL.
CREATE FUNCTION public.qubit_publish_order(p_order_id uuid,p_actor_id uuid,p_guest_owner text,p_deletion_hash text,p_template_data jsonb,p_asset_ids uuid[])
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE purchased public.store_orders; result jsonb; link_id uuid;
BEGIN
  SELECT * INTO purchased FROM public.store_orders WHERE id=p_order_id FOR UPDATE;
  IF purchased.id IS NULL OR purchased.buyer_id IS DISTINCT FROM p_actor_id OR purchased.status<>'paid' OR purchased.fulfilled_at IS NOT NULL THEN
    RAISE EXCEPTION 'A paid, unused order belonging to this account is required' USING ERRCODE='42501';
  END IF;
  IF p_template_data->>'theme' IS DISTINCT FROM purchased.product_slug THEN
    RAISE EXCEPTION 'This order is for a different product' USING ERRCODE='42501';
  END IF;
  p_template_data := p_template_data || jsonb_build_object('expires_at',now()+make_interval(hours=>purchased.duration_hours));
  result := public.bonded_create_template(p_actor_id,p_guest_owner,p_deletion_hash,p_template_data,p_asset_ids);
  SELECT id INTO link_id FROM public.couple_templates WHERE short_code=result->>'short_code';
  UPDATE public.store_orders SET template_id=link_id,fulfilled_at=now(),updated_at=now() WHERE id=p_order_id;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.qubit_publish_order(uuid,uuid,text,text,jsonb,uuid[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.qubit_publish_order(uuid,uuid,text,text,jsonb,uuid[]) TO service_role;

CREATE FUNCTION public.qubit_save_review(p_actor_id uuid,p_order_id uuid,p_author_name text,p_rating integer,p_title text,p_body text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE purchased public.store_orders; review_id uuid;
BEGIN
  SELECT * INTO purchased FROM public.store_orders WHERE id=p_order_id FOR SHARE;
  IF purchased.id IS NULL OR purchased.buyer_id IS DISTINCT FROM p_actor_id OR purchased.status<>'paid' THEN
    RAISE EXCEPTION 'Only the buyer of a paid order can review this product' USING ERRCODE='42501';
  END IF;
  INSERT INTO public.store_reviews(buyer_id,order_id,product_slug,payment_mode,author_name,rating,title,body)
  VALUES(p_actor_id,p_order_id,purchased.product_slug,purchased.payment_mode,p_author_name,p_rating,trim(p_title),trim(p_body))
  ON CONFLICT(buyer_id,product_slug,payment_mode) DO UPDATE SET order_id=excluded.order_id,author_name=excluded.author_name,rating=excluded.rating,title=excluded.title,body=excluded.body,updated_at=now()
  RETURNING id INTO review_id;
  UPDATE public.store_notifications SET read_at=now() WHERE user_id=p_actor_id AND kind='review_request' AND dedupe_key='review:'||p_order_id::text;
  RETURN review_id;
END $$;
REVOKE ALL ON FUNCTION public.qubit_save_review(uuid,uuid,text,integer,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.qubit_save_review(uuid,uuid,text,integer,text,text) TO service_role;

-- Public-facing results omit account IDs, order IDs, and email addresses.
CREATE FUNCTION public.qubit_product_reviews(p_slug text,p_mode text,p_page integer DEFAULT 0)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 WITH eligible AS (
   SELECT r.* FROM public.store_reviews r JOIN public.store_orders o ON o.id=r.order_id
   WHERE r.product_slug=p_slug AND r.payment_mode=p_mode AND o.status='paid'
 ), rows AS (SELECT * FROM eligible ORDER BY created_at DESC,id LIMIT 10 OFFSET greatest(0,least(p_page,10000))*10)
 SELECT jsonb_build_object('count',(SELECT count(*) FROM eligible),'average',(SELECT round(avg(rating),1) FROM eligible),
   'distribution',(SELECT jsonb_object_agg(stars,(SELECT count(*) FROM eligible WHERE rating=stars)) FROM generate_series(1,5) stars),
   'reviews',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'author_name',author_name,'rating',rating,'title',title,'body',body,'created_at',created_at,'updated_at',updated_at,'payment_mode',payment_mode) ORDER BY created_at DESC,id) FROM rows),'[]'::jsonb))
$$;
REVOKE ALL ON FUNCTION public.qubit_product_reviews(text,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.qubit_product_reviews(text,text,integer) TO service_role;

CREATE FUNCTION public.qubit_review_reminders(p_actor_id uuid) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
  INSERT INTO public.store_notifications(user_id,kind,title,message,href,dedupe_key)
  SELECT o.buyer_id,'review_request','How was your template?',o.product_name||' · Share your experience with other shoppers.','/products/'||o.product_slug||'?review=1#reviews','review:'||o.id::text
  FROM public.store_orders o WHERE o.buyer_id=p_actor_id AND o.status='paid' AND o.paid_at<=now()-interval '24 hours'
  AND NOT EXISTS(SELECT 1 FROM public.store_reviews r WHERE r.buyer_id=o.buyer_id AND r.product_slug=o.product_slug AND r.payment_mode=o.payment_mode)
  ON CONFLICT(user_id,dedupe_key) DO NOTHING
$$;
REVOKE ALL ON FUNCTION public.qubit_review_reminders(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.qubit_review_reminders(uuid) TO service_role;

CREATE FUNCTION private.qubit_order_notification() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('paid','refunded','expired') THEN
    INSERT INTO public.store_notifications(user_id,kind,title,message,href,dedupe_key)
    VALUES(NEW.buyer_id,'order',CASE NEW.status WHEN 'paid' THEN 'Your template is ready to personalize' WHEN 'refunded' THEN 'Your order was refunded' ELSE 'Your checkout expired' END,
      NEW.product_name,'/profile?view=orders&order='||NEW.id::text,'order:'||NEW.id::text||':'||NEW.status)
    ON CONFLICT(user_id,dedupe_key) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.qubit_order_notification() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.qubit_order_notification() TO service_role;
CREATE TRIGGER qubit_order_notification AFTER UPDATE ON public.store_orders FOR EACH ROW EXECUTE FUNCTION private.qubit_order_notification();

-- Notifications contain activity summaries only, never answers, draft contents,
-- private reveal text, media URLs, or guest management tokens.
GRANT SELECT,INSERT,UPDATE,DELETE ON public.template_replies,public.template_invitations,public.template_polls,public.template_question_cards,public.template_question_submissions,public.template_private_reveals,public.template_coupons,public.template_open_when_letters,public.template_our_story,public.template_bucket_list TO service_role;
CREATE FUNCTION private.qubit_template_notification() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE t public.couple_templates; n jsonb:=to_jsonb(NEW); old_row jsonb; relevant jsonb; label text;
BEGIN
  IF TG_OP='UPDATE' THEN old_row:=to_jsonb(OLD); END IF;
  SELECT * INTO t FROM public.couple_templates WHERE id=(n->>'template_id')::uuid;
  IF t.owner_id IS NULL OR t.deleting OR t.expires_at<=now() THEN RETURN NEW; END IF;
  CASE TG_TABLE_NAME
    WHEN 'template_replies' THEN relevant:=n->'id'; label:='A new reply';
    WHEN 'template_invitations' THEN IF n->>'responded_at' IS NOT NULL AND n->'responded_at' IS DISTINCT FROM old_row->'responded_at' THEN relevant:=n->'responded_at'; label:='An invitation response'; END IF;
    WHEN 'template_polls' THEN IF n->'partner_votes' IS DISTINCT FROM old_row->'partner_votes' OR n->'custom_suggestions' IS DISTINCT FROM old_row->'custom_suggestions' THEN relevant:=jsonb_build_array(n->'partner_votes',n->'custom_suggestions'); label:='A poll update'; END IF;
    WHEN 'template_question_submissions' THEN IF n->>'author_role'='partner' AND n->>'is_draft'='false' AND n->>'submitted_at' IS NOT NULL AND n->'submitted_at' IS DISTINCT FROM old_row->'submitted_at' THEN relevant:=n->'submitted_at'; label:='New question answers'; END IF;
    WHEN 'template_private_reveals' THEN IF n->>'status'='revealed' AND n->'status' IS DISTINCT FROM old_row->'status' THEN relevant:=n->'revealed_at'; label:='A private reveal is ready'; END IF;
    WHEN 'template_coupons' THEN IF n->>'status'='requested' AND n->'requested_at' IS DISTINCT FROM old_row->'requested_at' THEN relevant:=n->'requested_at'; label:='A coupon request'; END IF;
    WHEN 'template_open_when_letters' THEN IF n->'opened_envelopes' IS DISTINCT FROM old_row->'opened_envelopes' THEN relevant:=n->'opened_envelopes'; label:='A letter was opened'; END IF;
    WHEN 'template_our_story' THEN IF n->>'partner_contribution' IS NOT NULL AND n->'partner_contribution' IS DISTINCT FROM old_row->'partner_contribution' THEN relevant:=n->'partner_contribution'; label:='A new story contribution'; END IF;
    WHEN 'template_bucket_list' THEN IF n->'items' IS DISTINCT FROM old_row->'items' THEN relevant:=n->'items'; label:='A bucket list update'; END IF;
    ELSE RETURN NEW;
  END CASE;
  IF label IS NOT NULL THEN
    INSERT INTO public.store_notifications(user_id,kind,title,message,href,dedupe_key)
    VALUES(t.owner_id,'template_response',label,'Your template has new activity. Open My creations to see the details.','/creator-center#creation-'||t.id::text,
      TG_TABLE_NAME||':'||(n->>'id')||':'||md5(coalesce(relevant::text,'')))
    ON CONFLICT(user_id,dedupe_key) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.qubit_template_notification() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.qubit_template_notification() TO service_role;
CREATE TRIGGER qubit_reply_notification AFTER INSERT ON public.template_replies FOR EACH ROW EXECUTE FUNCTION private.qubit_template_notification();
CREATE TRIGGER qubit_invitation_notification AFTER UPDATE ON public.template_invitations FOR EACH ROW EXECUTE FUNCTION private.qubit_template_notification();
CREATE TRIGGER qubit_poll_notification AFTER UPDATE ON public.template_polls FOR EACH ROW EXECUTE FUNCTION private.qubit_template_notification();
CREATE TRIGGER qubit_question_notification AFTER INSERT OR UPDATE ON public.template_question_submissions FOR EACH ROW EXECUTE FUNCTION private.qubit_template_notification();
CREATE TRIGGER qubit_reveal_notification AFTER UPDATE ON public.template_private_reveals FOR EACH ROW EXECUTE FUNCTION private.qubit_template_notification();
CREATE TRIGGER qubit_coupon_notification AFTER UPDATE ON public.template_coupons FOR EACH ROW EXECUTE FUNCTION private.qubit_template_notification();
CREATE TRIGGER qubit_letter_notification AFTER UPDATE ON public.template_open_when_letters FOR EACH ROW EXECUTE FUNCTION private.qubit_template_notification();
CREATE TRIGGER qubit_story_notification AFTER UPDATE ON public.template_our_story FOR EACH ROW EXECUTE FUNCTION private.qubit_template_notification();
CREATE TRIGGER qubit_bucket_notification AFTER UPDATE ON public.template_bucket_list FOR EACH ROW EXECUTE FUNCTION private.qubit_template_notification();
