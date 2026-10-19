import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import {
  pollOptionSchema,
  pollToolSchema,
  resolvePollSchema,
  templateInputSchema,
  votePollSchema,
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

const testCodePartnerChooses = "testpollpartner";
const testCodeBothVote = "testpollbothv";

interface DbPollRow {
  id: string;
  question: string;
  selection_mode: string;
  status: string;
  revision: number;
  options: Array<{ id: string; text: string; image_url?: string }>;
  custom_suggestions: Array<{ id: string; text: string; suggested_by: string }>;
  creator_votes: string[];
  partner_votes: string[];
  partner_token_hash: string | null;
  resolved_option_id: string | null;
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
      await db.query("insert into public.couples(id,couple_code,partner_1_id,partner_2_id) values($1,'LOVE-POLLPAIR',$2,$3)", [pair, creatorId, strangerId]);
      await db.query("insert into public.time_capsules(id,couple_id,creator_id,title,unlock_date,letter,seal_mode) values($1,$2,$3,'Test capsule','2000-01-01',$4::jsonb,'solo')", [solo, pair, creatorId, JSON.stringify({ body: "secret" })]);
    }
    await db.exec(await fs.readFile("supabase/migrations/" + migration, "utf8"));
  }
});

after(async () => {
  await db.close();
});

test("pollOptionSchema, pollToolSchema and votePollSchema validation", () => {
  // Option validation
  assert.equal(pollOptionSchema.safeParse({ id: "opt_1", text: "Sushi" }).success, true);
  assert.equal(pollOptionSchema.safeParse({ id: "opt_1", text: "" }).success, false);

  // Poll tool validation
  const validPoll = {
    id: "poll_t04",
    type: "poll",
    enabled: true,
    question: "What cuisine are we getting tonight?",
    description: "Pick your craving",
    selectionMode: "both_vote",
    allowMultiple: false,
    allowCustomSuggestion: true,
    options: [
      { id: "opt_1", text: "Sushi" },
      { id: "opt_2", text: "Italian Pasta" },
    ],
  };

  assert.equal(pollToolSchema.safeParse(validPoll).success, true);

  // Reject < 2 options
  assert.equal(
    pollToolSchema.safeParse({ ...validPoll, options: [{ id: "opt_1", text: "Sushi" }] }).success,
    false
  );

  // Reject > 6 options
  assert.equal(
    pollToolSchema.safeParse({
      ...validPoll,
      options: [
        { id: "1", text: "1" },
        { id: "2", text: "2" },
        { id: "3", text: "3" },
        { id: "4", text: "4" },
        { id: "5", text: "5" },
        { id: "6", text: "6" },
        { id: "7", text: "7" },
      ],
    }).success,
    false
  );

  // Template input schema accepts poll tool
  const templateInput = {
    scene_index: 0,
    partner_name: "Aria",
    partner_from: "Leo",
    message: "Let's plan our dinner!",
    has_media: false,
    media_items: [],
    expiry_hours: 48,
    tools: [validPoll],
  };
  assert.equal(templateInputSchema.safeParse(templateInput).success, true);

  // Vote poll schema validation
  assert.equal(
    votePollSchema.safeParse({
      expected_revision: 1,
      selected_option_ids: ["opt_1"],
    }).success,
    true
  );

  // Vote with custom suggestion only
  assert.equal(
    votePollSchema.safeParse({
      expected_revision: 1,
      selected_option_ids: [],
      custom_suggestion_text: "Homemade Ramen",
    }).success,
    true
  );

  // Empty vote rejected
  assert.equal(
    votePollSchema.safeParse({
      expected_revision: 1,
      selected_option_ids: [],
    }).success,
    false
  );

  // Manual tie resolve schema
  assert.equal(resolvePollSchema.safeParse({ agreed_option_id: "opt_2" }).success, true);
  assert.equal(resolvePollSchema.safeParse({ agreed_option_id: "" }).success, false);
});

