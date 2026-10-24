import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import type { CreatorTemplateItem } from "../lib/supabase/coupleTemplates";

// Render the actual client component in a separate process without the test
// suite's react-server condition. CSS is stubbed; no production data is used.
const renderScript = `
require('tsx/cjs');
require.extensions['.css'] = module => {
  module.exports = new Proxy({}, { get: (_, key) => key === '__esModule' ? false : String(key) });
};
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
const Details = require('./components/creator-center/ReceiverDetails.tsx').default;
process.stdout.write(renderToStaticMarkup(React.createElement(Details, {item: JSON.parse(process.argv[1])})));
`;
const render = (item: CreatorTemplateItem) => execFileSync(process.execPath, ["-e", renderScript, JSON.stringify(item)], { cwd: process.cwd(), encoding: "utf8", maxBuffer: 2 * 1024 * 1024 });

const fixture: CreatorTemplateItem = {
  id: "display", short_code: "display-code", partner_name: "Sam", partner_from: "Alex", theme: "our-little-pink-day", scene_index: 0,
  created_at: "2026-10-19T12:00:00Z", expires_at: "2099-10-22T12:00:00Z", view_count: 4, tools: [], is_expired: false, replies_purged: false, replies: [],
  invitation: { id: "inv", activity_title: "Dinner together", sender_message: "Join me", duration_minutes: 90, location_type: "in_person", status: "counterproposed", updated_at: "2026-10-20T12:00:00Z",
    partner_response_status: "counterproposed", partner_counter_note: "Let’s meet a little later", recipient_timezone: "Asia/Karachi", responded_at: "2026-10-20T12:00:00Z",
    confirmed_slot: {id: "slot", label: "After work", start_time: "2026-10-22T12:00:00Z"}, counter_proposal_slot: {id: "later", label: "A later dinner", start_time: "2026-10-22T14:00:00Z"} },
  poll: { id: "poll", question: "Where shall we go?", selection_mode: "both_vote", options: [{id: "park", text: "The park"}], partner_votes: ["beach"], creator_votes: ["beach"], resolved_option_id: "beach", status: "resolved", updated_at: "2026-10-20T12:00:00Z", custom_suggestions: [{id: "beach", text: "The beach", suggested_by: "partner", created_at: "2026-10-20T12:00:00Z"}] },
  questions: { id: "question", title: "Tell me more", questions: [{id: "one", prompt: "Your favourite memory?", type: "long", skippable: false}, {id: "two", prompt: "Tea or coffee?", type: "choice", skippable: false}, {id: "three", prompt: "An optional question", type: "short", skippable: true}], partner_submission: {is_draft: false, submitted_at: "2026-10-20T12:00:00Z", answers: {one: {question_id: "one", answer_text: "Our first trip <script>bad()</script>", skipped: false}, two: {question_id: "two", selected_choice: "Coffee", skipped: false}, three: {question_id: "three", skipped: true}}} },
  reveal: {id: "reveal", prompt: "Your dream?", status: "revealed", questions: [{id: "extra", prompt: "Another dream?"}], partner_answer: {main: "A home together", extra: "A trip around the world"}, revealed_at: "2026-10-20T12:00:00Z"},
  coupon: {id: "coupon", title: "Breakfast on me", description: "A treat", status: "requested", requested_at: "2026-10-20T12:00:00Z", preferred_date: "2026-10-24T12:00:00Z", partner_request_note: "Pancakes please", cancel_reason: "Plans changed"},
  open_when: {id: "letters", title: "Letters for later", envelopes: [{id: "opened", label: "When you miss me", opened_at: "2026-10-20T12:00:00Z"}, {id: "sealed", label: "For a rainy day"}]},
  our_story: {id: "story", title: "Our story", cards_count: 3, partner_caption: "The best afternoon", partner_author_name: "Sammy", partner_memory_date: "2026-10-18", partner_contributed_at: "2026-10-20T12:00:00Z", partner_photo_url: "/api/media/story?template=display-code"},
  bucket_list: {id: "bucket", title: "Places to go", items: [{id: "sea", title: "See the sea", note: "A weekend away", status: "completed", created_by: "partner", partner_interested: true, completed_at: "2026-10-20T12:00:00Z", memory_note: "We finally went", memory_photo_url: "/api/media/bucket?template=display-code"}]},
};

