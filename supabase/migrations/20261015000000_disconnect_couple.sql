-- Migration: Add disconnect_couple function for unlinking couple spaces safely
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

CREATE OR REPLACE FUNCTION private.disconnect_couple_operation()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  actor UUID := auth.uid();
  curr public.couples;
  p1 UUID;
  p2 UUID;
  new_c1_id UUID;
  new_c2_id UUID;
  code1 TEXT;
  code2 TEXT;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('bonded-membership'));

  -- Find the current active connected couple for actor
  SELECT * INTO curr FROM public.couples
  WHERE actor IN (partner_1_id, partner_2_id) AND partner_2_id IS NOT NULL
  ORDER BY (id = (SELECT couple_id FROM public.profiles WHERE id = actor)) DESC NULLS LAST, created_at DESC
  LIMIT 1 FOR UPDATE;

  IF curr.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'You are not currently connected to a partner in a couple space.');
  END IF;

  p1 := curr.partner_1_id;
  p2 := curr.partner_2_id;

  -- Generate new unique Love Codes
  code1 := 'LOVE-' || upper(replace(gen_random_uuid()::text, '-', ''));
  code2 := 'LOVE-' || upper(replace(gen_random_uuid()::text, '-', ''));

  -- Create new solo couple space for partner 1
  INSERT INTO public.couples(couple_code, partner_1_id, partner_2_id, couple_motto)
  VALUES (code1, p1, NULL, 'Hand in hand, writing our forever story.')
  RETURNING id INTO new_c1_id;

  -- Create new solo couple space for partner 2
  INSERT INTO public.couples(couple_code, partner_1_id, partner_2_id, couple_motto)
  VALUES (code2, p2, NULL, 'Hand in hand, writing our forever story.')
  RETURNING id INTO new_c2_id;

  -- Reassign solo capsules to each partner's respective new space
  UPDATE public.time_capsules
  SET couple_id = new_c1_id
  WHERE couple_id = curr.id AND creator_id = p1 AND seal_mode = 'solo';

  UPDATE public.time_capsules
  SET couple_id = new_c2_id
  WHERE couple_id = curr.id AND creator_id = p2 AND seal_mode = 'solo';

  -- Reassign user wishlists to respective spaces
  IF to_regclass('public.wishlists') IS NOT NULL THEN
    UPDATE public.wishlists SET couple_id = new_c1_id WHERE couple_id = curr.id AND user_id = p1;
    UPDATE public.wishlists SET couple_id = new_c2_id WHERE couple_id = curr.id AND user_id = p2;
  END IF;

  -- Update profiles with their new individual couple IDs and clear partner nicknames
  UPDATE public.profiles
  SET couple_id = new_c1_id, partner_nickname = NULL, couple_anthem = NULL, updated_at = now()
  WHERE id = p1;

  UPDATE public.profiles
  SET couple_id = new_c2_id, partner_nickname = NULL, couple_anthem = NULL, updated_at = now()
  WHERE id = p2;

  -- Mark media assets attached to the old couple's shared capsules for deletion
  IF to_regclass('private.media_assets') IS NOT NULL THEN
    UPDATE private.media_assets
    SET state = 'deleting', lease_until = NULL
    WHERE capsule_id IN (SELECT id FROM public.time_capsules WHERE couple_id = curr.id);
  END IF;

  -- Delete the shared couple record. Cascade removes remaining shared couple capsules and seal requests.
  DELETE FROM public.couples WHERE id = curr.id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Disconnected successfully. Your couple space has been unlinked and shared access closed.'
  );
END $$;

REVOKE ALL ON FUNCTION private.disconnect_couple_operation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.disconnect_couple_operation() TO authenticated;

DROP FUNCTION IF EXISTS public.disconnect_couple();
CREATE FUNCTION public.disconnect_couple()
RETURNS JSONB LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
  SELECT private.disconnect_couple_operation();
$$;

REVOKE ALL ON FUNCTION public.disconnect_couple() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.disconnect_couple() TO authenticated;
