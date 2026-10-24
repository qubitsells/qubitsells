import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { PRODUCTS } from "../lib/storefront";
import type { TemplateReply } from "../lib/supabase/coupleTemplates";
import { PGlite } from "@electric-sql/pglite";
import { submitReplySchema, templateInputSchema } from "../lib/security/validation";

const db = new PGlite();
const creatorId = "aaaaaaaa-1111-4111-8111-111111111111";
const strangerId = "bbbbbbbb-2222-4222-8222-222222222222";
const pair = "cccccccc-3333-4333-8333-333333333333";
const solo = "dddddddd-4444-4444-8444-444444444444";

const manageToken = randomBytes(32).toString("hex");
const deletionHash = createHash("sha256").update(manageToken).digest("hex");
const testCode = "testreplycode123";

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
  const migrations = (await fs.readdir("supabase/migrations")).filter(f => f.endsWith(".sql")).sort();
  for (const migration of migrations) {
    if (migration.includes("security_hardening")) {
      await db.query("insert into public.couples(id,couple_code,partner_1_id,partner_2_id) values($1,'LOVE-REPLYPAIR',$2,$3)", [pair, creatorId, strangerId]);
      await db.query("insert into public.time_capsules(id,couple_id,creator_id,title,unlock_date,letter,seal_mode) values($1,$2,$3,'Test capsule','2000-01-01',$4::jsonb,'solo')", [solo, pair, creatorId, JSON.stringify({ body: "secret" })]);
    }
    await db.exec(await fs.readFile("supabase/migrations/" + migration, "utf8"));
  }
});

after(async () => {
  await db.close();
});

test("templateInputSchema accepts tools configuration including reply_t01", () => {
  const input = {
    scene_index: 0,
    partner_name: "Darling",
    partner_from: "Sweetheart",
    message: "Forever yours",
    has_media: false,
    media_items: [],
    expiry_hours: 24,
    tools: [
      {
        id: "reply_t01",
        type: "reply",
        enabled: true,
        prompt: "Leave a secret note...",
        enabledFormats: { text: true, photo: true, voice: true },
        maxChars: 2000,
        maxPhotos: 3,
        maxVoiceSeconds: 60,
        allowMultiple: false,
        quickReactions: ["❤️", "🥰", "💋"],
      },
    ],
  };
  const parsed = templateInputSchema.safeParse(input);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.tools?.length, 1);
  }
});

test("submitReplySchema enforces content requirement and field bounds", () => {
  // Empty reply without message or reaction or media fails
  const invalid = submitReplySchema.safeParse({
    client_id: "11111111-2222-4333-8444-555555555555",
    author_name: "Partner",
    message: "",
    reaction: null,
    media_items: [],
  });
  assert.equal(invalid.success, false);

  // Valid reply with text and reaction
  const valid = submitReplySchema.safeParse({
    client_id: "11111111-2222-4333-8444-555555555555",
    author_name: "Partner",
    message: "I love you so much!",
    reaction: "❤️",
    media_items: [],
  });
  assert.equal(valid.success, true);
});