test("T04: Partner Chooses mode lifecycle (Immediate decision, vote changes, impostor prevention)", async () => {
  const options = [
    { id: "opt_ramen", text: "Tonkotsu Ramen" },
    { id: "opt_tacos", text: "Street Tacos" },
    { id: "opt_pizza", text: "Wood-fired Pizza" },
  ];

  // 1. Insert couple template with partner_chooses poll
  await db.query(`
    INSERT INTO public.couple_templates (
      owner_id, short_code, theme, scene_index, partner_name, partner_from,
      message, has_media, media_items, expires_at, deletion_hash, tools
    ) VALUES (
      $1, $2, 'anime', 0, 'Aria', 'Leo', 'Dinner time!', false, '[]'::jsonb,
      now() + interval '5 days', $3,
      $4::jsonb
    )
  `, [
    creatorId,
    testCodePartnerChooses,
    deletionHash,
    JSON.stringify([
      {
        id: "poll_t04",
        type: "poll",
        question: "Where are we eating tonight?",
        description: "Your pick!",
        selectionMode: "partner_chooses",
        allowMultiple: false,
        allowCustomSuggestion: true,
        options,
      },
    ]),
  ]);

  // 2. Trigger verification
  const pollRes = await db.query<DbPollRow>(
    "SELECT * FROM public.template_polls WHERE tool_id = 'poll_t04' AND selection_mode = 'partner_chooses'"
  );
  assert.equal(pollRes.rows.length, 1);
  const row = pollRes.rows[0];
  assert.equal(row.selection_mode, "partner_chooses");
  assert.equal(row.status, "open");
  assert.equal(row.resolved_option_id, null);

  // 3. Partner votes for Ramen -> Immediately resolved in partner_chooses mode
  const voteRes = await db.query<{ res: { success: boolean; resolved_option_id: string; has_agreement: boolean } }>(`
    SELECT public.bonded_vote_template_poll(
      $1, 1, $2::jsonb, false, NULL, $3, NULL, NULL
    ) as res
  `, [testCodePartnerChooses, JSON.stringify(["opt_ramen"]), partnerHash]);

  const voteData = voteRes.rows[0].res;
  assert.equal(voteData.success, true);
  assert.equal(voteData.resolved_option_id, "opt_ramen");
  assert.equal(voteData.has_agreement, true);

  // Verify DB state
  const updatedPoll = await db.query<DbPollRow>(
    "SELECT * FROM public.template_polls WHERE tool_id = 'poll_t04' AND selection_mode = 'partner_chooses'"
  );
  assert.equal(updatedPoll.rows[0].status, "resolved");
  assert.equal(updatedPoll.rows[0].resolved_option_id, "opt_ramen");
  assert.equal(updatedPoll.rows[0].partner_token_hash, partnerHash);

  // 4. Partner changes mind before closure -> can change vote to Tacos
  const changeRes = await db.query<{ res: { success: boolean; resolved_option_id: string } }>(`
    SELECT public.bonded_vote_template_poll(
      $1, 1, $2::jsonb, false, NULL, $3, NULL, NULL
    ) as res
  `, [testCodePartnerChooses, JSON.stringify(["opt_tacos"]), partnerHash]);
  assert.equal(changeRes.rows[0].res.resolved_option_id, "opt_tacos");

  // 5. Impostor attempt: Another person trying to vote as the partner is rejected
  await assert.rejects(
    async () => {
      await db.query(`
        SELECT public.bonded_vote_template_poll(
          $1, 1, $2::jsonb, false, NULL, $3, NULL, NULL
        )
      `, [testCodePartnerChooses, JSON.stringify(["opt_pizza"]), impostorHash]);
    },
    /One person cannot vote as the other/
  );
});

