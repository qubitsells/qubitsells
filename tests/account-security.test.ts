import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { deletePersonalAccount } from "../lib/server/account-security";
import { saveNewPassword, sendPasswordReset } from "../lib/auth/password";

const id = "11111111-1111-4111-8111-111111111111";
const now = Date.now();
function fixture(options: { stale?: boolean; oldSessionRecentUser?: boolean; refreshOnly?: boolean; noUser?: boolean; ready?: boolean; revokeError?: boolean; deleteError?: boolean } = {}) {
  const calls: { method: string; path: string; body: Record<string, unknown> }[] = [];
  const user = { id, aud: "authenticated", email: "alex@example.test", last_sign_in_at: new Date(now - (options.stale ? 3_600_000 : 10_000)).toISOString(), app_metadata: {}, user_metadata: {}, created_at: new Date(now).toISOString() };
  const token = ["e30", Buffer.from(JSON.stringify({ sub: id, exp: Math.floor(now / 1000) + 3600, amr: [{ method: options.refreshOnly ? "token_refresh" : "password", timestamp: Math.floor((now - (options.stale || options.oldSessionRecentUser ? 3_600_000 : 10_000)) / 1000) }] })).toString("base64url"), "fixture"].join(".");
  const storage = new Map<string, string>([["auth-test", JSON.stringify({ access_token: token, refresh_token: "fixture-refresh", expires_at: Math.floor(now / 1000) + 3600, expires_in: 3600, token_type: "bearer", user })]]);
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const path = url.pathname + url.search;
    const method = init?.method || "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    calls.push({ method, path, body });
    const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
    if (path === "/auth/v1/user" && method === "GET") return options.noUser ? json({ message: "No user" }, 401) : json(user);
    if (path === "/auth/v1/user" && method === "PUT") return json(user);
    if (url.pathname === "/auth/v1/recover") return json({});
    if (path === "/rest/v1/rpc/qubit_account_deletion_ready") return json(options.ready !== false);
    if (path === "/auth/v1/logout?scope=global") return options.revokeError ? json({ message: "Failed" }, 400) : new Response(null, { status: 204 });
    if (path === "/auth/v1/logout?scope=local") return new Response(null, { status: 204 });
    if (path === `/auth/v1/admin/users/${id}` && method === "DELETE") return options.deleteError ? json({ message: "Failed" }, 400) : json(user);
    throw new Error(`Unexpected fixture request: ${method} ${path}`);
  };
  const client = createClient("https://auth-fixture.supabase.co", "sb_publishable_fixture", { global: { fetch: fetcher }, auth: { storageKey: "auth-test", storage: { getItem: key => storage.get(key) || null, setItem: (key, value) => { storage.set(key, value); }, removeItem: key => { storage.delete(key); } }, autoRefreshToken: false, detectSessionInUrl: false } });
  const admin = createClient("https://auth-fixture.supabase.co", "sb_secret_fixture", { global: { fetch: fetcher }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  return { client, admin, calls, storage };
}

test("deletion verifies identity, revokes all sessions, deletes only the signed-in user, then clears the local session", async () => {
  const value = fixture();
  await deletePersonalAccount(value.admin, value.client, { email: "Alex@example.test", confirmation: "DELETE" }, now);
  const paths = value.calls.map(call => call.path);
  assert.ok(paths.indexOf("/auth/v1/user") < paths.indexOf("/rest/v1/rpc/qubit_account_deletion_ready"));
  assert.ok(paths.indexOf("/auth/v1/logout?scope=global") < paths.indexOf(`/auth/v1/admin/users/${id}`));
  assert.equal(value.calls.find(call => call.path === `/auth/v1/admin/users/${id}`)?.body.should_soft_delete, false);
  assert.equal(value.storage.has("auth-test"), false);
});

test("deletion rejects missing auth, stale sign-in, mismatched email, missing confirmation, and injected account IDs", async () => {
  for (const [options, input] of [
    [{ noUser: true }, { email: "alex@example.test", confirmation: "DELETE" }],
    [{ stale: true }, { email: "alex@example.test", confirmation: "DELETE" }],
    [{ oldSessionRecentUser: true }, { email: "alex@example.test", confirmation: "DELETE" }],
    [{ refreshOnly: true }, { email: "alex@example.test", confirmation: "DELETE" }],
    [{}, { email: "someone@example.test", confirmation: "DELETE" }],
    [{}, { email: "alex@example.test", confirmation: "delete" }],
    [{}, { email: "alex@example.test", confirmation: "DELETE", user_id: "another-user" }],
  ] as const) {
    const value = fixture(options);
    await assert.rejects(deletePersonalAccount(value.admin, value.client, input, now));
    assert.ok(!value.calls.some(call => call.method === "DELETE" || call.path.includes("logout")));
  }
});

test("missing migration or session-revocation failure blocks destructive deletion", async () => {
  for (const options of [{ ready: false }, { revokeError: true }]) {
    const value = fixture(options);
    await assert.rejects(deletePersonalAccount(value.admin, value.client, { email: "alex@example.test", confirmation: "DELETE" }, now));
    assert.ok(!value.calls.some(call => call.method === "DELETE"));
  }
});

test("password recovery uses the app callback and validates new passwords before updating the verified user", async () => {
  const value = fixture();
  await sendPasswordReset(value.client, " alex@example.test ", "https://qubitsells.com");
  const recovery = value.calls.find(call => call.path.startsWith("/auth/v1/recover"));
  assert.ok(recovery);
  assert.equal(recovery.body.email, "alex@example.test");
  const callback = new URL(new URL(recovery.path, "https://auth-fixture.supabase.co").searchParams.get("redirect_to")!);
  assert.equal(callback.origin, "https://qubitsells.com");
  assert.equal(callback.pathname, "/auth/callback");
  assert.equal(callback.searchParams.get("next"), "/reset-password");
  await assert.rejects(saveNewPassword(value.client, { password: "short", confirm: "short" }));
  await assert.rejects(saveNewPassword(value.client, { password: "long-enough-password", confirm: "different" }));
  assert.ok(!value.calls.some(call => call.method === "PUT"));
  await saveNewPassword(value.client, { password: "long-enough-password", confirm: "long-enough-password" });
  assert.equal(value.calls.find(call => call.method === "PUT")?.body.password, "long-enough-password");
});
