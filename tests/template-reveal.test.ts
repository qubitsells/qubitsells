import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import {
  confirmRevealSchema,
  lockRevealAnswerSchema,
  revealToolSchema,
  saveRevealDraftSchema,
  templateInputSchema,
  withdrawRevealAnswerSchema,
} from "../lib/security/validation";

const db = new PGlite();
const creatorId = "aaaaaaaa-2222-4222-8222-222222222222";
const strangerId = "bbbbbbbb-3333-4333-8333-333333333333";
const pair = "cccccccc-4444-4444-8444-444444444444";
const solo = "dddddddd-5555-5555-8555-555555555555";

const manageToken = randomBytes(32).toString("hex");
const deletionHash = createHash("sha256").update(manageToken).digest("hex");

const partnerToken = randomBytes(32).toString("hex");
const partnerHash = createHash("sha256").update(partnerToken).digest("hex");

const impostorToken = randomBytes(32).toString("hex");
const impostorHash = createHash("sha256").update(impostorToken).digest("hex");

const testCode = "testprivreveal";

interface DbRevealRow {
  id: string;
  template_id: string;
  tool_id: string;
  prompt: string;
  status: string;
  revision: number;
  creator_locked_at: string | null;
  partner_locked_at: string | null;
  revealed_at: string | null;
  creator_answer: Record<string, string> | null;
  partner_answer: Record<string, string> | null;
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
  const migrations = (await fs.readdir("supabase/migrations")).filter(f => f.endsWith(".sql")).sort();
  for (const migration of migrations) {
    if (migration.includes("security_hardening")) {
      await db.query("insert into public.couples(id,couple_code,partner_1_id,partner_2_id) values($1,'LOVE-REVPAIR',$2,$3)", [pair, creatorId, strangerId]);
      await db.query("insert into public.time_capsules(id,couple_id,creator_id,title,unlock_date,letter,seal_mode) values($1,$2,$3,'Test capsule','2000-01-01',$4::jsonb,'solo')", [solo, pair, creatorId, JSON.stringify({ body: "secret" })]);
    }
    await db.exec(await fs.readFile("supabase/migrations/" + migration, "utf8"));
  }
});

after(async () => {
  await db.close();
});

test("T06: Private Reveal schemas validate tool config, drafts, locking and confirmation", () => {
  // 1. Tool schema
  const validTool = {
    id: "reveal_t06",
    type: "private_reveal",
    enabled: true,
    prompt: "When did you know you fell for me?",
    description: "Honest answers sealed until both submit",
    countdownSeconds: 3,
  };
  assert.equal(revealToolSchema.safeParse(validTool).success, true);
  assert.equal(revealToolSchema.safeParse({ ...validTool, prompt: "" }).success, false);

  // 2. Template input schema accepts private reveal tool
  assert.equal(
    templateInputSchema.safeParse({
      scene_index: 0,
      partner_name: "Maya",
      partner_from: "Alex",
      message: "A special reveal for us",
      has_media: false,
      media_items: [],
      expiry_hours: 48,
      tools: [validTool],
    }).success,
    true
  );

  // 3. Draft schema
  assert.equal(
    saveRevealDraftSchema.safeParse({
      expected_revision: 1,
      answers: { main: "When you made tea for me while I was working late" },
    }).success,
    true
  );

  // 4. Lock schema
  assert.equal(
    lockRevealAnswerSchema.safeParse({
      expected_revision: 1,
      answers: { main: "When you laughed at my silly joke in the rain" },
    }).success,
    true
  );
  // Empty answer fails lock
  assert.equal(
    lockRevealAnswerSchema.safeParse({
      expected_revision: 1,
      answers: { main: "" },
    }).success,
    false
  );

  // 5. Withdraw and confirm schemas
  assert.equal(withdrawRevealAnswerSchema.safeParse({ expected_revision: 1 }).success, true);
  assert.equal(confirmRevealSchema.safeParse({ expected_revision: 1 }).success, true);
});

