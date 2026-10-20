import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient, type User } from "@supabase/supabase-js";
import { accountProfileFromMetadata, accountProfileSchema } from "../lib/account-profile";
import { saveAccountProfile, saveCoupleProfile } from "../lib/supabase/accountProfile";
import { getExistingCouple, getOrCreateCouple, pairWithLoveCode } from "../lib/supabase/couple";

const userId = "11111111-1111-4111-8111-111111111111";
const partnerId = "22222222-2222-4222-8222-222222222222";
const account = { full_name: "Taylor Morgan", organization: "North Studio", job_title: "Founder", website: "https://studio.example", bio: "Designing useful things.", purpose: "work" as const };

function database(couples: Record<string, unknown>[] = [], profile: Record<string, unknown> | null = null) {
  const requests: { url: URL; method: string; body: Record<string, unknown> | null }[] = [];
  const metadata: Record<string, unknown>[] = [];
  const client = createClient("https://account-check.invalid", "fixture-key", { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    const method = init?.method || "GET";
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : null;
    requests.push({ url, method, body });
    let response: unknown = [];
    if (url.pathname.endsWith("/profiles") && method === "GET") response = url.searchParams.get("id") === `eq.${partnerId}` ? [{ full_name: "Jamie" }] : profile ? [profile] : [];
    if (url.pathname.endsWith("/couples")) response = method === "PATCH" ? { id: "shared-space" } : couples;
    if (url.pathname.endsWith("/ensure_couple")) response = { id: "new-space", couple_code: "LOVE-ABCDEF123456", partner_1_id: userId, partner_2_id: null };
    if (url.pathname.endsWith("/join_couple_by_code")) response = { success: true, message: "Connected." };
    return new Response(JSON.stringify(response), { headers: { "Content-Type": "application/json" } });
  } } });
  client.auth.updateUser = async attributes => {
    metadata.push((attributes.data || {}) as Record<string, unknown>);
    return { data: { user: { id: userId } as User }, error: null };
  };
  return { client, requests, metadata };
}

test("ordinary accounts can load membership without creating a Couple Space", async () => {
  const { client, requests } = database();
  assert.equal(await getExistingCouple(client, userId, {}), null);
  assert.ok(requests.every(request => request.method === "GET" && !request.url.pathname.includes("/rpc/")));
});

test("existing couples and partner names remain available without provisioning a new relationship", async () => {
  const { client, requests } = database([
    { id: "shared-space", partner_1_id: userId, partner_2_id: partnerId, couple_code: "LOVE-ABCDEF123456", anniversary_date: "2020-01-01", couple_motto: "Our story" },
    { id: "stranger-space", partner_1_id: "someone-else", partner_2_id: "another-person" },
  ], { couple_id: "shared-space" });
  const result = await getExistingCouple(client, userId, {});
  assert.equal(result?.id, "shared-space");
  assert.equal(result?.partner_name, "Jamie");
  assert.equal(result?.is_connected, true);
  assert.equal(result?.anniversary_date, "2020-01-01");
  assert.ok(requests.every(request => request.method === "GET"));
});

test("creating and joining a Couple Space use explicit, separate operations", async () => {
  const { client, requests } = database();
  assert.equal((await getOrCreateCouple(client, userId, {})).id, "new-space");
  assert.ok(requests.some(request => request.url.pathname.endsWith("/ensure_couple")));
  requests.length = 0;
  assert.equal((await pairWithLoveCode(client, userId, " love-abcdef123456 ")).success, true);
  assert.equal(requests[0].body?.code_input, "LOVE-ABCDEF123456");
  assert.ok(!requests.some(request => request.url.pathname.endsWith("/ensure_couple")));
});

test("account saves keep work details private and leave all relationship settings and membership untouched", async () => {
  const { client, requests, metadata } = database();
  await saveAccountProfile(client, userId, account);
  assert.equal(requests.length, 1);
  assert.ok(requests[0].url.pathname.endsWith("/profiles"));
  assert.deepEqual(Object.keys(requests[0].body!).sort(), ["full_name", "id", "updated_at"]);
  assert.equal(requests[0].body?.full_name, account.full_name);
  assert.deepEqual(metadata[0], { full_name: account.full_name, account_profile: {
    organization: account.organization, job_title: account.job_title, website: account.website, bio: account.bio, purpose: account.purpose,
  } });
  assert.ok(!JSON.stringify(requests).includes("North Studio"));
  assert.ok(!JSON.stringify(metadata).includes("partner_nickname"));
});

test("couple saves never overwrite the individual profile or its business information", async () => {
  const { client, requests, metadata } = database();
  const values = { partner_nickname: "Jay", anniversary_date: "2020-01-01", couple_motto: "Our story", love_language: "time" as const, partner_love_language: "words" as const, couple_anthem: null };
  await saveCoupleProfile(client, userId, "shared-space", values);
  assert.equal(requests[0].url.searchParams.get("id"), "eq.shared-space");
  assert.equal(requests[0].body?.anniversary_date, "2020-01-01");
  assert.equal(requests[1].body?.partner_nickname, "Jay");
  for (const request of requests) for (const key of ["full_name", "organization", "purpose", "couple_id"]) assert.ok(!(key in request.body!));
  assert.deepEqual(metadata[0], values);
});

test("account validation rejects unsafe website links and supports personal, work and mixed use", () => {
  assert.equal(accountProfileSchema.safeParse({ ...account, website: "javascript:alert(1)" }).success, false);
  for (const purpose of ["personal", "work", "both"]) assert.equal(accountProfileSchema.safeParse({ ...account, purpose }).success, true);
  const result = accountProfileFromMetadata({ full_name: "Taylor", partner_nickname: "Legacy nickname", anniversary_date: "2020-01-01", account_profile: { organization: "North Studio", purpose: "work" } });
  assert.equal(result.organization, "North Studio");
  assert.equal(result.purpose, "work");
  assert.ok(!("partner_nickname" in result));
});
