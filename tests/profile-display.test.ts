import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

// Render real profile components with fixture sessions. Effects do not run;
// no account, invitation, or production database is changed by these tests.
const script = `
require('tsx/cjs');
require.extensions['.css'] = module => {
  module.exports = new Proxy({}, {get: (_, key) => key === '__esModule' ? false : String(key)});
};
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
const {PathnameContext} = require('next/dist/shared/lib/hooks-client-context.shared-runtime.js');
const {AuthContext} = require('./context/AuthContext.tsx');
const fixture = JSON.parse(process.argv[1]);
const Component = require(fixture.kind === 'commerce' ? './components/commerce/AccountCommerce.tsx' : fixture.kind === 'couple' ? './components/account/CoupleProfile.tsx' : './components/account/PersonalProfile.tsx').default;
const actions = {signOut: async () => {}, refreshCouple: async () => {}, createCoupleSpace: async () => {}, pairWithCode: async () => {}, disconnect: async () => {}};
process.stdout.write(renderToStaticMarkup(React.createElement(PathnameContext.Provider, {value: fixture.kind === 'couple' ? '/couple-space/profile' : '/profile'}, React.createElement(AuthContext.Provider, {value: {...actions, ...fixture.auth}}, React.createElement(Component, {inviteCode: fixture.inviteCode || '',view:fixture.view})))));
`;
const account = {
  id: "person", email: "alex@example.com", created_at: "2026-10-19T12:00:00Z", email_confirmed_at: "2026-10-19T12:00:00Z",
  user_metadata: {full_name: "Alex Morgan", account_profile: {purpose: "work", organization: "Acme Studio", job_title: "Creative director", website: "https://acme.example", bio: "Professional introduction"}, partner_nickname: "Private nickname", love_language: "quality_time", partner_love_language: "gifts"},
};
const auth = {user: account, session: null, loading: false, coupleLoading: false, coupleError: null, couple: null, isConnected: false, coupleCode: "", fullName: "Alex Morgan", partnerName: "Sam"};
const render = (kind: "personal" | "couple" | "commerce", overrides = {}, inviteCode = "",view?:unknown) => execFileSync(process.execPath, ["-e", script, JSON.stringify({kind, auth: {...auth, ...overrides}, inviteCode,view})], {cwd: process.cwd(), encoding: "utf8", maxBuffer: 2 * 1024 * 1024});

test("every signed-in profile tab renders its own account section, including reviews",()=>{
  for(const [view,heading] of [["orders","Your orders."],["wishlist","Saved for another day."],["notifications","Your latest updates."],["reviews","Your voice, your reviews."]]){
    const html=render("personal",{},"",view);
    assert.ok(html.includes(heading),`${view} heading missing`);
    assert.ok(html.match(/<a\b[^>]*>/g)?.some(tag=>tag.includes(`href="/profile?view=${view}"`)&&tag.includes('aria-current="page"')),`${view} tab not selected`);
    assert.ok(!html.includes("Choose an account section"));
  }
});
test("commerce entry point supports reviews and handles unsupported runtime views without a heading lookup crash",()=>{
  assert.ok(render("commerce",{},"","reviews").includes("Your voice, your reviews."));
  for(const view of ["unknown","",null,undefined]){
    const html=render("commerce",{},"",view);
    assert.ok(html.includes("Choose an account section to continue."));
    assert.ok(html.includes("Return to My profile"));
    assert.ok(!html.includes("Loading…"));
  }
});

test("individual profile displays professional details without relationship fields", () => {
  const html = render("personal");
  for (const value of ["Alex Morgan", "alex@example.com", "Acme Studio", "Creative director", "https://acme.example", "Professional introduction", "Work &amp; business", "Save changes"]) assert.ok(html.includes(value), `Missing account detail: ${value}`);
  assert.ok(!html.includes("Private nickname"));
  assert.ok(!html.includes('id="couple-anniversary"'));
  assert.ok(!html.includes('id="your-love-language"'));
  assert.ok(html.includes('href="/couple-space"'));
  assert.ok(html.includes("Optional"));
  for (const value of ["Account security.", "Send password reset email", "Delete account", 'aria-controls="delete-account-confirmation"']) assert.ok(html.includes(value), `Missing security control: ${value}`);
  assert.ok(!html.includes("Permanently delete account"), "destructive confirmation stays closed until requested");
});

test("an account without a couple sees an optional explicit setup and invitation review", () => {
  const html = render("couple", {}, "LOVE-ABC123");
  assert.ok(html.includes("Create Couple Space"));
  assert.ok(html.includes("Your account and creations work independently."));
  assert.ok(html.includes('value="LOVE-ABC123"'));
  assert.ok(html.includes("Accept &amp; connect"));
  assert.ok(!html.includes("Acme Studio"));
  assert.ok(!html.includes('id="couple-anniversary"'));
});

test("connected couple profile displays its shared settings separately from work details", () => {
  const html = render("couple", {isConnected: true, couple: {id: "couple", couple_code: "LOVE-ABC123", partner_1_id: "person", partner_2_id: "partner", is_connected: true, anniversary_date: "2020-05-16", couple_motto: "Our shared story", couple_anthem: null}});
  for (const value of ["Private nickname", "2020-05-16", "Our shared story", "Save couple profile", "Disconnect partner"]) assert.ok(html.includes(value), `Missing couple detail: ${value}`);
  assert.ok(!html.includes("Acme Studio"));
  assert.ok(!html.includes("Creative director"));
  assert.ok(!html.includes('id="account-organization"'));
  assert.ok(!html.includes("Accept &amp; connect"));
  assert.ok(html.includes('aria-label="Couple Space navigation"'));assert.ok(!html.includes('aria-label="Account navigation"'));
});