test("receiver details render actual answers, choices, dates, notes and memories, not just statuses", () => {
  const html = render(fixture);
  for (const text of ["Let’s meet a little later", "After work", "A later dinner", "Asia/Karachi", "Their suggested alternative",
    "The beach", "Selected by Sam", "Agreed choice", "Suggested by Sam", "Your favourite memory?", "Our first trip", "Coffee", "Skipped by the receiver",
    "A home together", "Another dream?", "A trip around the world", "Pancakes please", "Their preferred date", "Plans changed", "When you miss me", "Still sealed",
    "Sammy", "The best afternoon", "Memory date", "See the sea", "A weekend away", "We finally went", "api/media/story", "api/media/bucket"]) assert.ok(html.includes(text), `Missing submitted detail: ${text}`);
  assert.ok(html.includes("&lt;script&gt;bad()&lt;/script&gt;"));
  assert.ok(!html.includes("<script>bad()"));
});

test("display defends against stale private reveal data, drafts, and expired interactions", () => {
  const html = render({...fixture, reveal: {...fixture.reveal!, status: "waiting", partner_answer: {main: "SECRET REVEAL"}},
    questions: {...fixture.questions!, partner_submission: {is_draft: true, answers: {one: {question_id: "one", answer_text: "SECRET DRAFT", skipped: false}}}}});
  assert.ok(!html.includes("SECRET"));
  assert.ok(html.includes("Answers appear here after you both complete the reveal"));
  assert.ok(html.includes("Unfinished drafts stay private"));
  assert.equal(render({...fixture, is_expired: true}), "");
});

test("previously submitted answers remain visible when the current question list changes", () => {
  const html = render({...fixture, questions: {...fixture.questions!, questions: []}});
  assert.ok(html.includes("Earlier submitted answer"));
  assert.ok(html.includes("Our first trip"));
  assert.ok(html.includes("Coffee"));
});

test("My Creations shows checked and unchecked dates, activity choices, alternative ideas and sender confirmation", () => {
  const options = [{ id: "yes", start_time: "2027-11-05T15:00:00Z", label: "Dinner after work" }, { id: "no", start_time: "2027-11-06T15:00:00Z", label: "Saturday evening" }];
  const html = render({ ...fixture, invitation: { ...fixture.invitation!, status: "awaiting_confirmation", partner_response_status: "availability", confirmed_slot: null, counter_proposal_slot: null, proposed_slots: options, available_slots: [options[0]], recipient_activities: ["Dinner", "A walk"], recipient_idea: "Maybe a picnic", revision: 2 } });
  for (const text of ["Needs your confirmation", "Dinner after work", "Saturday evening", "Works for Sam", "Not selected", "Dinner", "A walk", "Maybe a picnic", "Confirm this date", "No date is confirmed yet"]) assert.ok(html.includes(text), text);
  assert.equal((html.match(/Confirm this date/g) || []).length, 1);
});

test("My Creations renders bucket memory attribution and earlier activity independently of the latest note",()=>{
 const html=render({...fixture,bucket_list:{...fixture.bucket_list!,items:[{...fixture.bucket_list!.items[0],memory_by:"partner",memory_saved_at:"2026-10-20T12:00:00Z",history:[{action:"attach_memory",by:"creator",at:"2026-10-20T11:00:00Z",status:"completed",note:"An earlier note",photo_url:"/api/media/earlier?template=display-code"}]}]}});
 for(const value of ["Memory shared by","Memory shared","An earlier note","We finally went","1 of 1 enjoyed","api/media/earlier","Open shared list"])assert.ok(html.includes(value),value);
});

test("authored story date labels are displayed without inventing a day or hiding the original text",()=>{
 for(const date of ["Summer 2026","October 2026"]){const html=render({...fixture,our_story:{...fixture.our_story!,partner_memory_date:date}});assert.ok(html.includes(date));}
});
