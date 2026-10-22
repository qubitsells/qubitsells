import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { AUTH_RETURN_COOKIE, authCallbackDestination, authCallbackUrl, authErrorMessage, authRequestOrigin, authReturnCookie, authReturnDestination, googleSignInRequest, signInDestination } from "../lib/auth/navigation";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";
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
  const destination = "/products/halloween-pumpkin-moon?duration=720";
  const returnCookie = authReturnCookie(destination, true).split(";")[0].split("=");
  jar.set(returnCookie[0], returnCookie[1]);
  const { data, error } = await browser.auth.signInWithOAuth(googleSignInRequest("https://qubitsells.com"));
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
  assert.equal(callback.toString(), "https://qubitsells.com/auth/callback", "fixed callback matches an exact Supabase allowlist entry");
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
  const result = await authCallbackDestination(callback.toString(), code => server.auth.exchangeCodeForSession(code), undefined, jar.get(AUTH_RETURN_COOKIE));
  assert.equal(result.toString(), `https://qubitsells.com${destination}`);
  assert.equal(exchanges, 1);
  assert.ok(jar.has("sb-auth-test-auth-token"), "server writes the signed-in session cookie");
  const replay = await server.auth.exchangeCodeForSession("single-use-google-code");
  assert.ok(replay.error, "a consumed verifier cannot be reused");
  assert.equal(exchanges, 1);
});

test("Google returns to the selected product and duration without a dynamic callback query", async () => {
  for (const duration of [72, 168, 720]) {
    const destination = `/products/halloween-pumpkin-moon?duration=${duration}`;
    const login = new URL(`https://qubitsells.com/login?redirect=${encodeURIComponent(destination)}`);
    const chosen = signInDestination(login.searchParams);
    const callback = new URL(googleSignInRequest(login.origin).options.redirectTo);
    callback.searchParams.set("code", "fixture-code");
    const result = await authCallbackDestination(callback.toString(), async () => ({ error: null }), undefined, encodeURIComponent(chosen));
    assert.equal(result.toString(), `${login.origin}${destination}`);
    const failed = await authCallbackDestination(callback.toString(), async () => ({ error: Error("expired") }), undefined, encodeURIComponent(chosen));
    assert.equal(signInDestination(failed.searchParams), chosen, "retry keeps the product and duration");
  }
});

test("local Google sign-in requests a localhost callback even when the configured public domain is live",async()=>{
  const original=process.env.NEXT_PUBLIC_BASE_URL;
  process.env.NEXT_PUBLIC_BASE_URL="https://www.qubitsells.com";
  try{
    for(const origin of ["http://localhost:3000","http://localhost:3218","http://127.0.0.1:3000"]){
      const jar=new Map<string,string>();
      const browser=createBrowserClient("https://auth-test.supabase.co","sb_publishable_test_fixture",{
        isSingleton:false,auth:{autoRefreshToken:false,detectSessionInUrl:false},
        cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(({name,value})=>jar.set(name,value))},
      });
      const {data,error}=await browser.auth.signInWithOAuth(googleSignInRequest(origin));
      assert.equal(error,null);
      assert.equal(new URL(data.url!).searchParams.get("redirect_to"),`${origin}/auth/callback`);
      assert.ok([...jar.keys()].some(name=>name.includes("code-verifier")));
      const destination="/products/halloween-pumpkin-moon?duration=720";
      const result=await authCallbackDestination(`${origin}/auth/callback?code=fixture`,async()=>({error:null}),undefined,encodeURIComponent(destination));
      assert.equal(result.toString(),`${origin}${destination}`);
      assert.equal(new URL(authCallbackUrl(origin,"/reset-password")).origin,origin);
    }
  }finally{if(original===undefined)delete process.env.NEXT_PUBLIC_BASE_URL;else process.env.NEXT_PUBLIC_BASE_URL=original;}
});

test("return cookies are short-lived, host-only, and cannot redirect outside the site", async () => {
  const destination = "/products/love-letter?duration=168&review=1#reviews";
  assert.equal(authReturnDestination(encodeURIComponent(destination)), destination);
  assert.equal(authReturnDestination(destination), destination, "Next cookies may already decode the value");
  assert.match(authReturnCookie(destination, true), /Path=\/; Max-Age=600; SameSite=Lax; Secure$/);
  assert.ok(!authReturnCookie(destination, true).includes("Domain="));
  assert.match(authReturnCookie(destination, false, true), /Max-Age=0; SameSite=Lax$/);
  for (const invalid of [undefined, "https://evil.test", "%2F%2Fevil.test", "/\\evil.test", "%ZZ", "%2F%0Aheader", "/".repeat(4097)]) {
    assert.equal(authReturnDestination(invalid), null);
    const result = await authCallbackDestination("https://qubitsells.com/auth/callback?code=fixture", async () => ({ error: null }), undefined, invalid);
    assert.equal(result.toString(), "https://qubitsells.com/profile");
  }
});

