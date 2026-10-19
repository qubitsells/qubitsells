import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const creatorId = "aaaaaaaa-3333-4333-8333-333333333333";
const strangerId = "bbbbbbbb-4444-4444-8444-444444444444";

const activeManageToken = randomBytes(32).toString("hex");
const activeDeletionHash = createHash("sha256").update(activeManageToken).digest("hex");
const activeCode = "activecreator123";

const expiredManageToken = randomBytes(32).toString("hex");
const expiredDeletionHash = createHash("sha256").update(expiredManageToken).digest("hex");
const expiredCode = "expiredcreator456";

const pair = "cccccccc-4444-4444-8444-444444444444";
const solo = "dddddddd-5555-5555-8555-555555555555";

before(async () => {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;
    CREATE TABLE auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE PUBLICATION supabase_realtime;
  `);
  await db.query("insert into auth.users(id) values($1),($2)", [creatorId, strangerId]);
  await db.exec(await fs.readFile("supabase/bootstrap.sql", "utf8"));
  const migrations = (await fs.readdir("supabase/migrations")).filter((f) => f.endsWith(".sql")).sort();
  for (const migration of migrations) {
    if (migration.includes("security_hardening")) {
      await db.query(
        "insert into public.couples(id,couple_code,partner_1_id,partner_2_id) values($1,'LOVE-CREATORPAIR',$2,$3)",
        [pair, creatorId, strangerId]
      );
      await db.query(
        "insert into public.time_capsules(id,couple_id,creator_id,title,unlock_date,letter,seal_mode) values($1,$2,$3,'Test capsule','2000-01-01',$4::jsonb,'solo')",
        [solo, pair, creatorId, JSON.stringify({ body: "secret" })]
      );
    }
    await db.exec(await fs.readFile("supabase/migrations/" + migration, "utf8"));
  }
});

after(async () => {
  await db.close();
});

test("Creator Center: active templates return received replies and tool states", async () => {
  // 1. Create an active template owned by creatorId
  const activeRes = await db.query<{ id: string }>(
    `INSERT INTO public.couple_templates (
       short_code, theme, scene_index, partner_name, partner_from, message,
       owner_id, deletion_hash, expires_at, tools
     ) VALUES (
       $1, 'anime_male', 0, 'Sarah', 'Alex', 'I love you!',
       $2, $3, now() + interval '24 hours',
       '[{"id":"reply_t01","type":"reply","enabled":true,"prompt":"Leave a note"}]'::jsonb
     ) RETURNING id`,
    [activeCode, creatorId, activeDeletionHash]
  );
  const activeTemplateId = activeRes.rows[0].id;

  // 2. Partner sends a reply
  await db.query(
    `INSERT INTO public.template_replies (
       template_id, tool_id, author_name, message, reaction
     ) VALUES (
       $1, 'reply_t01', 'Sarah', 'I love you too so much!', '💕'
     )`,
    [activeTemplateId]
  );

  // 3. Creator Center query for creatorId
  const result = await db.query<{ bonded_get_creator_center_data: any }>(
    `SELECT public.bonded_get_creator_center_data($1, $2, $3)`,
    [creatorId, [], []]
  );

  const data = result.rows[0].bonded_get_creator_center_data;
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.templates));

  const found = data.templates.find((t: any) => t.short_code === activeCode);
  assert.ok(found, "Active template should be returned");
  assert.equal(found.is_expired, false);
  assert.equal(found.replies_purged, false);
  assert.equal(found.replies.length, 1);
  assert.equal(found.replies[0].message, "I love you too so much!");
  assert.equal(found.replies[0].author_name, "Sarah");
});

test("Creator Center: expired templates strictly purge and hide replies", async () => {
  // 1. Create an expired template (expires_at in the past)
  const expiredRes = await db.query<{ id: string }>(
    `INSERT INTO public.couple_templates (
       short_code, theme, scene_index, partner_name, partner_from, message,
       owner_id, deletion_hash, expires_at, tools
     ) VALUES (
       $1, 'anime_female', 1, 'Emma', 'Liam', 'Will you marry me?',
       $2, $3, now() - interval '2 hours',
       '[{"id":"reply_t01","type":"reply","enabled":true}]'::jsonb
     ) RETURNING id`,
    [expiredCode, creatorId, expiredDeletionHash]
  );
  const expiredTemplateId = expiredRes.rows[0].id;

  // 2. Insert reply that existed before expiry
  await db.query(
    `INSERT INTO public.template_replies (
       template_id, tool_id, author_name, message, reaction
     ) VALUES (
       $1, 'reply_t01', 'Emma', 'Yes a million times yes!', '💍'
     )`,
    [expiredTemplateId]
  );

  // 3. Query Creator Center
  const result = await db.query<{ bonded_get_creator_center_data: any }>(
    `SELECT public.bonded_get_creator_center_data($1, $2, $3)`,
    [creatorId, [], []]
  );

  const data = result.rows[0].bonded_get_creator_center_data;
  assert.equal(data.success, true);

  const foundExpired = data.templates.find((t: any) => t.short_code === expiredCode);
  assert.ok(foundExpired, "Expired template is identified");
  assert.equal(foundExpired.is_expired, true);
  assert.equal(foundExpired.replies_purged, true);
  // CRITICAL REQUIREMENT: replies MUST be empty once template expires
  assert.deepEqual(foundExpired.replies, []);
});

test("Creator Center: guest creator can view via manage token hash", async () => {
  const guestToken = randomBytes(32).toString("hex");
  const guestHash = createHash("sha256").update(guestToken).digest("hex");
  const guestCode = "guesttemplate789";

  const guestRes = await db.query<{ id: string }>(
    `INSERT INTO public.couple_templates (
       short_code, theme, scene_index, partner_name, partner_from, message,
       owner_id, deletion_hash, expires_at, tools
     ) VALUES (
       $1, 'anime_male', 2, 'Jessica', 'Noah', 'Our dream trip',
       NULL, $2, now() + interval '48 hours', '[]'::jsonb
     ) RETURNING id`,
    [guestCode, guestHash]
  );
  const guestTemplateId = guestRes.rows[0].id;

  await db.query(
    `INSERT INTO public.template_replies (
       template_id, tool_id, author_name, message
     ) VALUES (
       $1, 'reply_t01', 'Jessica', 'Packing my bags!'
     )`,
    [guestTemplateId]
  );

  // Stranger with null actor_id and wrong token cannot see it
  const strangerRes = await db.query<{ bonded_get_creator_center_data: any }>(
    `SELECT public.bonded_get_creator_center_data(NULL, ARRAY['wronghash'::text], ARRAY[$1::text])`,
    [guestCode]
  );
  const strangerData = strangerRes.rows[0].bonded_get_creator_center_data;
  assert.equal(strangerData.templates.length, 0);

  // Guest creator with correct manage hash CAN see it
  const validRes = await db.query<{ bonded_get_creator_center_data: any }>(
    `SELECT public.bonded_get_creator_center_data(NULL, ARRAY[$1::text], ARRAY[$2::text])`,
    [guestHash, guestCode]
  );
  const validData = validRes.rows[0].bonded_get_creator_center_data;
  assert.equal(validData.templates.length, 1);
  assert.equal(validData.templates[0].short_code, guestCode);
  assert.equal(validData.templates[0].replies[0].message, "Packing my bags!");
});
