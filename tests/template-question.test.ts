import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash, randomBytes } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import {
  questionItemSchema,
  questionToolSchema,
  saveQuestionDraftSchema,
  submitQuestionAnswersSchema,
  templateInputSchema,
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

const testCode = "testquestions";

interface DbQuestionCardRow {
  id: string;
  template_id: string;
  title: string;
  revision: number;
  status: string;
  questions: Array<{ id: string; prompt: string; type: string; skippable: boolean; sender_answer?: string }>;
  partner_token_hash: string | null;
}

interface DbSubmissionRow {
  id: string;
  author_role: string;
  question_revision: number;
  is_draft: boolean;
  answers: Record<string, { question_id: string; answer_text?: string; selected_choice?: string; skipped: boolean }>;
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
      await db.query("insert into public.couples(id,couple_code,partner_1_id,partner_2_id) values($1,'LOVE-QUESTPAIR',$2,$3)", [pair, creatorId, strangerId]);
      await db.query("insert into public.time_capsules(id,couple_id,creator_id,title,unlock_date,letter,seal_mode) values($1,$2,$3,'Test capsule','2000-01-01',$4::jsonb,'solo')", [solo, pair, creatorId, JSON.stringify({ body: "secret" })]);
    }
    await db.exec(await fs.readFile("supabase/migrations/" + migration, "utf8"));
  }
});

after(async () => {
  await db.close();
});

test("T05: Question schemas validate 1–5 questions, question types, and draft/submit bounds", () => {
  // 1. Single question schema
  const shortQ = questionItemSchema.safeParse({
    id: "q_1",
    prompt: "What is your favourite dessert?",
    type: "short",
    skippable: true,
  });
  assert.equal(shortQ.success, true);

  const choiceQ = questionItemSchema.safeParse({
    id: "q_2",
    prompt: "Where should our next vacation be?",
    type: "choice",
    options: ["Beach resort", "Mountain cabin", "Historic city"],
    skippable: false,
    sender_answer: "Mountain cabin",
  });
  assert.equal(choiceQ.success, true);

  // Reject empty prompt
  assert.equal(questionItemSchema.safeParse({ id: "q_x", prompt: "", type: "short" }).success, false);

  // 2. Question tool schema
  const validTool = {
    id: "question_t05",
    type: "question",
    enabled: true,
    title: "A few fun questions",
    description: "No rush!",
    questions: [
      { id: "q_1", prompt: "Question 1", type: "short", skippable: true },
      { id: "q_2", prompt: "Question 2", type: "long", skippable: true },
    ],
  };
  assert.equal(questionToolSchema.safeParse(validTool).success, true);

  // Reject empty questions array (<1)
  assert.equal(questionToolSchema.safeParse({ ...validTool, questions: [] }).success, false);

  // Reject > 5 questions
  assert.equal(
    questionToolSchema.safeParse({
      ...validTool,
      questions: [
        { id: "1", prompt: "1", type: "short" },
        { id: "2", prompt: "2", type: "short" },
        { id: "3", prompt: "3", type: "short" },
        { id: "4", prompt: "4", type: "short" },
        { id: "5", prompt: "5", type: "short" },
        { id: "6", prompt: "6", type: "short" },
      ],
    }).success,
    false
  );

  // 3. Template input schema accepts question tool
  assert.equal(
    templateInputSchema.safeParse({
      scene_index: 1,
      partner_name: "Aria",
      partner_from: "Leo",
      message: "Here are some questions for you",
      has_media: false,
      media_items: [],
      expiry_hours: 48,
      tools: [validTool],
    }).success,
    true
  );

  // 4. Draft schema
  assert.equal(
    saveQuestionDraftSchema.safeParse({
      expected_revision: 1,
      answers: {
        q_1: { question_id: "q_1", answer_text: "Chocolate lava cake", skipped: false },
      },
    }).success,
    true
  );

  // 5. Submit schema
  assert.equal(
    submitQuestionAnswersSchema.safeParse({
      expected_revision: 1,
      answers: {
        q_1: { question_id: "q_1", answer_text: "Chocolate lava cake", skipped: false },
        q_2: { question_id: "q_2", skipped: true },
      },
    }).success,
    true
  );
});

