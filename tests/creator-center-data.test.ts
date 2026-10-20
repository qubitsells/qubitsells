import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { loadCreatorCenter } from "../lib/server/creator-center";

type Row = Record<string, unknown>;
const actor = "aaaaaaaa-3333-4333-8333-333333333333";
const privateHash = "a".repeat(64);
const now = Date.now();
const date = (offset: number) => new Date(now + offset).toISOString();

function fixtures(): Record<string, Row[]> {
  return {
    couple_templates: [{ id: "gift", short_code: "gift-code", owner_id: actor, deletion_hash: privateHash,
      partner_name: "Sam", partner_from: "Alex", theme: "our-little-pink-day", scene_index: 0,
      created_at: date(-86400000), expires_at: date(86400000), view_count: 5, deleting: false, tools: [] },
      { id: "stranger", short_code: "public-but-not-owned", owner_id: "another-person", deletion_hash: "b".repeat(64), expires_at: date(86400000) }],
    template_replies: [{ id: "reply", template_id: "gift", tool_id: "reply_t01", author_name: "Sam", message: "A full message", reaction: "💙", created_at: date(-1000), media_items: [{ url: "/api/media/voice?template=wrong", type: "audio", duration: 12, public_id: "voice" }] }],
    template_invitations: [{ template_id: "gift", id: "inv", activity: "Dinner", invitation_message: "Join me", format: "in_person", duration_minutes: 90,
      status: "counterproposed", selected_slot: { id: "slot", start_time: date(8640000), end_time: date(9000000), label: "After work" },
      counterproposal_slot: { id: "counter", start_time: date(9500000), label: "A later dinner" }, recipient_note: "Can we meet later?", recipient_timezone: "Asia/Karachi",
      recipient_response: "counterproposed", responded_at: date(-1000), sender_timezone: "Europe/London", date_mode: "slots" }],
    template_polls: [{ template_id: "gift", id: "poll", question: "Where shall we go?", selection_mode: "both_vote", status: "resolved", options: [{ id: "one", text: "The park", image_url: "/api/media/park" }],
      partner_votes: ["custom"], creator_votes: ["custom"], resolved_option_id: "custom", custom_suggestions: [{ id: "custom", text: "The beach", suggested_by: "partner", created_at: date(-1000) }] }],
    template_question_cards: [{ id: "questions", template_id: "gift", tool_id: "question_t05", title: "Tell me more", questions: [{ id: "q", prompt: "Your favourite memory?", type: "long" }] }],
    template_question_submissions: [{ template_id: "gift", tool_id: "question_t05", author_role: "partner", is_draft: false, submitted_at: date(-1000), answers: { q: { question_id: "q", answer_text: "Our first trip", skipped: false } } },
      { template_id: "gift", tool_id: "question_t05", author_role: "partner", is_draft: true, submitted_at: date(0), answers: { q: { answer_text: "SECRET DRAFT" } } }],
    template_private_reveals: [{ id: "reveal", template_id: "gift", prompt: "Our dream", questions: [{ id: "extra", prompt: "Another dream" }], status: "revealed", partner_answer: { main: "A home together", extra: "A long trip" }, partner_draft: { main: "SECRET DRAFT" }, partner_token_hash: "SECRET HASH", revealed_at: date(-1000) }],
    template_coupons: [{ id: "coupon", template_id: "gift", title: "A breakfast", description: "On me", status: "cancelled", request_note: "Pancakes, please", requested_at: date(-3000), preferred_date: date(8640000), cancelled_at: date(-1000), cancel_reason: "A change of plans" }],
    template_open_when_letters: [{ id: "letters", template_id: "gift", title: "For later", envelopes: [{ id: "letter", occasion: "When you miss me" }], opened_envelopes: { letter: { opened_at: date(-1000) } } }],
    template_our_story: [{ id: "story", template_id: "gift", title: "Our story", cards: [], partner_contribution: { author_name: "Sammy", caption: "The best afternoon", photo_url: "/api/media/memory", date: "2026-10-18", created_at: date(-1000), partner_token_hash: "SECRET HASH" } }],
    template_bucket_list: [{ id: "bucket", template_id: "gift", title: "Our list", items: [{ id: "trip", title: "See the sea", note: "A weekend away", created_by: "partner", created_at: date(-3000), status: "completed", partner_interested: true, completed_at: date(-1000), memory_note: "We finally went", memory_photo_url: "/api/media/bucket-photo" }] }],
  };
}

function database(rows: Record<string, Row[]>, failingTable?: string) {
  const requests: URL[] = [];
  const client = createClient("https://creator-check.invalid", "fixture-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async input => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      requests.push(url);
      const table = url.pathname.split("/").pop()!;
      if (table === failingTable) return new Response(JSON.stringify({ message: "Unavailable" }), { status: 503, headers: { "Content-Type": "application/json" } });
      const offset = Number(url.searchParams.get("offset")) || 0;
      const limit = Number(url.searchParams.get("limit")) || 500;
      // Deliberately include extra rows: the loader must enforce its boundary
      // even if a transport returns unfiltered fixtures.
      return new Response(JSON.stringify((rows[table] || []).slice(offset, offset + limit)), { headers: { "Content-Type": "application/json" } });
    } },
  });
  return { client, requests };
}