test("T04: Both Vote mode (Ties remain unresolved with no automatic winner, manual agreement step, custom suggestion)", async () => {
  const options = [
    { id: "opt_film_action", text: "Action Movie" },
    { id: "opt_film_comedy", text: "Comedy Special" },
    { id: "opt_film_romance", text: "Anime Romance" },
  ];

  // 1. Insert couple template with both_vote poll
  await db.query(`
    INSERT INTO public.couple_templates (
      owner_id, short_code, theme, scene_index, partner_name, partner_from,
      message, has_media, media_items, expires_at, deletion_hash, tools
    ) VALUES (
      $1, $2, 'anime', 0, 'Aria', 'Leo', 'Movie night!', false, '[]'::jsonb,
      now() + interval '5 days', $3,
      $4::jsonb
    )
  `, [
    creatorId,
    testCodeBothVote,
    deletionHash,
    JSON.stringify([
      {
        id: "poll_t04",
        type: "poll",
        question: "What are we watching?",
        description: "Vote together!",
        selectionMode: "both_vote",
        allowMultiple: false,
        allowCustomSuggestion: true,
        options,
      },
    ]),
  ]);

  // 2. Creator votes for Anime Romance
  const creatorVote = await db.query<{ res: { success: boolean; resolved_option_id: string | null; has_agreement: boolean } }>(`
    SELECT public.bonded_vote_template_poll(
      $1, 1, $2::jsonb, true, $3, NULL, $4, NULL
    ) as res
  `, [testCodeBothVote, JSON.stringify(["opt_film_romance"]), deletionHash, creatorId]);
  assert.equal(creatorVote.rows[0].res.success, true);
  assert.equal(creatorVote.rows[0].res.has_agreement, false);
  assert.equal(creatorVote.rows[0].res.resolved_option_id, null);

  // 3. Partner votes for Action Movie (Disagreement!)
  const partnerVote = await db.query<{ res: { success: boolean; resolved_option_id: string | null; has_agreement: boolean } }>(`
    SELECT public.bonded_vote_template_poll(
      $1, 1, $2::jsonb, false, NULL, $3, NULL, NULL
    ) as res
  `, [testCodeBothVote, JSON.stringify(["opt_film_action"]), partnerHash]);

  // SPEC REQUIREMENT: For two people, a disagreement has no automatic majority winner.
  // Ties remain unresolved.
  assert.equal(partnerVote.rows[0].res.success, true);
  assert.equal(partnerVote.rows[0].res.has_agreement, false);
  assert.equal(partnerVote.rows[0].res.resolved_option_id, null);

  const tieDb = await db.query<DbPollRow>(
    "SELECT * FROM public.template_polls WHERE tool_id = 'poll_t04' AND selection_mode = 'both_vote'"
  );
  assert.equal(tieDb.rows[0].status, "open"); // Remains open!
  assert.equal(tieDb.rows[0].resolved_option_id, null); // Unresolved!

  // 4. Stale Revision Protection: voting with wrong revision throws 40001
  await assert.rejects(
    async () => {
      await db.query(`
        SELECT public.bonded_vote_template_poll(
          $1, 999, $2::jsonb, false, NULL, $3, NULL, NULL
        )
      `, [testCodeBothVote, JSON.stringify(["opt_film_comedy"]), partnerHash]);
    },
    /Stale poll revision/
  );

  // 5. Selecting unoffered option throws error
  await assert.rejects(
    async () => {
      await db.query(`
        SELECT public.bonded_vote_template_poll(
          $1, 1, $2::jsonb, false, NULL, $3, NULL, NULL
        )
      `, [testCodeBothVote, JSON.stringify(["opt_fake_option"]), partnerHash]);
    },
    /not valid for this poll/
  );

  // 6. Manual agreement step for ties or different choices
  // Non-creator cannot manually resolve
  await assert.rejects(
    async () => {
      await db.query(`
        SELECT public.bonded_resolve_poll_manually($1, 'opt_film_action', NULL, NULL)
      `, [testCodeBothVote]);
    },
    /Not authorized to resolve this poll/
  );

  // Creator can manually agree on Action Movie
  const manualResolve = await db.query<{ res: { success: boolean; resolved_option_id: string } }>(`
    SELECT public.bonded_resolve_poll_manually($1, 'opt_film_action', $2, NULL) as res
  `, [testCodeBothVote, deletionHash]);
  assert.equal(manualResolve.rows[0].res.success, true);
  assert.equal(manualResolve.rows[0].res.resolved_option_id, "opt_film_action");

  const resolvedDb = await db.query<DbPollRow>(
    "SELECT * FROM public.template_polls WHERE tool_id = 'poll_t04' AND selection_mode = 'both_vote'"
  );
  assert.equal(resolvedDb.rows[0].status, "resolved");
  assert.equal(resolvedDb.rows[0].resolved_option_id, "opt_film_action");

  // 7. Custom suggestion capability: Partner suggests an unlisted movie
  const customRes = await db.query<{ res: { success: boolean } }>(`
    SELECT public.bonded_vote_template_poll(
      $1, 1, '[]'::jsonb, false, NULL, $2, NULL, 'Spirited Away'
    ) as res
  `, [testCodeBothVote, partnerHash]);
  assert.equal(customRes.rows[0].res.success, true);

  const customDb = await db.query<DbPollRow>(
    "SELECT * FROM public.template_polls WHERE tool_id = 'poll_t04' AND selection_mode = 'both_vote'"
  );
  assert.equal(customDb.rows[0].custom_suggestions.length, 1);
  assert.equal(customDb.rows[0].custom_suggestions[0].text, "Spirited Away");
  assert.match(customDb.rows[0].partner_votes[0], /^custom_/);
});
