import { test } from "node:test";
import assert from "node:assert/strict";
import { apiError, HttpError, requireSameOrigin } from "../lib/server/security";

function environment(values: { base?: string; vercel?: string }, run: () => void) {
  const original = { base: process.env.NEXT_PUBLIC_BASE_URL, vercel: process.env.VERCEL };
  try {
    if (values.base === undefined) delete process.env.NEXT_PUBLIC_BASE_URL; else process.env.NEXT_PUBLIC_BASE_URL = values.base;
    if (values.vercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = values.vercel;
    run();
  } finally {
    if (original.base === undefined) delete process.env.NEXT_PUBLIC_BASE_URL; else process.env.NEXT_PUBLIC_BASE_URL = original.base;
    if (original.vercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = original.vercel;
  }
}
const deletionRequest = (url: string, origin?: string, extra: Record<string, string> = {}) => new Request(url, { method: "DELETE", headers: { ...(origin ? { origin } : {}), ...extra } });

test("same-origin production deletion works even if canonical configuration still points to localhost", () => {
  environment({ base: "http://localhost:3000" }, () => {
    assert.doesNotThrow(() => requireSameOrigin(deletionRequest("https://qubitsells.com/api/account/security", "https://qubitsells.com", { host: "qubitsells.com", "sec-fetch-site": "same-origin" })));
  });
});

test("Vercel accepts the actual www or preview domain without a wildcard allowlist", () => {
  environment({ base: "https://qubitsells.com/", vercel: "1" }, () => {
    for (const host of ["www.qubitsells.com", "qubitsells-git-feature-example.vercel.app", "qubitsells.com"]) {
      assert.doesNotThrow(() => requireSameOrigin(deletionRequest("http://localhost:3000/api/account/security", `https://${host}`, { host, "x-forwarded-proto": "https", "sec-fetch-site": "same-origin" })));
    }
  });
});

test("local requests use their actual hostname and port even when Next normalizes its URL", () => {
  environment({ base: "https://qubitsells.com" }, () => {
    for (const host of ["localhost:3218", "127.0.0.1:3218", "[::1]:3218"]) {
      assert.doesNotThrow(() => requireSameOrigin(deletionRequest("http://localhost:3218/api/account/security", `http://${host}`, { host })));
    }
    assert.throws(() => requireSameOrigin(deletionRequest("http://localhost:3218/api/account/security", "http://localhost:3219", { host: "localhost:3218" })), HttpError);
  });
});

test("explicit canonical origin remains available behind a custom proxy and malformed configuration does not break valid requests", () => {
  environment({ base: " https://qubitsells.com/ " }, () => {
    assert.doesNotThrow(() => requireSameOrigin(deletionRequest("http://internal-service:3000/api/account/security", "https://qubitsells.com", { host: "internal-service:3000" })));
  });
  environment({ base: "invalid-origin" }, () => {
    assert.doesNotThrow(() => requireSameOrigin(deletionRequest("https://qubitsells.com/api/account/security", "https://qubitsells.com")));
  });
});

test("cross-site, same-site foreign subdomains, and spoofed forwarded headers remain rejected", () => {
  for (const vercel of [undefined, "1"]) environment({ base: "https://qubitsells.com", vercel }, () => {
    for (const [origin, headers] of [
      ["https://evil.test", {}],
      ["https://evil.qubitsells.com", { "sec-fetch-site": "same-site" }],
      ["https://qubitsells.com.evil.test", { "sec-fetch-site": "same-origin" }],
      ["https://evil.test", { "x-forwarded-host": "evil.test", "x-forwarded-proto": "https", "sec-fetch-site": "same-origin" }],
      ["https://qubitsells.com", { "sec-fetch-site": "cross-site" }],
      ["http://qubitsells.com", {}],
    ] as const) {
      assert.throws(() => requireSameOrigin(deletionRequest("https://qubitsells.com/api/account/security", origin, { host: "qubitsells.com", ...headers })), (error: unknown) => error instanceof HttpError && error.status === 403 && error.code === "origin_not_allowed");
    }
  });
});

test("missing, opaque, malformed and multi-origin headers are rejected", () => {
  environment({}, () => {
    for (const origin of [undefined, "null", "https://qubitsells.com https://evil.test", "https://qubitsells.com/path", "https://person@qubitsells.com", "javascript:alert(1)"]) {
      assert.throws(() => requireSameOrigin(deletionRequest("https://qubitsells.com/api/account/security", origin)), HttpError);
    }
  });
});

test("origin errors have a distinct response code instead of requesting reauthentication", async () => {
  const response = apiError(new HttpError(403, "Request origin is not allowed.", "origin_not_allowed"));
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { success: false, error: "Request origin is not allowed.", code: "origin_not_allowed" });
});