test("creator collection returns every saved receiver field with readable context and media access", async () => {
  const { client, requests } = database(fixtures());
  const gifts = await loadCreatorCenter(client, actor, [], now);
  assert.equal(gifts.length, 1);
  const gift = gifts[0];
  assert.equal(gift.invitation?.activity_title, "Dinner");
  assert.equal(gift.invitation?.confirmed_slot?.label, "After work");
  assert.equal(gift.invitation?.counter_proposal_slot?.label, "A later dinner");
  assert.equal(gift.invitation?.recipient_timezone, "Asia/Karachi");
  assert.equal(gift.invitation?.partner_counter_note, "Can we meet later?");
  assert.equal(gift.invitation?.responded_at, date(-1000));
  assert.equal(gift.questions?.partner_submission?.answers.q.answer_text, "Our first trip");
  assert.equal(gift.poll?.custom_suggestions?.[0].text, "The beach");
  assert.deepEqual(gift.poll?.partner_votes, ["custom"]);
  assert.equal(gift.reveal?.partner_answer?.extra, "A long trip");
  assert.equal(gift.coupon?.preferred_date, date(8640000));
  assert.equal(gift.coupon?.cancel_reason, "A change of plans");
  assert.equal(gift.open_when?.envelopes[0].label, "When you miss me");
  assert.equal(gift.open_when?.envelopes[0].opened_at, date(-1000));
  assert.equal(gift.our_story?.partner_author_name, "Sammy");
  assert.equal(gift.our_story?.partner_memory_date, "2026-10-18");
  assert.equal(gift.our_story?.partner_contributed_at, date(-1000));
  assert.equal(gift.bucket_list?.items[0].memory_note, "We finally went");
  for (const url of [gift.replies[0].media_items[0].url, gift.our_story?.partner_photo_url, gift.bucket_list?.items[0].memory_photo_url, gift.poll?.options[0].image_url]) {
    assert.equal(new URL(url!, "https://app.invalid").searchParams.get("template"), "gift-code");
  }
  assert.ok(!JSON.stringify(gifts).includes("SECRET"));
  assert.ok(!JSON.stringify(gifts).includes(privateHash));
  const submissionQuery = requests.find(url => url.pathname.endsWith("template_question_submissions"))!;
  assert.equal(submissionQuery.searchParams.get("is_draft"), "eq.false");
  assert.equal(submissionQuery.searchParams.get("author_role"), "eq.partner");
  assert.ok(requests.slice(1).every(url => url.searchParams.get("template_id") === "in.(gift)"));
});

test("receiver drafts and unrevealed answers never leave the server", async () => {
  const rows = fixtures();
  rows.template_private_reveals[0].status = "eligible";
  rows.template_private_reveals[0].partner_answer = { main: "SECRET LOCKED ANSWER" };
  rows.template_question_submissions = rows.template_question_submissions.filter(row => row.is_draft);
  const { client } = database(rows);
  const [gift] = await loadCreatorCenter(client, actor, [], now);
  assert.equal(gift.reveal?.partner_answer, null);
  assert.equal(gift.questions?.partner_submission, undefined);
  assert.ok(!JSON.stringify(gift).includes("SECRET"));
});

test("expired and deleting gifts omit every receiver interaction and skip response queries", async () => {
  for (const deleting of [false, true]) {
    const rows = fixtures();
    rows.couple_templates[0].expires_at = deleting ? date(8640000) : date(-1000);
    rows.couple_templates[0].deleting = deleting;
    const { client, requests } = database(rows);
    const [gift] = await loadCreatorCenter(client, actor, [], now);
    assert.equal(gift.is_expired, true);
    assert.deepEqual(gift.replies, []);
    for (const key of ["invitation", "poll", "questions", "reveal", "coupon", "open_when", "our_story", "bucket_list"] as const) assert.equal(gift[key], null);
    assert.equal(requests.length, 1);
  }
});

test("guest access requires a matching private token hash, never a public short code", async () => {
  const { client, requests } = database(fixtures());
  assert.deepEqual(await loadCreatorCenter(client, null, [], now), []);
  assert.equal(requests.length, 0);
  const gifts = await loadCreatorCenter(client, null, [privateHash], now);
  assert.equal(gifts.length, 1);
  assert.equal(gifts[0].short_code, "gift-code");
  assert.ok(requests[0].searchParams.get("or")?.includes(`deletion_hash.in.(${privateHash})`));
  assert.ok(!requests[0].searchParams.get("or")?.includes("short_code"));
  const wrong = database(fixtures());
  assert.deepEqual(await loadCreatorCenter(wrong.client, null, ["f".repeat(64)], now), []);
  assert.equal(wrong.requests.length, 1);
});

test("response loading reports provider failures instead of silently dropping submitted details", async () => {
  const { client } = database(fixtures(), "template_question_submissions");
  await assert.rejects(loadCreatorCenter(client, actor, [], now), /Receiver responses unavailable/);
});

test("all saved replies are paged, including more than the provider's default page size", async () => {
  const rows = fixtures();
  rows.template_replies = Array.from({ length: 1205 }, (_, index) => ({ ...rows.template_replies[0], id: `reply-${index}`, message: `Message ${index}` }));
  const { client, requests } = database(rows);
  const [gift] = await loadCreatorCenter(client, actor, [], now);
  assert.equal(gift.replies.length, 1205);
  assert.ok(gift.replies.some(reply => reply.message === "Message 1204"));
  assert.equal(requests.filter(url => url.pathname.endsWith("template_replies")).length, 3);
});
