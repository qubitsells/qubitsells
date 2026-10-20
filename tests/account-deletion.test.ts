import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const alice = "11111111-1111-4111-8111-111111111111", bob = "22222222-2222-4222-8222-222222222222";
before(async () => {
  await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role; CREATE TABLE auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}'); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; CREATE PUBLICATION supabase_realtime;");
  await db.exec(await fs.readFile("supabase/bootstrap.sql", "utf8"));
  for (const name of (await fs.readdir("supabase/migrations")).filter(name => name.endsWith(".sql")).sort()) await db.exec(await fs.readFile("supabase/migrations/" + name, "utf8"));
});
after(async () => { await db.close(); });

for (const deleting of [alice, bob]) test(`deleting ${deleting === alice ? "first" : "second"} partner removes own data and shared capsules while preserving the survivor`, async () => {
  const survivor = deleting === alice ? bob : alice;
  await db.exec("BEGIN");
  try {
    await db.query("insert into auth.users(id) values($1),($2)", [alice, bob]);
    const pair = (await db.query<{ id: string }>("insert into public.couples(couple_code,partner_1_id,partner_2_id) values('LOVE-OLD',$1,$2) returning id", [alice, bob])).rows[0].id;
    await db.query("insert into public.profiles(id,couple_id,partner_nickname) values($1,$3,'Old nickname'),($2,$3,'Old nickname')", [alice, bob, pair]);
    const caps: { id: string; creator: string; mode: string }[] = [];
    for (const [creator, mode] of [[deleting, "solo"], [survivor, "solo"], [survivor, "couple"]]) {
      const cap = (await db.query<{ id: string }>("insert into public.time_capsules(couple_id,creator_id,title,unlock_date,seal_mode) values($1,$2,'Private memory','2099-01-01',$3) returning id", [pair, creator, mode])).rows[0].id;
      caps.push({ id: cap, creator, mode });
      await db.query("insert into private.capsule_payloads(capsule_id,payload) values($1,'{\"letter\":\"private content\"}')", [cap]);
      await db.query("insert into private.media_assets(public_id,resource_type,format,owner_id,capsule_id,state) values($1,'image','png',$2,$3,'attached')", [cap, creator, cap]);
    }
    const template = (await db.query<{ id: string }>("insert into public.couple_templates(short_code,owner_id,media_migrated) values('test-deleted',$1,true) returning id", [deleting])).rows[0].id;
    await db.query("insert into private.media_assets(public_id,resource_type,format,guest_hash,template_id,state) values('recipient-upload','image','png','guest',$1,'attached')", [template]);
    await db.query("insert into public.store_orders(buyer_id,checkout_key,product_slug,product_name,duration_hours,amount_cents) values($1,gen_random_uuid(),'starlit-story','Starlit Story',72,200),($2,gen_random_uuid(),'starlit-story','Starlit Story',72,200)", [deleting, survivor]);
    await db.query("insert into public.store_wishlist(buyer_id,product_slug) values($1,'starlit-story'),($2,'starlit-story')", [deleting, survivor]);
    await db.query("update public.store_orders set status='paid',paid_at=now() where buyer_id IN ($1,$2)", [deleting, survivor]);
    await db.query("insert into public.store_reviews(buyer_id,order_id,product_slug,payment_mode,author_name,rating,title,body) select buyer_id,id,product_slug,payment_mode,'Example member',5,'Lovely template','A thoughtful and personal template.' from public.store_orders");
    await db.query("DELETE FROM auth.users WHERE id=$1", [deleting]);

    assert.equal((await db.query("select id from auth.users where id=$1", [deleting])).rows.length, 0);
    assert.equal((await db.query("select id from auth.users where id=$1", [survivor])).rows.length, 1);
    assert.equal((await db.query("select id from public.profiles where id=$1", [deleting])).rows.length, 0);
    assert.equal((await db.query("select id from public.store_orders where buyer_id=$1", [deleting])).rows.length, 0);
    assert.equal((await db.query("select buyer_id from public.store_wishlist where buyer_id=$1", [deleting])).rows.length, 0);
    assert.equal((await db.query("select id from public.store_orders where buyer_id=$1", [survivor])).rows.length, 1);
    assert.equal((await db.query("select id from public.store_reviews where buyer_id=$1", [deleting])).rows.length, 0);
    assert.equal((await db.query("select id from public.store_reviews where buyer_id=$1", [survivor])).rows.length, 1);
    assert.equal((await db.query("select id from public.store_notifications where user_id=$1", [deleting])).rows.length, 0);
    assert.equal((await db.query("select id from public.couple_templates where id=$1", [template])).rows.length, 0);
    const remaining = (await db.query<{ id: string; creator_id: string }>("select id,creator_id from public.time_capsules")).rows;
    assert.deepEqual(remaining, [{ id: caps[1].id, creator_id: survivor }]);
    assert.equal((await db.query("select capsule_id from private.capsule_payloads")).rows.length, 1);
    const pairAfter = (await db.query<{ partner_1_id: string; partner_2_id: string | null; couple_code: string }>("select * from public.couples where id=$1", [pair])).rows[0];
    assert.equal(pairAfter.partner_1_id, survivor);
    assert.equal(pairAfter.partner_2_id, null);
    assert.notEqual(pairAfter.couple_code, "LOVE-OLD");
    const assets = (await db.query<{ state: string; public_id: string }>("select state,public_id from private.media_assets order by public_id")).rows;
    assert.equal(assets.filter(row => row.state === "deleting").length, 3, "own, shared, and recipient media remain queued even after parent rows disappear");
    assert.equal(assets.find(row => row.public_id === caps[1].id)?.state, "attached");
    await db.exec("SET LOCAL ROLE authenticated");
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [survivor]);
    assert.equal((await db.query("select id from public.time_capsules")).rows.length, 1);
  } finally { await db.exec("ROLLBACK"); }
});