test("T05: Question Card lifecycle: Sync trigger, draft isolation, skippable questions, review before submit & version protection", async () => {
  const initialQuestions = [
    {
      id: "q_memory",
      prompt: "What is your favorite memory of us?",
      type: "long",
      skippable: true,
      sender_answer: "When we got caught in the summer rain in Kyoto.",
      reveal_mode: "after_partner_answers",
    },
    {
      id: "q_food",
      prompt: "What are you craving right now?",
      type: "short",
      skippable: true,
      sender_answer: "Matcha ice cream",
      reveal_mode: "after_partner_answers",
    },
  ];

  // 1. Insert template with question tool
  await db.query(`
    INSERT INTO public.couple_templates (
      owner_id, short_code, theme, scene_index, partner_name, partner_from,
      message, has_media, media_items, expires_at, deletion_hash, tools
    ) VALUES (
      $1, $2, 'anime', 0, 'Aria', 'Leo', 'Questions for you', false, '[]'::jsonb,
      now() + interval '5 days', $3,
      $4::jsonb
    )
  `, [
    creatorId,
    testCode,
    deletionHash,
    JSON.stringify([
      {
        id: "question_t05",
        type: "question",
        title: "Couple questions",
        description: "Answer when you are ready",
        questions: initialQuestions,
      },
    ]),
  ]);

  // 2. Trigger check: template_question_cards initialized with revision 1
  const cardRes = await db.query<DbQuestionCardRow>(
    "SELECT * FROM public.template_question_cards WHERE tool_id = 'question_t05'"
  );
  assert.equal(cardRes.rows.length, 1);
  assert.equal(cardRes.rows[0].revision, 1);
  assert.equal(cardRes.rows[0].status, "open");

  // 3. Sender answer secrecy: Partner fetching before submission CANNOT see sender_answer
  const partnerPreGet = await db.query<{ res: { success: boolean; card: { questions: Array<{ sender_answer?: string }> } } }>(`
    SELECT public.bonded_get_template_questions($1, NULL, $2, NULL) as res
  `, [testCode, partnerHash]);
  const preQuestions = partnerPreGet.rows[0].res.card.questions;
  assert.equal(preQuestions[0].sender_answer, undefined); // Stripped!
  assert.equal(preQuestions[1].sender_answer, undefined); // Stripped!

  // Creator fetching DOES see sender_answer
  const creatorPreGet = await db.query<{ res: { success: boolean; card: { questions: Array<{ sender_answer?: string }> } } }>(`
    SELECT public.bonded_get_template_questions($1, $2, NULL, NULL) as res
  `, [testCode, deletionHash]);
  assert.equal(
    creatorPreGet.rows[0].res.card.questions[0].sender_answer,
    "When we got caught in the summer rain in Kyoto."
  );

  // 4. Partner saves a draft (partial answer)
  const draftRes = await db.query<{ res: { success: boolean; is_draft: boolean } }>(`
    SELECT public.bonded_save_question_draft(
      $1, 1, $2::jsonb, false, NULL, $3, NULL
    ) as res
  `, [
    testCode,
    JSON.stringify({
      q_memory: { question_id: "q_memory", answer_text: "Our stargazing picnic", skipped: false },
    }),
    partnerHash,
  ]);
  assert.equal(draftRes.rows[0].res.success, true);
  assert.equal(draftRes.rows[0].res.is_draft, true);

  // Verify DB contains draft
  const draftDb = await db.query<DbSubmissionRow>(
    "SELECT * FROM public.template_question_submissions WHERE author_role = 'partner' AND is_draft = true"
  );
  assert.equal(draftDb.rows.length, 1);
  assert.equal(draftDb.rows[0].answers.q_memory.answer_text, "Our stargazing picnic");

  // CRITICAL SPEC REQUIREMENT: Drafts are visible ONLY to their author.
  // Creator fetching questions DOES NOT receive partner's draft!
  const creatorGetDraftCheck = await db.query<{ res: { partner_submission: unknown } }>(`
    SELECT public.bonded_get_template_questions($1, $2, NULL, NULL) as res
  `, [testCode, deletionHash]);
  assert.equal(creatorGetDraftCheck.rows[0].res.partner_submission, null); // Protected!

  // Partner fetching DOES retrieve their draft to resume without loss
  const partnerResumeGet = await db.query<{ res: { my_draft: Record<string, { answer_text: string }> } }>(`
    SELECT public.bonded_get_template_questions($1, NULL, $2, NULL) as res
  `, [testCode, partnerHash]);
  assert.equal(partnerResumeGet.rows[0].res.my_draft.q_memory.answer_text, "Our stargazing picnic");

  // 5. Partner submits final answers with one answered and one SKIPPED
  const submitRes = await db.query<{ res: { success: boolean } }>(`
    SELECT public.bonded_submit_question_answers(
      $1, 1, $2::jsonb, false, NULL, $3, NULL
    ) as res
  `, [
    testCode,
    JSON.stringify({
      q_memory: { question_id: "q_memory", answer_text: "Our stargazing picnic", skipped: false },
      q_food: { question_id: "q_food", skipped: true }, // Skipped without penalty!
    }),
    partnerHash,
  ]);
  assert.equal(submitRes.rows[0].res.success, true);

  // Verify draft was cleaned up and submitted row exists
  const postSubmitDraft = await db.query<DbSubmissionRow>(
    "SELECT * FROM public.template_question_submissions WHERE author_role = 'partner' AND is_draft = true"
  );
  assert.equal(postSubmitDraft.rows.length, 0); // Draft cleared

  const submittedDb = await db.query<DbSubmissionRow>(
    "SELECT * FROM public.template_question_submissions WHERE author_role = 'partner' AND is_draft = false"
  );
  assert.equal(submittedDb.rows.length, 1);
  assert.equal(submittedDb.rows[0].answers.q_food.skipped, true); // Skipped remains valid

  // 6. Creator can now see partner's submitted answers
  const creatorPostGet = await db.query<{ res: { partner_submission: { answers: Record<string, { skipped: boolean; answer_text?: string }> } } }>(`
    SELECT public.bonded_get_template_questions($1, $2, NULL, NULL) as res
  `, [testCode, deletionHash]);
  assert.notEqual(creatorPostGet.rows[0].res.partner_submission, null);
  assert.equal(
    creatorPostGet.rows[0].res.partner_submission.answers.q_memory.answer_text,
    "Our stargazing picnic"
  );
  assert.equal(creatorPostGet.rows[0].res.partner_submission.answers.q_food.skipped, true);

  // And partner can now see the revealed sender_answer!
  const partnerPostGet = await db.query<{ res: { card: { questions: Array<{ sender_answer?: string }> } } }>(`
    SELECT public.bonded_get_template_questions($1, NULL, $2, NULL) as res
  `, [testCode, partnerHash]);
  assert.equal(
    partnerPostGet.rows[0].res.card.questions[0].sender_answer,
    "When we got caught in the summer rain in Kyoto."
  );

  // 7. Impostor attempt: another person cannot submit as this partner
  await assert.rejects(
    async () => {
      await db.query(`
        SELECT public.bonded_submit_question_answers(
          $1, 1, $2::jsonb, false, NULL, $3, NULL
        )
      `, [testCode, JSON.stringify({ q_memory: { question_id: "q_memory", answer_text: "Hacked", skipped: false } }), impostorHash]);
    },
    /One person cannot answer as the other/
  );

  // 8. Version protection: Editing published questions bumps revision
  const revisedQuestions = [
    ...initialQuestions,
    { id: "q_3", prompt: "What song reminds you of us?", type: "short", skippable: true },
  ];

  await db.query(`
    UPDATE public.couple_templates SET
      tools = $1::jsonb
    WHERE short_code = $2
  `, [
    JSON.stringify([
      {
        id: "question_t05",
        type: "question",
        title: "Couple questions v2",
        description: "New question added",
        questions: revisedQuestions,
      },
    ]),
    testCode,
  ]);

  const bumpedCard = await db.query<DbQuestionCardRow>(
    "SELECT * FROM public.template_question_cards WHERE tool_id = 'question_t05'"
  );
  assert.equal(bumpedCard.rows[0].revision, 2); // Revision bumped to 2!

  // Attempting to submit with old revision 1 is rejected with 40001
  await assert.rejects(
    async () => {
      await db.query(`
        SELECT public.bonded_submit_question_answers(
          $1, 1, $2::jsonb, false, NULL, $3, NULL
        )
      `, [testCode, JSON.stringify({ q_memory: { question_id: "q_memory", skipped: true } }), partnerHash]);
    },
    /Stale question revision/
  );

  // Old submission for revision 1 remains intact and is NOT overwritten or reinterpreted!
  const oldSub = await db.query<DbSubmissionRow>(
    "SELECT * FROM public.template_question_submissions WHERE author_role = 'partner' AND question_revision = 1 AND is_draft = false"
  );
  assert.equal(oldSub.rows.length, 1);
  assert.equal(oldSub.rows[0].answers.q_memory.answer_text, "Our stargazing picnic");
});
