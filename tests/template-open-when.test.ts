import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import {
  openEnvelopeSchema,
  openWhenEnvelopeSchema,
  openWhenToolSchema,
  templateInputSchema,
} from "../lib/security/validation";

const db = new PGlite();
const creatorId = "aaaaaaaa-2222-4222-8222-222222222222";
const strangerId = "bbbbbbbb-3333-4333-8333-333333333333";
const pair = "cccccccc-4444-4444-8444-444444444444";
const solo = "dddddddd-5555-5555-8555-555555555555";

const manageToken = randomBytes(32).toString("hex");
const deletionHash = createHash("sha256").update(manageToken).digest("hex");
const testCode = "testopenwhen123";

interface DbOpenWhenRow {
  id: string;
  template_id: string;
  tool_id: string;
  title: string;
  description: string;
  attach_reply: boolean;
  envelopes: Array<{ id: string; occasion: string; message: string; mediaUrl?: string }>;
  opened_envelopes: Record<string, { opened_at: string }>;
}

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
        "insert into public.couples(id,couple_code,partner_1_id,partner_2_id) values($1,'LOVE-OWHENPAIR',$2,$3)",
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

test("Open When Letters: validation schemas validate 1 to 3 envelopes and fields", () => {
  const validEnvelope = {
    id: "env_1",
    occasion: "you miss me",
    message: "Close your eyes and remember how much I adore you.",
    mediaUrl: "https://images.unsplash.com/photo-1518199266791-5375a83190b7",
    mediaType: "image" as const,
  };

  const parsedEnv = openWhenEnvelopeSchema.safeParse(validEnvelope);
  assert.equal(parsedEnv.success, true);

  const validTool = {
    id: "open_when_t09",
    type: "open_when",
    enabled: true,
    title: "Open When Letters",
    description: "Open these whenever you choose.",
    attachReply: true,
    envelopes: [validEnvelope],
  };

  const parsedTool = openWhenToolSchema.safeParse(validTool);
  assert.equal(parsedTool.success, true);
  if (parsedTool.success) {
    assert.equal(parsedTool.data.envelopes.length, 1);
    assert.equal(parsedTool.data.attachReply, true);
  }

  // Enforces 1 to 3 envelopes
  const zeroEnvelopes = { ...validTool, envelopes: [] };
  assert.equal(openWhenToolSchema.safeParse(zeroEnvelopes).success, false);

  const fourEnvelopes = {
    ...validTool,
    envelopes: [
      validEnvelope,
      { ...validEnvelope, id: "env_2" },
      { ...validEnvelope, id: "env_3" },
      { ...validEnvelope, id: "env_4" },
    ],
  };
  assert.equal(openWhenToolSchema.safeParse(fourEnvelopes).success, false);

  // openEnvelopeSchema
  assert.equal(openEnvelopeSchema.safeParse({ envelope_id: "env_1" }).success, true);
  assert.equal(openEnvelopeSchema.safeParse({ envelope_id: "" }).success, false);
});

test("Open When Letters: lifecycle, opening by choice, saving opened state, and rereading", async () => {
  const openWhenConfig = {
    id: "open_when_t09",
    type: "open_when",
    enabled: true,
    title: "Letters For You",
    description: "These envelopes open whenever you choose.",
    attachReply: true,
    envelopes: [
      {
        id: "env_miss",
        occasion: "you miss me",
        message: "I am sending you the warmest hug right now.",
      },
      {
        id: "env_tough",
        occasion: "you have had a tough day",
        message: "You are my hero and you can get through anything.",
      },
    ],
  };

  // 1. Create template with Open When Letters tool
  const createRes = await db.query(
    `SELECT public.bonded_create_template(
      $1::uuid,
      NULL,
      $2,
      $3::jsonb,
      ARRAY[]::uuid[]
    ) as result`,
    [
      creatorId,
      deletionHash,
      JSON.stringify({
        short_code: testCode,
        theme: "anime_female",
        scene_index: 0,
        partner_name: "Rowan",
        partner_from: "Charlie",
        message: "Letters to keep you company!",
        has_media: false,
        media_items: [],
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        sender_gender: "female",
        tools: [openWhenConfig],
      }),
    ]
  );
  assert.ok(createRes.rows[0]);

  // 2. Verify sync trigger created record
  const getInitial = await db.query(
    `SELECT public.bonded_get_template_open_when($1, $2, $3::uuid) as result`,
    [testCode, deletionHash, creatorId]
  );
  const initialData = (getInitial.rows[0] as { result: { success: boolean; is_creator: boolean; letters: DbOpenWhenRow } }).result;
  assert.equal(initialData.success, true);
  assert.equal(initialData.is_creator, true);
  assert.equal(initialData.letters.envelopes.length, 2);
  assert.deepEqual(initialData.letters.opened_envelopes, {});

  // 3. Recipient opens envelope "env_miss" by choice
  const openRes1 = await db.query(
    `SELECT public.bonded_open_template_envelope($1, $2) as result`,
    [testCode, "env_miss"]
  );
  const openData1 = (openRes1.rows[0] as { result: { success: boolean; envelope_id: string; opened_at: string; opened_envelopes: Record<string, { opened_at: string }> } }).result;
  assert.equal(openData1.success, true);
  assert.equal(openData1.envelope_id, "env_miss");
  assert.ok(openData1.opened_at);
  assert.ok(openData1.opened_envelopes["env_miss"]);

  const firstOpenedAt = openData1.opened_at;

  // 4. Rereading: opening again is idempotent and preserves original opened_at timestamp
  const openRes2 = await db.query(
    `SELECT public.bonded_open_template_envelope($1, $2) as result`,
    [testCode, "env_miss"]
  );
  const openData2 = (openRes2.rows[0] as { result: { success: boolean; opened_at: string } }).result;
  assert.equal(openData2.opened_at, firstOpenedAt);

  // 5. Verify opened state is reflected in get RPC
  const getUpdated = await db.query(
    `SELECT public.bonded_get_template_open_when($1) as result`,
    [testCode]
  );
  const updatedLetters = (getUpdated.rows[0] as { result: { letters: DbOpenWhenRow } }).result.letters;
  assert.ok(updatedLetters.opened_envelopes["env_miss"]);
  assert.equal(updatedLetters.opened_envelopes["env_tough"], undefined);
});

test("Open When Letters: template input schema accepts open_when_t09 in tools", () => {
  const payload = {
    scene_index: 2,
    partner_name: "Sam",
    partner_from: "Alex",
    sender_gender: "male" as const,
    message: "Thinking of you always.",
    has_media: false,
    media_items: [],
    expiry_hours: 48,
    tools: [
      {
        id: "open_when_t09",
        type: "open_when",
        enabled: true,
        title: "Love Letters",
        description: "Open by choice whenever you want.",
        attachReply: true,
        envelopes: [
          {
            id: "e1",
            occasion: "you need a laugh",
            message: "Remember our goofy inside jokes!",
          },
        ],
      },
    ],
  };

  const res = templateInputSchema.safeParse(payload);
  assert.equal(res.success, true);
  if (res.success) {
    assert.equal(res.data.tools.length, 1);
    assert.equal(res.data.tools[0].type, "open_when");
  }
});