test("deletion readiness is service-only and detects a disabled trigger", async () => {
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`SET ROLE ${role}`);
    await assert.rejects(db.query("select public.qubit_account_deletion_ready()"));
    await assert.rejects(db.query("select private.qubit_account_before_delete()"));
    await assert.rejects(db.query("delete from auth.users"));
    await db.exec("RESET ROLE");
  }
  await db.exec("SET ROLE service_role");
  assert.equal((await db.query<{ ready: boolean }>("select public.qubit_account_deletion_ready() ready")).rows[0].ready, true);
  await db.exec("RESET ROLE; ALTER TABLE auth.users DISABLE TRIGGER qubit_account_before_delete");
  assert.equal((await db.query<{ ready: boolean }>("select public.qubit_account_deletion_ready() ready")).rows[0].ready, false);
  await db.exec("ALTER TABLE auth.users ENABLE TRIGGER qubit_account_before_delete");
});

test("unpaired deletion removes private capsules and media without relying on a couple cascade", async () => {
  await db.exec("BEGIN");
  try {
    await db.query("insert into auth.users(id) values($1)", [alice]);
    const cap = (await db.query<{ id: string }>("insert into public.time_capsules(creator_id,title,unlock_date,seal_mode) values($1,'Solo','2099-01-01','solo') returning id", [alice])).rows[0].id;
    await db.query("insert into private.media_assets(public_id,resource_type,format,owner_id,capsule_id,state) values('solo','image','png',$1,$2,'attached')", [alice, cap]);
    await db.query("delete from auth.users where id=$1", [alice]);
    assert.equal((await db.query("select id from public.time_capsules")).rows.length, 0);
    assert.equal((await db.query<{ state: string }>("select state from private.media_assets")).rows[0].state, "deleting");
  } finally { await db.exec("ROLLBACK"); }
});

test("a failed auth deletion rolls back content removal and media queue changes together", async () => {
  await db.exec("BEGIN");
  try {
    await db.query("insert into auth.users(id) values($1)", [alice]);
    await db.query("insert into public.couple_templates(short_code,owner_id) values('rollback-template',$1)", [alice]);
    await db.query("insert into private.media_assets(public_id,resource_type,format,owner_id,state) values('rollback-asset','image','png',$1,'pending')", [alice]);
    await db.exec("CREATE FUNCTION private.test_delete_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'simulated auth delete failure'; END $$; CREATE TRIGGER test_delete_failure AFTER DELETE ON auth.users FOR EACH ROW EXECUTE FUNCTION private.test_delete_failure(); SAVEPOINT attempt");
    await assert.rejects(db.query("delete from auth.users where id=$1", [alice]));
    await db.exec("ROLLBACK TO SAVEPOINT attempt");
    assert.equal((await db.query("select id from auth.users where id=$1", [alice])).rows.length, 1);
    assert.equal((await db.query("select id from public.couple_templates where owner_id=$1", [alice])).rows.length, 1);
    assert.equal((await db.query<{ state: string }>("select state from private.media_assets")).rows[0].state, "pending");
  } finally { await db.exec("ROLLBACK"); }
});
