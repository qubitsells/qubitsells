import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
const charlie = "33333333-3333-4333-8333-333333333333";

async function role(name: string, user = "") {
  await db.exec(`RESET ROLE; SET ROLE ${name}`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
}

async function capsuleOp(actor: string, operation: string, id: string | null = null, metadata: unknown = {}, content: unknown = null, assets: string[] = []) {
  await role("service_role");
  const result = await db.query<{ value: unknown }>(
    "select public.bonded_capsule_operation($1::uuid, $2, $3::uuid, $4::jsonb, $5::jsonb, $6::uuid[]) value",
    [actor, operation, id, JSON.stringify(metadata), content === null ? null : JSON.stringify(content), assets]
  );
  return result.rows[0].value;
}

before(async () => {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;
    CREATE TABLE auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE PUBLICATION supabase_realtime;
  `);
  await db.query("insert into auth.users(id) values($1),($2),($3)", [alice, bob, charlie]);
  await db.exec(await fs.readFile("supabase/bootstrap.sql", "utf8"));
  const migrations = (await fs.readdir("supabase/migrations")).filter((f) => f.endsWith(".sql")).sort();
  for (const migration of migrations) {
    await db.exec(await fs.readFile("supabase/migrations/" + migration, "utf8"));
  }
});

after(async () => {
  await db.close();
});

test("couples can disconnect and lose access to the shared couple space and couple capsules", async () => {
  // 1. Alice connects/ensures her couple space
  await role("authenticated", alice);
  const aliceSpace = (await db.query<{ ensure_couple: { id: string; couple_code: string } }>("select public.ensure_couple()")).rows[0].ensure_couple;
  assert.ok(aliceSpace.couple_code);

  // 2. Bob pairs with Alice's code
  await role("authenticated", bob);
  const joinResult = (await db.query<{ join_couple_by_code: { success: boolean; message: string } }>(
    "select public.join_couple_by_code($1)",
    [aliceSpace.couple_code]
  )).rows[0].join_couple_by_code;
  assert.equal(joinResult.success, true);

  // Verify both are in the shared couple
  const sharedCouple = (await db.query<{ id: string; partner_1_id: string; partner_2_id: string }>(
    "select * from public.couples where partner_1_id = $1 and partner_2_id = $2",
    [alice, bob]
  )).rows[0];
  assert.ok(sharedCouple);
  const sharedCoupleId = sharedCouple.id;

  // 3. Create a solo capsule for Alice and a shared couple capsule
  const soloCapId = "44444444-4444-4444-8444-444444444444";
  const sharedCapId = "55555555-5555-4555-8555-555555555555";

  await capsuleOp(alice, "create", soloCapId, { title: "Alice Solo", seal_mode: "solo", category: "milestone", unlock_date: "2099-01-01", seal_color: "rose", seal_stamp: "💌" }, { letter: { body: "Secret solo" } });
  await capsuleOp(alice, "create", sharedCapId, { title: "Alice & Bob Shared", seal_mode: "couple", category: "milestone", unlock_date: "2099-01-01", seal_color: "rose", seal_stamp: "💌" }, { letter: { body: "Shared memory" } });

  // Verify Alice and Bob can see the shared capsule before disconnecting
  const aliceCapsBefore = (await capsuleOp(alice, "list")) as Array<{ id: string }>;
  assert.ok(aliceCapsBefore.some((c) => c.id === sharedCapId));

  const bobCapsBefore = (await capsuleOp(bob, "list")) as Array<{ id: string }>;
  assert.ok(bobCapsBefore.some((c) => c.id === sharedCapId));

  // 4. Bob decides to disconnect from Alice
  await role("authenticated", bob);
  const disconnectResult = (await db.query<{ disconnect_couple: { success: boolean; message: string } }>(
    "select public.disconnect_couple()"
  )).rows[0].disconnect_couple;
  assert.equal(disconnectResult.success, true);
  assert.match(disconnectResult.message, /Disconnected successfully/i);

  // 5. Verify the old shared couple space no longer exists
  const oldCoupleCheck = await db.query("select * from public.couples where id = $1", [sharedCoupleId]);
  assert.equal(oldCoupleCheck.rows.length, 0);

  // 6. Verify neither Alice nor Bob can access the old shared couple capsule anymore
  const aliceCapsAfter = (await capsuleOp(alice, "list")) as Array<{ id: string }>;
  assert.ok(!aliceCapsAfter.some((c) => c.id === sharedCapId), "Alice must not access shared capsule after disconnect");
  assert.ok(aliceCapsAfter.some((c) => c.id === soloCapId), "Alice should still retain her personal solo capsule");

  const bobCapsAfter = (await capsuleOp(bob, "list")) as Array<{ id: string }>;
  assert.ok(!bobCapsAfter.some((c) => c.id === sharedCapId), "Bob must not access shared capsule after disconnect");

  // Direct attempt by either partner to access the shared capsule must be rejected
  await assert.rejects(
    async () => {
      await capsuleOp(alice, "get", sharedCapId);
    },
    /Not allowed/
  );
  await assert.rejects(
    async () => {
      await capsuleOp(bob, "get", sharedCapId);
    },
    /Not allowed/
  );

  // 7. Verify both Alice and Bob have their own separate, unconnected couple records
  await role("authenticated", alice);
  const aliceNewSpace = (await db.query<{ ensure_couple: { id: string; partner_1_id: string; partner_2_id: string | null } }>(
    "select public.ensure_couple()"
  )).rows[0].ensure_couple;
  assert.equal(aliceNewSpace.partner_1_id, alice);
  assert.equal(aliceNewSpace.partner_2_id, null);

  await role("authenticated", bob);
  const bobNewSpace = (await db.query<{ ensure_couple: { id: string; partner_1_id: string; partner_2_id: string | null } }>(
    "select public.ensure_couple()"
  )).rows[0].ensure_couple;
  assert.equal(bobNewSpace.partner_1_id, bob);
  assert.equal(bobNewSpace.partner_2_id, null);

  assert.notEqual(aliceNewSpace.id, bobNewSpace.id);

  // 8. Disconnecting again when already unpaired returns friendly failure message
  const repeatDisconnect = (await db.query<{ disconnect_couple: { success: boolean; message: string } }>(
    "select public.disconnect_couple()"
  )).rows[0].disconnect_couple;
  assert.equal(repeatDisconnect.success, false);
  assert.match(repeatDisconnect.message, /not currently connected/i);
});