test("T06: Private Reveal lifecycle: Zero leakage before eligibility, locking, withdrawal, and final mutual discovery", async () => {
  // 1. Insert template with reveal tool
  await db.query(`
    INSERT INTO public.couple_templates (
      owner_id, short_code, theme, scene_index, partner_name, partner_from,
      message, has_media, media_items, expires_at, deletion_hash, tools
    ) VALUES (
      $1, $2, 'anime', 0, 'Maya', 'Alex', 'A surprise question', false, '[]'::jsonb,
      now() + interval '5 days', $3,
      $4::jsonb
    )
  `, [
    creatorId,
    testCode,
    deletionHash,
    JSON.stringify([
      {
        id: "reveal_t06",
        type: "private_reveal",
        prompt: "What is your secret favorite thing about us?",
        description: "Sealed until both lock",
        countdownSeconds: 3,
      },
    ]),
  ]);

  // 2. Sync verification
  const initialRow = await db.query<DbRevealRow>(
    "SELECT * FROM public.template_private_reveals WHERE tool_id = 'reveal_t06'"
  );
  assert.equal(initialRow.rows.length, 1);
  assert.equal(initialRow.rows[0].status, "open");
  assert.equal(initialRow.rows[0].revision, 1);

  // 3. Creator saves draft and locks their answer
  await db.query(`
    SELECT public.bonded_save_reveal_draft(
      $1, 1, $2::jsonb, true, $3, NULL, $4
    )
  `, [testCode, JSON.stringify({ main: "Drafting my thoughts..." }), deletionHash, creatorId]);

  const lockCreatorRes = await db.query<{ res: { success: boolean; status: string; is_eligible: boolean } }>(`
    SELECT public.bonded_lock_reveal_answer(
      $1, 1, $2::jsonb, true, $3, NULL, $4
    ) as res
  `, [testCode, JSON.stringify({ main: "How we talk for hours without noticing time." }), deletionHash, creatorId]);

  assert.equal(lockCreatorRes.rows[0].res.status, "waiting");
  assert.equal(lockCreatorRes.rows[0].res.is_eligible, false);

  // 4. CRITICAL ZERO-LEAKAGE CHECK:
  // Partner checks status before locking. Partner MUST NOT receive creator's answer!
  const partnerPreCheck = await db.query<{ res: { reveal: { is_eligible: boolean; partner_answer: unknown; my_answer: unknown } } }>(`
    SELECT public.bonded_get_template_reveal($1, NULL, $2, NULL) as res
  `, [testCode, partnerHash]);
  const pData = partnerPreCheck.rows[0].res.reveal;
  assert.equal(pData.is_eligible, false);
  assert.equal(pData.partner_answer, null); // STRICTLY NULL! No network payload leakage!

  // 5. Withdrawal test: Creator withdraws answer before partner locks
  const withdrawRes = await db.query<{ res: { success: boolean; status: string } }>(`
    SELECT public.bonded_withdraw_reveal_answer(
      $1, 1, true, $2, NULL, $3
    ) as res
  `, [testCode, deletionHash, creatorId]);
  assert.equal(withdrawRes.rows[0].res.status, "open");

  const withdrawnDb = await db.query<DbRevealRow>(
    "SELECT * FROM public.template_private_reveals WHERE tool_id = 'reveal_t06'"
  );
  assert.equal(withdrawnDb.rows[0].creator_locked_at, null);
  assert.equal(withdrawnDb.rows[0].creator_answer, null); // Answer wiped from active locked state

  // Re-lock creator answer
  await db.query(`
    SELECT public.bonded_lock_reveal_answer(
      $1, 1, $2::jsonb, true, $3, NULL, $4
    )
  `, [testCode, JSON.stringify({ main: "How comfortable quiet moments are with you." }), deletionHash, creatorId]);

  // 6. Partner locks their answer -> Establishes ELIGIBILITY!
  const lockPartnerRes = await db.query<{ res: { success: boolean; status: string; is_eligible: boolean } }>(`
    SELECT public.bonded_lock_reveal_answer(
      $1, 1, $2::jsonb, false, NULL, $3, NULL
    ) as res
  `, [testCode, JSON.stringify({ main: "The way you smile whenever you see me walk in." }), partnerHash]);

  assert.equal(lockPartnerRes.rows[0].res.status, "eligible");
  assert.equal(lockPartnerRes.rows[0].res.is_eligible, true);

  // Impostor check: Stranger cannot lock or confirm on behalf of partner
  await assert.rejects(
    async () => {
      await db.query(`
        SELECT public.bonded_confirm_reveal(
          $1, 1, false, NULL, $2, NULL
        )
      `, [testCode, impostorHash]);
    },
    /One person cannot answer as the other/
  );

  // 7. Now that eligibility is achieved, both answers can be verified and revealed
  const eligibleCheck = await db.query<{ res: { reveal: { is_eligible: boolean; partner_answer: { main: string } } } }>(`
    SELECT public.bonded_get_template_reveal($1, NULL, $2, NULL) as res
  `, [testCode, partnerHash]);
  assert.equal(eligibleCheck.rows[0].res.reveal.is_eligible, true);
  assert.equal(
    eligibleCheck.rows[0].res.reveal.partner_answer.main,
    "How comfortable quiet moments are with you."
  );

  // 8. Partner confirms reveal
  const confirmRes = await db.query<{ res: { success: boolean; status: string } }>(`
    SELECT public.bonded_confirm_reveal(
      $1, 1, false, NULL, $2, NULL
    ) as res
  `, [testCode, partnerHash]);
  assert.equal(confirmRes.rows[0].res.status, "revealed");

  // Verify that once revealed, withdrawal is forbidden (Information already seen cannot be made unseen)
  await assert.rejects(
    async () => {
      await db.query(`
        SELECT public.bonded_withdraw_reveal_answer(
          $1, 1, false, NULL, $2, NULL
        )
      `, [testCode, partnerHash]);
    },
    /cannot be unseen/
  );

  // 9. Revision Protection: Editing prompt bumps revision
  await db.query(`
    UPDATE public.couple_templates SET
      tools = $1::jsonb
    WHERE short_code = $2
  `, [
    JSON.stringify([
      {
        id: "reveal_t06",
        type: "private_reveal",
        prompt: "Revised prompt question?",
        countdownSeconds: 5,
      },
    ]),
    testCode,
  ]);

  const bumpedDb = await db.query<DbRevealRow>(
    "SELECT * FROM public.template_private_reveals WHERE tool_id = 'reveal_t06'"
  );
  assert.equal(bumpedDb.rows[0].revision, 2);
  assert.equal(bumpedDb.rows[0].status, "open"); // Reset to open for new round
});
