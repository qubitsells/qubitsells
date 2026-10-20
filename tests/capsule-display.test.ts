import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import type { CapsuleSealRequest, TimeCapsuleRecord } from "../lib/supabase/timeCapsules";
import { capsuleState, filterCapsules, formatCapsuleDate, type CapsuleFilters } from "../lib/capsule-display";

const capsule: TimeCapsuleRecord = {id: "memory", title: "A letter for next year", category: "milestone", sealed_date: "2026-10-20", unlock_date: "2027-10-20", created_at: "2026-10-20T12:00:00Z", is_locked: true, seal_mode: "solo", seal_color: "rose", seal_stamp: "✨", letter: {author: "Alex", greeting: "Dear future me", body: "PRIVATE LETTER CONTENT", signOff: "Until next time", paperTheme: "parchment"}, polaroids: [{id: "photo", image: "/private-memory-photo.png", caption: "PRIVATE PHOTO CAPTION", date: "2026-10-20", location: ""}]};
const request = (status: CapsuleSealRequest["status"]) => ({id: "request", capsule_id: "memory", requester_id: "alex", partner_id: "sam", status, unlock_vote_requester: false, unlock_vote_partner: false});
const filters: CapsuleFilters = {scope: "all", category: "all", query: "", sort: "newest"};

test("capsule states distinguish sealed, open, pending and declined without treating drafts as opened memories", () => {
  assert.equal(capsuleState(capsule), "sealed");
  assert.equal(capsuleState({...capsule, is_locked: false}), "opened");
  const shared = {...capsule, is_locked: false, seal_mode: "couple" as const};
  assert.equal(capsuleState(shared), "waiting");
  assert.equal(capsuleState(shared, request("pending")), "waiting");
  assert.equal(capsuleState(shared, request("rejected")), "declined");
  assert.equal(capsuleState(shared, request("accepted")), "opened");
});

test("collection combines personal/shared scope, all legacy categories, title search and sorting without changing its source", () => {
  const shared = {...capsule, id: "shared", title: "Our anniversary", category: "anniversary" as const, seal_mode: "couple" as const, created_at: "2026-10-21T12:00:00Z", unlock_date: "2027-01-01"};
  const openWhen = {...capsule, id: "occasion", category: "open_when" as const, title: "On a hard day", unlock_date: "Open when you need it"};
  const source = [capsule, shared, openWhen];
  assert.deepEqual(filterCapsules(source, {...filters, scope: "couple", category: "anniversary", query: " ANNIVERSARY "}).map(item => item.id), ["shared"]);
  assert.deepEqual(filterCapsules(source, {...filters, scope: "solo"}).map(item => item.id), ["memory", "occasion"]);
  assert.equal(filterCapsules(source, {...filters, query: "PRIVATE LETTER CONTENT"}).length, 0);
  assert.deepEqual(filterCapsules(source, {...filters, sort: "unlock"}).map(item => item.id), ["shared", "memory", "occasion"]);
  assert.deepEqual(source.map(item => item.id), ["memory", "shared", "occasion"]);
  assert.equal(formatCapsuleDate("2027-01-01"), "1 Jan 2027");
  assert.equal(formatCapsuleDate("Open when you need it"), "When you need it");
});

const renderScript = `
require('tsx/cjs');
require.extensions['.css'] = module => { module.exports = new Proxy({}, {get: (_, key) => key === '__esModule' ? false : String(key)}); };
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
const {default: Dashboard, CapsuleCard} = require('./components/capsules/CapsuleDashboard.tsx');
const args = JSON.parse(process.argv[1]);
const actions = {onCreate: () => {}, onOpen: () => {}, onDelete: () => {}, onResend: () => {}, onRetry: () => {}, onToggleAmbient: () => {}};
process.stdout.write(renderToStaticMarkup(React.createElement(args.card ? CapsuleCard : Dashboard, {...actions, ...args.props})));
`;
const render = (props: Record<string, unknown>, card = false) => execFileSync(process.execPath, ["-e", renderScript, JSON.stringify({card, props})], {cwd: process.cwd(), encoding: "utf8", maxBuffer: 2 * 1024 * 1024});

test("sealed and awaiting cards never render private content or image URLs, even if stale data is present", () => {
  for (const data of [capsule, {...capsule, seal_mode: "couple", is_locked: false}]) {
    const html = render({capsule: data, unlockRequested: false, resending: false}, true);
    assert.ok(html.includes("A letter for next year"));
    assert.ok(!html.includes("PRIVATE"));
    assert.ok(!html.includes("private-memory-photo"));
  }
  const opened = render({capsule: {...capsule, is_locked: false}, unlockRequested: false, resending: false}, true);
  assert.ok(opened.includes("PRIVATE LETTER CONTENT"));
  assert.ok(opened.includes("private-memory-photo.png"));
  assert.ok(opened.includes("Open memory"));
});

test("collection has real loading, failure, empty and populated states with truthful totals", () => {
  const props = {capsules: [], loading: false, loadError: null, connected: false, requests: {}, unlockRequests: [], resendingId: null, ambient: false};
  assert.ok(render({...props, loading: true}).includes("Opening your collection…"));
  const failed = render({...props, loadError: "Please try again."});
  assert.ok(failed.includes("Your collection couldn’t be loaded."));
  assert.ok(failed.includes("Try again"));
  assert.ok(!failed.includes("Create your first capsule"));
  const empty = render(props);
  assert.ok(empty.includes("Create your first capsule"));
  assert.ok(empty.includes("Explore optional Couple Space"));
  const populated = render({...props, capsules: [capsule, {...capsule, id: "shared", seal_mode: "couple", is_locked: false}]});
  assert.ok(populated.includes("2 capsules"));
  assert.ok(populated.includes("Awaiting partner"));
  assert.ok(populated.includes('aria-label="Search capsules by title"'));
  assert.ok(!populated.includes("PRIVATE"));
});

test("Couple Space capsule view shows shared memories and hides personal capsule controls and content",()=>{
  const html=render({sharedOnly:true,capsules:[capsule,{...capsule,id:"shared",title:"Our shared memory",seal_mode:"couple"}],loading:false,loadError:null,connected:true,requests:{},unlockRequests:[],resendingId:null,ambient:false});
  for(const text of ["Your shared archive","Your shared capsules","Our shared memory","1 capsule","Every capsule here is shared",'href="/couple-space"'])assert.ok(html.includes(text),text);
  for(const text of ["A letter for next year","Your personal archive",">All capsules</button>",">Personal</button>","PRIVATE LETTER CONTENT"])assert.ok(!html.includes(text),text);
});