test("callbacks keep the browser host and its session cookies behind Vercel", () => {
  for (const host of ["qubitsells.com", "www.qubitsells.com", "qubitsells-preview.vercel.app"]) {
    const request = new Request("http://localhost:3000/auth/callback", { headers: { host, "x-forwarded-proto": "https", "x-forwarded-host": "evil.test" } });
    assert.equal(authRequestOrigin(request, true), `https://${host}`);
  }
  assert.equal(authRequestOrigin(new Request("http://localhost:3000/auth/callback", { headers: { host: "localhost:3000", "x-forwarded-proto": "https" } })), "http://localhost:3000");
});

test("a Google code sent to Site URL is relayed before the homepage can consume it", async () => {
  const cookie = `${AUTH_RETURN_COOKIE}=${encodeURIComponent("/products/halloween-pumpkin-moon?duration=168")}`;
  const response = await proxy(new NextRequest("https://qubitsells.com/?code=fixture-code", { headers: { cookie } }));
  assert.equal(response.status, 307);
  const callback=new URL(response.headers.get("location")!);
  assert.equal(callback.pathname,"/auth/callback");
  assert.equal(callback.searchParams.get("code"),"fixture-code");
  assert.equal(callback.searchParams.get("next"),"/products/halloween-pumpkin-moon?duration=168");
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  for (const [path, headers] of [["/", {}], ["/", { cookie }], ["/?utm_source=google", {}]] as const) {
    assert.equal((await proxy(new NextRequest(`https://qubitsells.com${path}`, { headers }))).headers.get("location"), null);
  }
});

test("homepage callback codes are exchanged and removed even without the navigation cookie",async()=>{
  for(const cookie of ["",`${AUTH_RETURN_COOKIE}=%2F%2Fevil.test`]){
    const response=await proxy(new NextRequest("https://www.qubitsells.com/?code=fixture-code&next=https://evil.test",{headers:{cookie}}));
    assert.equal(response.status,307);
    assert.equal(response.headers.get("cache-control"),"private, no-store");
    assert.match(response.headers.get("x-robots-tag")||"",/noindex/);
    const callback=new URL(response.headers.get("location")!);
    assert.equal(callback.origin,"https://www.qubitsells.com");
    assert.equal(callback.pathname,"/auth/callback");
    assert.equal(callback.searchParams.get("next"),"/");
    const result=await authCallbackDestination(callback.toString(),async code=>{assert.equal(code,"fixture-code");return {error:null};});
    assert.equal(result.toString(),"https://www.qubitsells.com/");
    assert.equal(result.search,"");
    const failure=await authCallbackDestination(callback.toString(),async()=>({error:Error("PKCE verification failed")}));
    assert.equal(failure.pathname,"/login");
    assert.equal(failure.searchParams.get("redirect"),"/");
    assert.equal(failure.searchParams.has("code"),false);
  }
  const cancelled=await proxy(new NextRequest("https://www.qubitsells.com/?error=access_denied&error_description=private-provider-detail"));
  const failure=await authCallbackDestination(cancelled.headers.get("location")!,async()=>{throw Error("Provider errors must not be exchanged");});
  assert.equal(failure.searchParams.get("error"),"auth_cancelled");
  assert.equal(failure.searchParams.get("redirect"),"/");
  assert.ok(!failure.href.includes("private-provider-detail"));
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

test("homepage sign-in returns home for password, Google, and email-confirmation returns", async () => {
  for (const home of ["/", "/?from=home", "/#templates", "/./"]) {
    // AuthForm uses this destination for password sign-in and its signed-in effect.
    const destination = signInDestination(new URLSearchParams({redirect:home}));
    assert.equal(destination, home);
    assert.equal(new URL(authCallbackUrl("https://qubitsells.com", home)).searchParams.get("next"), home);
    assert.equal(authReturnDestination(encodeURIComponent(home)), home);
    assert.ok(authReturnCookie(home, true).startsWith(`${AUTH_RETURN_COOKIE}=${encodeURIComponent(home)};`));
    for (const suffix of ["", `&next=${encodeURIComponent(home)}`]) {
      const result = await authCallbackDestination(`https://qubitsells.com/auth/callback?code=fixture${suffix}`, async () => ({error:null}), undefined, encodeURIComponent(home));
      assert.equal(result.toString(), new URL(home, "https://qubitsells.com").toString());
      const retry = await authCallbackDestination(`https://qubitsells.com/auth/callback?error=access_denied${suffix}`, async () => ({error:null}), undefined, encodeURIComponent(home));
      assert.equal(signInDestination(retry.searchParams), home);
    }
  }
  for (const destination of ["/products/halloween-pumpkin-moon?duration=720", "/my-templates", "/profile?view=orders", "/couple-space/profile?code=LOVE-INVITE", "/reset-password?recovery=1"]) {
    assert.equal(signInDestination(new URLSearchParams({redirect:destination})), destination);
  }
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
