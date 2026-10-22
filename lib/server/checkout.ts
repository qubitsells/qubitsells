import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import type { checkoutRequestSchema, StoreOrder } from "@/lib/commerce";
import { LINK_DURATION_PRICES, PRODUCTS, editorHref } from "@/lib/storefront";
import { authRequestOrigin } from "@/lib/auth/navigation";
import { adminClient, HttpError } from "./security";
import { confirmCheckout, databaseResult } from "./commerce";
import { stripeMode, stripeRequest, type StripeSession } from "./stripe";

type CheckoutOrder = StoreOrder & {buyer_id: string; stripe_session_id: string | null};
type Buyer = {id: string; email?: string};

export function checkoutReturnOrigin(request: Request) {
  const vercel = process.env.VERCEL === "1";
  const visitedOrigin = authRequestOrigin(request, vercel);
  // A copied production base URL must not send local test checkout returns to
  // the live website. Keep production/custom-proxy canonical behavior intact.
  if (!vercel && ["localhost", "127.0.0.1", "[::1]"].includes(new URL(visitedOrigin).hostname)) return visitedOrigin;
  return new URL(process.env.NEXT_PUBLIC_BASE_URL?.trim() || visitedOrigin).origin;
}

export async function createOrResumeCheckout(input: z.infer<typeof checkoutRequestSchema>, buyer: Buyer, origin: string, db: SupabaseClient = adminClient()) {
  const orders = () => db.from("store_orders").select("*").eq("buyer_id", buyer.id).eq("payment_mode", stripeMode());
  let order: CheckoutOrder | null;
  if (!("checkout_key" in input)) {
    order = await databaseResult(orders().eq("id", input.order_id).maybeSingle());
    if (!order) throw new HttpError(404, "Order not found in your account.");
  } else {
    // Reopening a product or retrying after a lost response must resume the
    // outstanding purchase, even when the browser generates a new attempt key.
    order = await databaseResult(orders().eq("checkout_key", input.checkout_key).maybeSingle());
    if (!order) order = await databaseResult(orders().eq("product_slug", input.product_slug).eq("duration_hours", input.duration_hours).eq("status", "pending").order("created_at", {ascending: false}).limit(1).maybeSingle());
    if (!order) {
      const product = PRODUCTS.find(item => item.slug === input.product_slug)!;
      const price = LINK_DURATION_PRICES.find(item => item.maxHours === input.duration_hours)!;
      await databaseResult(db.from("store_orders").upsert({buyer_id: buyer.id, checkout_key: input.checkout_key, product_slug: product.slug, product_name: product.name, duration_hours: price.maxHours, amount_cents: price.amountCents, payment_mode: stripeMode()}, {onConflict: "buyer_id,checkout_key", ignoreDuplicates: true}));
      order = await databaseResult(orders().eq("checkout_key", input.checkout_key).single());
    }
    if (!order || order.product_slug !== input.product_slug || order.duration_hours !== input.duration_hours) throw new HttpError(409, "Please start a new checkout for this selection.");
  }
  const product = PRODUCTS.find(item => item.slug === order.product_slug);
  const price = LINK_DURATION_PRICES.find(item => item.maxHours === order.duration_hours);
  if (!product || !price || order.amount_cents !== price.amountCents || order.currency !== "usd") throw new HttpError(409, "This order’s details could not be confirmed.");
  const accountUrl = `${origin}/profile?view=orders#order-${order.id}`;
  if (order.status === "paid") return {url: order.fulfilled_at ? accountUrl : `${origin}${editorHref(product)}?order=${order.id}`};
  if (order.status === "refunded") throw new HttpError(409, "This order was refunded. Choose a template to start a new purchase.");

  const previousSessionId = order.stripe_session_id;
  if (previousSessionId) {
    const previous = await stripeRequest<StripeSession>(`checkout/sessions/${encodeURIComponent(previousSessionId)}`);
    validateSession(previous, order);
    if (previous.status === "complete") {
      if (previous.payment_status === "paid") await confirmCheckout(previous.id, buyer.id, db);
      return {url: `${origin}/checkout/success?session_id=${encodeURIComponent(previous.id)}`};
    }
    if (previous.status === "open" && validCheckoutUrl(previous.url)) return {url: previous.url!};
    if (previous.status !== "expired") throw new HttpError(409, "Payment is still being processed. Please check this order again shortly.");
  }

  // Only an expired session is replaced. The new Stripe session keeps the same
  // order ID, price and entitlement; retries share its idempotency key.
  const params = new URLSearchParams({mode: "payment", client_reference_id: order.id, "metadata[order_id]": order.id, "payment_intent_data[metadata][order_id]": order.id,
    "line_items[0][price_data][currency]": order.currency, "line_items[0][price_data][unit_amount]": String(order.amount_cents),
    "line_items[0][price_data][product_data][name]": order.product_name,
    "line_items[0][price_data][product_data][description]": `One personalized link · ${price.label} from publication`,
    "line_items[0][quantity]": "1", "payment_method_types[0]": "card",
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`, cancel_url: accountUrl,
  });
  if (buyer.email) params.set("customer_email", buyer.email);
  const session = await stripeRequest<StripeSession>("checkout/sessions", "POST", params, `order-${order.id}${previousSessionId ? `-after-${previousSessionId}` : ""}`);
  validateSession(session, {...order, stripe_session_id: session.id});
  if (session.status !== "open" || !validCheckoutUrl(session.url)) throw new HttpError(502, "Checkout couldn’t be started. Please try again.");
  let update = db.from("store_orders").update({status: "pending", stripe_session_id: session.id, checkout_url: session.url, updated_at: new Date().toISOString()}).eq("id", order.id).eq("buyer_id", buyer.id).in("status", ["pending", "expired"]);
  update = previousSessionId ? update.eq("stripe_session_id", previousSessionId) : update.is("stripe_session_id", null);
  const attached = await databaseResult(update.select("id").maybeSingle());
  if (!attached) {
    const current: CheckoutOrder | null = await databaseResult(orders().eq("id", order.id).maybeSingle());
    if (!current || current.stripe_session_id !== session.id || current.status !== "pending") throw new HttpError(409, "This order has changed. Refresh My orders to see its latest status.");
  }
  return {url: session.url!};
}

function validCheckoutUrl(url: string | null) { return !!url?.startsWith("https://checkout.stripe.com/"); }
function validateSession(session: StripeSession, order: CheckoutOrder) {
  if (session.id !== order.stripe_session_id || session.metadata?.order_id !== order.id || session.client_reference_id !== order.id || session.livemode !== (order.payment_mode === "live") || session.currency !== order.currency || session.amount_total !== order.amount_cents) throw new HttpError(409, "Payment details don’t match this order.");
}
