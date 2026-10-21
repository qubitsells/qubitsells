import { test } from "node:test";
import assert from "node:assert/strict";
import { prepareAnalyticsEvent } from "../lib/analytics";

test("analytics preserves public product paths while removing query and fragment secrets", () => {
  const input = { type: "pageview", url: "https://qubitsells.com/products/starlit-story?email=private%40example.test&order_id=private#private-token" };
  assert.deepEqual(prepareAnalyticsEvent(input), { ...input, url: "https://qubitsells.com/products/starlit-story" });
  assert.ok(input.url.includes("private"), "the original event is not mutated");
});

test("shared gift access codes are masked and never returned in analytics URLs", () => {
  for (const path of ["/t/private-code?manage=private-key", "/love/private-slug#secret", "/t/private-code/replies"]) {
    const result = prepareAnalyticsEvent({ type: "pageview", url: `https://qubitsells.com${path}` });
    assert.ok(result);
    assert.ok(!result.url.includes("private"));
    assert.ok(result.url.endsWith("/[shared-link]"));
  }
});

test("auth callbacks, API URLs, and malformed events are dropped", () => {
  for (const path of ["/auth/callback?code=secret", "/auth", "/api/account/security", "/api"]) {
    assert.equal(prepareAnalyticsEvent({ url: `https://qubitsells.com${path}` }), null);
  }
  assert.equal(prepareAnalyticsEvent({ url: "not-a-url" }), null);
  assert.ok(prepareAnalyticsEvent({ url: "https://qubitsells.com/templates" }));
});
