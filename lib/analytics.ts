// Shared gift URLs and auth callbacks can contain access codes. Keep traffic counts
// and performance reports useful without forwarding those values to Vercel.
export function prepareAnalyticsEvent<T extends { url: string }>(event: T): T | null {
  try {
    const url = new URL(event.url);
    if (/^\/(?:auth|api)(?:\/|$)/.test(url.pathname)) return null;
    url.search = "";
    url.hash = "";
    url.pathname = url.pathname.replace(/^\/(t|love)\/[^/]+(?:\/.*)?$/, "/$1/[shared-link]");
    return { ...event, url: url.toString() };
  } catch { return null; }
}

export function prepareSpeedInsightsEvent<T extends { url: string; route?: string }>(event: T): T | null {
  const prepared = prepareAnalyticsEvent(event);
  if (!prepared || event.route === undefined) return prepared;

  try {
    // The SDK supplies the route separately from the URL. Sanitize both, even
    // when a route hasn't been parameterized by the framework.
    const route = prepareAnalyticsEvent({ url: new URL(event.route, event.url).toString() });
    return route ? { ...prepared, route: new URL(route.url).pathname } : null;
  } catch { return null; }
}
