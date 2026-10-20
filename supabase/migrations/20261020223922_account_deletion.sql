BEGIN;

-- Auth deletion must clean up app data in the same transaction. The trigger is
-- private and can only be reached through an authorized auth.users DELETE.
CREATE OR REPLACE FUNCTION private.qubit_account_before_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE pair public.couples; survivor uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('bonded-membership'));
  UPDATE private.media_assets SET state='deleting',lease_until=NULL WHERE owner_id=OLD.id;
  UPDATE private.media_assets SET state='deleting',lease_until=NULL
  WHERE template_id IN (SELECT id FROM public.couple_templates WHERE owner_id=OLD.id)
     OR capsule_id IN (SELECT id FROM public.time_capsules WHERE creator_id=OLD.id);
  DELETE FROM public.couple_templates WHERE owner_id=OLD.id;
  DELETE FROM public.time_capsules WHERE creator_id=OLD.id;

  FOR pair IN SELECT * FROM public.couples
    WHERE OLD.id IN (partner_1_id,partner_2_id) ORDER BY id FOR UPDATE
  LOOP
    survivor := CASE WHEN pair.partner_1_id=OLD.id THEN pair.partner_2_id ELSE pair.partner_1_id END;
    UPDATE private.media_assets SET state='deleting',lease_until=NULL
    WHERE capsule_id IN (SELECT id FROM public.time_capsules WHERE couple_id=pair.id AND seal_mode='couple');
    DELETE FROM public.time_capsules WHERE couple_id=pair.id AND seal_mode='couple';
    DELETE FROM public.couple_calendar_events WHERE couple_id=pair.id;
    IF survivor IS NOT NULL THEN
      -- Keep the survivor's personal capsules, wishlist, account, and purchases.
      -- Rotate the invitation so old shared links cannot reconnect this space.
      UPDATE public.couples SET partner_1_id=survivor,partner_2_id=NULL,
        couple_code='LOVE-'||upper(replace(gen_random_uuid()::text,'-','')),
        anniversary_date=NULL,couple_motto=NULL,couple_anthem=NULL,updated_at=now()
      WHERE id=pair.id;
      UPDATE public.profiles SET partner_nickname=NULL,couple_anthem=NULL,updated_at=now()
      WHERE couple_id=pair.id AND id<>OLD.id;
    ELSE
      -- Preserve any legacy personal memories owned by a different account.
      UPDATE public.time_capsules SET couple_id=NULL WHERE couple_id=pair.id;
      DELETE FROM public.couples WHERE id=pair.id;
    END IF;
  END LOOP;
  RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION private.qubit_account_before_delete() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS qubit_account_before_delete ON auth.users;
CREATE TRIGGER qubit_account_before_delete BEFORE DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.qubit_account_before_delete();

-- The API refuses deletion until the safety trigger is installed and enabled.
CREATE OR REPLACE FUNCTION public.qubit_account_deletion_ready()
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
  SELECT EXISTS(SELECT 1 FROM pg_catalog.pg_trigger
    WHERE tgrelid='auth.users'::regclass AND tgname='qubit_account_before_delete'
      AND tgenabled IN ('O','A'));
$$;
REVOKE ALL ON FUNCTION public.qubit_account_deletion_ready() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.qubit_account_deletion_ready() TO service_role;
CREATE INDEX IF NOT EXISTS media_owner_idx ON private.media_assets(owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS templates_owner_idx ON public.couple_templates(owner_id) WHERE owner_id IS NOT NULL;
COMMIT;