test("T01 reply workflow: creation, idempotent retry, cross-device sender access, and stranger denial", async () => {
  // 1. Create a template with reply tool enabled
  const tools = [
    {
      id: "reply_t01",
      type: "reply",
      enabled: true,
      prompt: "Leave a note...",
      enabledFormats: { text: true, photo: true, voice: true },
    },
  ];

  await db.query(
    `INSERT INTO public.couple_templates (
      short_code, theme, scene_index, partner_name, partner_from, message,
      has_media, media_items, expires_at, owner_id, deletion_hash, tools
    ) VALUES ($1, 'anime', 0, 'Partner', 'Creator', 'Love letter', false, '[]'::jsonb, now() + interval '2 days', $2, $3, $4::jsonb)`,
    [testCode, creatorId, deletionHash, JSON.stringify(tools)]
  );

  // 2. Partner submits a reply
  const clientId = "77777777-7777-4777-8777-777777777777";
  const partnerToken = "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
  const partnerTokenHash = createHash("sha256").update(partnerToken).digest("hex");

  const submitRes = await db.query<{ value: { success: boolean; idempotent: boolean; reply: { id: string; message: string; author_name: string } } }>(
    `SELECT public.bonded_submit_template_reply($1, $2::uuid, $3, $4, $5, $6::uuid[], $7, NULL, 'guest1') AS value`,
    [testCode, clientId, "My Love", "Can't wait for our date tonight!", "❤️", [] as string[], partnerTokenHash]
  );

  const firstSubmission = submitRes.rows[0].value;
  assert.equal(firstSubmission.success, true);
  assert.equal(firstSubmission.idempotent, false);
  assert.equal(firstSubmission.reply.message, "Can't wait for our date tonight!");
  const replyId = firstSubmission.reply.id;

  // 3. Retry with same clientId creates NO duplicate (idempotent)
  const retryRes = await db.query<{ value: { success: boolean; idempotent: boolean; reply: { id: string; message: string } } }>(
    `SELECT public.bonded_submit_template_reply($1, $2::uuid, $3, $4, $5, $6::uuid[], $7, NULL, 'guest1') AS value`,
    [testCode, clientId, "My Love", "Can't wait for our date tonight!", "❤️", [] as string[], partnerTokenHash]
  );
  const secondSubmission = retryRes.rows[0].value;
  assert.equal(secondSubmission.success, true);
  assert.equal(secondSubmission.idempotent, true);
  assert.equal(secondSubmission.reply.id, replyId);

  // Check table count: strictly 1 row exists
  const countCheck = await db.query<{ count: string | number }>(
    "SELECT count(*) FROM public.template_replies WHERE template_id = (SELECT id FROM public.couple_templates WHERE short_code = $1)",
    [testCode]
  );
  assert.equal(Number(countCheck.rows[0].count), 1);

  // 4. Authorized sender on another device using manage_token can read the reply
  const senderDeviceRes = await db.query<{ value: { success: boolean; is_creator: boolean; replies: Array<{ id: string; message: string }> } }>(
    `SELECT public.bonded_get_template_replies($1, NULL, $2, NULL) AS value`,
    [testCode, deletionHash]
  );
  assert.equal(senderDeviceRes.rows[0].value.success, true);
  assert.equal(senderDeviceRes.rows[0].value.is_creator, true);
  assert.equal(senderDeviceRes.rows[0].value.replies.length, 1);
  assert.equal(senderDeviceRes.rows[0].value.replies[0].message, "Can't wait for our date tonight!");

  // 5. Authorized sender authenticated as owner_id can read the reply
  const senderOwnerRes = await db.query<{ value: { success: boolean; is_creator: boolean; replies: Array<{ id: string; message: string }> } }>(
    `SELECT public.bonded_get_template_replies($1, NULL, NULL, $2::uuid) AS value`,
    [testCode, creatorId]
  );
  assert.equal(senderOwnerRes.rows[0].value.is_creator, true);
  assert.equal(senderOwnerRes.rows[0].value.replies.length, 1);

  // 6. Partner with their receipt hash sees only their own response
  const partnerReceiptRes = await db.query<{ value: { success: boolean; is_creator: boolean; replies: Array<{ id: string; message: string }> } }>(
    `SELECT public.bonded_get_template_replies($1, $2, NULL, NULL) AS value`,
    [testCode, partnerTokenHash]
  );
  assert.equal(partnerReceiptRes.rows[0].value.is_creator, false);
  assert.equal(partnerReceiptRes.rows[0].value.replies.length, 1);
  assert.equal(partnerReceiptRes.rows[0].value.replies[0].id, replyId);

  // 7. UNRELATED VIEWER (no manage token, stranger user id, no partner token) CANNOT read the thread
  const strangerRes = await db.query<{ value: { success: boolean; is_creator: boolean; replies: Array<unknown> } }>(
    `SELECT public.bonded_get_template_replies($1, NULL, NULL, $2::uuid) AS value`,
    [testCode, strangerId]
  );
  assert.equal(strangerRes.rows[0].value.is_creator, false);
  assert.equal(strangerRes.rows[0].value.replies.length, 0);

  const anonymousRes = await db.query<{ value: { success: boolean; is_creator: boolean; replies: Array<unknown> } }>(
    `SELECT public.bonded_get_template_replies($1, NULL, NULL, NULL) AS value`,
    [testCode]
  );
  assert.equal(anonymousRes.rows[0].value.is_creator, false);
  assert.equal(anonymousRes.rows[0].value.replies.length, 0);

  // 8. Partner or Creator can delete reply
  const deleteRes = await db.query<{ value: { success: boolean } }>(
    `SELECT public.bonded_delete_template_reply($1::uuid, $2, $3, NULL, NULL) AS value`,
    [replyId, testCode, partnerTokenHash]
  );
  assert.equal(deleteRes.rows[0].value.success, true);

  // Ensure row is gone
  const afterDeleteCheck = await db.query<{ count: string | number }>(
    "SELECT count(*) FROM public.template_replies WHERE id = $1::uuid",
    [replyId]
  );
  assert.equal(Number(afterDeleteCheck.rows[0].count), 0);
});

