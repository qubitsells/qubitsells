// Shared gift URLs and auth callbacks can contain access codes. Keep traffic
// counts useful without forwarding those values to the analytics service.
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
