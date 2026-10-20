import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { authCallbackDestination, authCallbackUrl, authErrorMessage, googleSignInRequest, signInDestination } from "../lib/auth/navigation";
import { publicSupabaseConfig } from "../lib/supabase/config";
import { authCookieOptions } from "../lib/security/sessionCookies";

test("Google uses an S256 challenge and exchanges the browser's PKCE cookie for a server session", async () => {
  const jar = new Map<string, string>();
  const cookies = {
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    setAll: (values: { name: string; value: string }[]) => values.forEach(({ name, value }) => value ? jar.set(name, value) : jar.delete(name)),
  };
  const browser = createBrowserClient("https://auth-test.supabase.co", "sb_publishable_test_fixture", {
    cookies, isSingleton: false, auth: { autoRefreshToken: false, detectSessionInUrl: false },
  });
  const destination = "/checkout/success?order_id=example&source=google";
  const { data, error } = await browser.auth.signInWithOAuth(googleSignInRequest("https://qubitsells.com", destination));
  assert.equal(error, null);
  const authorize = new URL(data.url!);
  assert.equal(authorize.origin, "https://auth-test.supabase.co");
  assert.equal(authorize.pathname, "/auth/v1/authorize");
  assert.equal(authorize.searchParams.get("provider"), "google");
  assert.equal(authorize.searchParams.get("prompt"), "select_account");
  assert.equal(authorize.searchParams.get("code_challenge_method"), "s256");
  assert.equal(authorize.searchParams.get("scopes"), null, "use the provider's basic sign-in scopes only");
  const callback = new URL(authorize.searchParams.get("redirect_to")!);
  assert.equal(callback.origin, "https://qubitsells.com");
  assert.equal(callback.searchParams.get("next"), destination);
  assert.ok([...jar.keys()].some(name => name.includes("code-verifier")));

  let exchanges = 0;
  const accessToken = ["e30", Buffer.from(JSON.stringify({ sub: "user-google", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url"), "fixture"].join(".");
  const server = createServerClient("https://auth-test.supabase.co", "sb_publishable_test_fixture", {
    cookies,
    global: { fetch: async (input, init) => {
      exchanges++;
      assert.equal(String(input), "https://auth-test.supabase.co/auth/v1/token?grant_type=pkce");
      assert.equal(init?.method, "POST");
      const body = JSON.parse(String(init?.body));
      assert.equal(body.auth_code, "single-use-google-code");
      assert.equal(createHash("sha256").update(body.code_verifier).digest("base64url"), authorize.searchParams.get("code_challenge"));
      return new Response(JSON.stringify({ access_token: accessToken, refresh_token: "test-refresh-token", token_type: "bearer", expires_in: 3600,
        user: { id: "user-google", aud: "authenticated", email: "person@example.test", app_metadata: { provider: "google" }, user_metadata: { full_name: "Example Person" }, created_at: new Date().toISOString() },
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    } },
  });
  callback.searchParams.set("code", "single-use-google-code");
  const result = await authCallbackDestination(callback.toString(), code => server.auth.exchangeCodeForSession(code));
  assert.equal(result.toString(), `https://qubitsells.com${destination}`);
  assert.equal(exchanges, 1);
  assert.ok(jar.has("sb-auth-test-auth-token"), "server writes the signed-in session cookie");
  const replay = await server.auth.exchangeCodeForSession("single-use-google-code");
  assert.ok(replay.error, "a consumed verifier cannot be reused");
  assert.equal(exchanges, 1);
});

test("callback rejects external destinations and keeps local and preview sessions on their own origin", async () => {
  for (const origin of ["https://qubitsells.com", "http://localhost:3000", "https://qubitsells-preview.vercel.app"]) {
    for (const invalid of ["https://evil.test", "//evil.test", "/\\evil.test", "/\nheader"]) {
      const callback = new URL(authCallbackUrl(origin, invalid));
      callback.searchParams.set("code", "valid-code");
      assert.equal((await authCallbackDestination(callback.toString(), async () => ({ error: null }))).toString(), `${origin}/profile`);
    }
  }
});

test("cancellation, expired codes, missing codes, and network errors preserve a safe retry destination", async () => {
  const next = "/products/starlit-story?duration=7";
  for (const scenario of ["cancelled", "expired", "missing", "network"]) {
    const url = new URL(authCallbackUrl("https://qubitsells.com", next));
    if (scenario !== "missing") url.searchParams.set("code", "test-code");
    if (scenario === "cancelled") {
      url.searchParams.set("error", "access_denied");
      url.searchParams.set("error_description", "untrusted provider details");
    }
    let calls = 0;
    const result = await authCallbackDestination(url.toString(), async () => {
      calls++;
      if (scenario === "network") throw new Error("network secret details");
      return { error: new Error("expired code") };
    });
    assert.equal(calls, scenario === "cancelled" || scenario === "missing" ? 0 : 1);
    assert.equal(result.pathname, "/login");
    assert.equal(signInDestination(result.searchParams), next);
    assert.ok(!result.toString().includes("details"));
    assert.ok(authErrorMessage(result.searchParams.get("error")));
  }
});

test("Vercel production uses the configured public domain instead of the internal request host", async () => {
  const success = await authCallbackDestination("http://localhost:3000/auth/callback?code=valid&next=%2Fmy-templates", async () => ({ error: null }), "https://qubitsells.com");
  assert.equal(success.toString(), "https://qubitsells.com/my-templates");
  const failure = await authCallbackDestination("http://localhost:3000/auth/callback?error=access_denied", async () => ({ error: null }), "https://qubitsells.com");
  assert.equal(failure.origin, "https://qubitsells.com");
  assert.equal(failure.pathname, "/login");
});

test("new accounts land in their personal profile and invitations require a separate review", async () => {
  assert.equal(signInDestination(new URLSearchParams()), "/profile");
  const invitation = new URLSearchParams({ code: "LOVE-INVITE", redirect: "https://evil.test" });
  const destination = signInDestination(invitation);
  assert.equal(destination, "/couple-space/profile?code=LOVE-INVITE");
  const url = new URL(authCallbackUrl("https://qubitsells.com", destination));
  url.searchParams.set("error", "access_denied");
  const failure = await authCallbackDestination(url.toString(), async () => { throw new Error("must not exchange"); });
  assert.equal(signInDestination(failure.searchParams), destination);
  assert.equal(authErrorMessage(null), null);
  assert.ok(!authErrorMessage("arbitrary provider text")!.includes("arbitrary"));
});

test("Supabase accepts current publishable keys and existing anon configuration, with actionable missing-env errors", () => {
  const names = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;
  const original = names.map(name => process.env[name]);
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = " https://auth-test.supabase.co ";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = " sb_publishable_fixture ";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "legacy-fixture";
    assert.deepEqual(publicSupabaseConfig(), { url: "https://auth-test.supabase.co", key: "sb_publishable_fixture" });
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    assert.equal(publicSupabaseConfig().key, "legacy-fixture");
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    assert.throws(publicSupabaseConfig, /Vercel Project Settings > Environment Variables/);
    const options = authCookieOptions({ maxAge: 3600, expires: new Date("2099-01-01"), path: "/" }, false, true);
    assert.equal(options.maxAge, undefined);
    assert.equal(options.expires, undefined);
    assert.equal(options.secure, true);
    assert.equal(authCookieOptions({ maxAge: 0 }, false, true).maxAge, 0);
  } finally {
    names.forEach((name, index) => original[index] === undefined ? delete process.env[name] : process.env[name] = original[index]);
  }
});
