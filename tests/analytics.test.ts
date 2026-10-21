import { test } from "node:test";
import assert from "node:assert/strict";
import { prepareAnalyticsEvent, prepareSpeedInsightsEvent } from "../lib/analytics";

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

test("speed insights masks shared URLs and route names without changing vital measurements", () => {
  for (const prefix of ["t", "love"]) {
    const event = {
      type: "vital" as const,
      url: `https://qubitsells.com/${prefix}/private-code?manage=private-key#private-token`,
      route: `/${prefix}/private-code/replies?key=private-key`,
      metrics: { LCP: 1200, CLS: 0.01, INP: 80, FCP: 600, TTFB: 200 },
    };
    const result = prepareSpeedInsightsEvent(event);
    assert.deepEqual(result, {
      ...event,
      url: `https://qubitsells.com/${prefix}/[shared-link]`,
      route: `/${prefix}/[shared-link]`,
    });
    assert.ok(!JSON.stringify(result).includes("private"));
    assert.ok(event.url.includes("private-code"), "the input event is not mutated");
  }
});

test("speed insights preserves public routes and handles events without route metadata", () => {
  assert.deepEqual(prepareSpeedInsightsEvent({ type: "vital", url: "https://qubitsells.com/products/starlit-story?order_id=secret", route: "/products/[slug]" }), {
    type: "vital", url: "https://qubitsells.com/products/starlit-story", route: "/products/[slug]",
  });
  assert.deepEqual(prepareSpeedInsightsEvent({ type: "vital", url: "https://qubitsells.com/profile?view=orders#secret" }), {
    type: "vital", url: "https://qubitsells.com/profile",
  });
});

test("speed insights drops auth and API events even when only the route identifies them", () => {
  for (const path of ["/auth/callback?code=secret", "/auth", "/api/account/security", "/api"]) {
    assert.equal(prepareSpeedInsightsEvent({ url: `https://qubitsells.com${path}` }), null);
    assert.equal(prepareSpeedInsightsEvent({ url: "https://qubitsells.com/profile", route: path }), null);
  }
  assert.equal(prepareSpeedInsightsEvent({ url: "not-a-url" }), null);
});
