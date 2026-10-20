/** All paid publishing goes through a server-verified order. URL values never
 * grant access: the API checks the authenticated buyer and the paid entitlement. */
export function publishTemplate(options: RequestInit) {
  const orderId = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("order");
  const payload = JSON.parse(String(options.body || "{}"));
  return fetch("/api/templates/create", {...options, body: JSON.stringify({...payload, order_id: orderId})});
}