test("all six themes preserve photo and voice metadata, enforce enabled formats, and keep reply retries private", async () => {
  for (const [index, product] of PRODUCTS.entries()) {
    const code = `voicefixture${index}`, guest = `reply-guest-${index}`, receiptHash = createHash("sha256").update(guest).digest("hex"), clientId = randomUUID();
    const tool = { id: "reply_t01", type: "reply", enabled: true, enabledFormats: { text: true, photo: true, voice: true }, maxPhotos: 3, maxVoiceSeconds: 60, allowMultiple: true };
    await db.query(`INSERT INTO public.couple_templates(short_code,theme,scene_index,partner_name,partner_from,message,has_media,media_items,expires_at,owner_id,deletion_hash,tools) VALUES($1,$2,0,'Sam','Alex','Hello',false,'[]',now()+interval '2 days',$3,$4,$5::jsonb)`, [code, product.slug, creatorId, deletionHash, JSON.stringify([tool])]);
    const photo = randomUUID(), voice = randomUUID();
    for (const [id, type, format, duration] of [[photo, "image", "webp", null], [voice, "video", "m4a", 12.4]]) await db.query(`SELECT public.bonded_register_media($1::jsonb)`, [JSON.stringify({ id, public_id: `fixture/${id}`, resource_type: type, format, duration, owner_id: null, guest_hash: guest })]);
    const body = [code, clientId, "Sammy", "A photo and a voice note", "❤️", [photo, voice], receiptHash, guest];
    const saved = await db.query<{ value: { reply: TemplateReply; idempotent: boolean } }>(`SELECT public.bonded_submit_template_reply($1,$2::uuid,$3,$4,$5,$6::uuid[],$7,NULL,$8) AS value`, body);
    const reply = saved.rows[0].value.reply;
    assert.equal(reply.author_name, "Sammy"); assert.equal(reply.message, "A photo and a voice note"); assert.equal(reply.reaction, "❤️");
    assert.equal(reply.media_items.length, 2);
    const audio = reply.media_items.find(item => item.public_id === voice)!;
    assert.equal(audio.duration, 12.4); assert.equal(audio.format, "m4a"); assert.equal((audio as unknown as { media_type: string }).media_type, "voice");
    assert.ok(reply.media_items.some(item => item.public_id === photo && item.type === "image"));
    const retry = await db.query<{ value: { idempotent: boolean; reply: TemplateReply } }>(`SELECT public.bonded_submit_template_reply($1,$2::uuid,$3,$4,$5,$6::uuid[],$7,NULL,$8) AS value`, body);
    assert.equal(retry.rows[0].value.idempotent, true); assert.equal(retry.rows[0].value.reply.id, reply.id);
    await assert.rejects(db.query(`SELECT public.bonded_submit_template_reply($1,$2::uuid,'Other','Hello',NULL,'{}',$3,NULL,'other-guest')`, [code, clientId, deletionHash]), /another receipt/);
    const creator = await db.query<{ value: { replies: TemplateReply[] } }>(`SELECT public.bonded_get_template_replies($1,NULL,NULL,$2::uuid) AS value`, [code, creatorId]);
    assert.equal(creator.rows[0].value.replies[0].media_items.find(item => item.public_id === voice)?.duration, 12.4);
    const longVoice = randomUUID();
    await db.query(`SELECT public.bonded_register_media($1::jsonb)`, [JSON.stringify({ id: longVoice, public_id: `fixture/${longVoice}`, resource_type: "video", format: "webm", duration: 70, guest_hash: guest })]);
    await assert.rejects(db.query(`SELECT public.bonded_submit_template_reply($1,$2::uuid,'Sam','',NULL,$3::uuid[],$4,NULL,$5)`, [code, randomUUID(), [longVoice], receiptHash, guest]), /recording limit/);
    await db.query(`UPDATE public.couple_templates SET tools=$2::jsonb WHERE short_code=$1`, [code, JSON.stringify([{ ...tool, enabledFormats: { ...tool.enabledFormats, voice: false } }])]);
    await assert.rejects(db.query(`SELECT public.bonded_submit_template_reply($1,$2::uuid,'Sam','',NULL,$3::uuid[],$4,NULL,$5)`, [code, randomUUID(), [longVoice], receiptHash, guest]), /Voice replies are disabled/);
    await db.query(`UPDATE public.couple_templates SET tools=$2::jsonb WHERE short_code=$1`, [code, JSON.stringify([{ ...tool, enabled: false }])]);
    await assert.rejects(db.query(`SELECT public.bonded_submit_template_reply($1,$2::uuid,'Sam','Hello',NULL,'{}',$3,NULL,$4)`, [code, randomUUID(), receiptHash, guest]), /not enabled/);
  }
});
