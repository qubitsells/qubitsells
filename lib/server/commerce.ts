import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { adminClient, HttpError } from "./security";
import { stripeMode, stripeRequest, type StripeSession, type StripeIntent } from "./stripe";
import type { StoreOrder } from "@/lib/commerce";
import { inviteOrderReview } from "./reviews";

export const privateHeaders = {"Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer"};
export async function databaseResult<T>(operation: PromiseLike<{data: T; error: unknown}>) {
  const {data, error} = await operation;
  if (error) throw new HttpError(503, "This feature is temporarily unavailable. Please try again shortly.");
  return data;
}
export function validatePaidSession(session: StripeSession, order: StoreOrder & {stripe_session_id: string | null}) {
  if (session.id !== order.stripe_session_id || session.metadata?.order_id !== order.id || session.client_reference_id !== order.id
    || session.livemode !== (order.payment_mode === "live") || session.currency !== "usd" || session.amount_total !== order.amount_cents
    || session.payment_status !== "paid" || session.status !== "complete" || !session.payment_intent
    || session.line_items?.data.length !== 1 || session.line_items.data[0].quantity !== 1 || session.line_items.data[0].amount_total !== order.amount_cents) throw new HttpError(409, "Payment is not confirmed for this order.");
}
export async function confirmCheckout(sessionId: string, buyerId?: string, client: SupabaseClient = adminClient()) {
  if (!/^cs_(test_)?[a-zA-Z0-9_]{8,250}$/.test(sessionId)) throw new HttpError(400, "Invalid checkout reference.");
  let query = client.from("store_orders").select("*").eq("stripe_session_id", sessionId).eq("payment_mode", stripeMode());
  if (buyerId) query = query.eq("buyer_id", buyerId);
  const order = await databaseResult(query.maybeSingle());
  if (!order) throw new HttpError(404, "Order not found in your account.");
  const session = await stripeRequest<StripeSession>(`checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=line_items`);
  if (session.payment_status !== "paid") return {id: order.id, status: order.status};
  validatePaidSession(session, order);
  // Reconcile with the current charge too: a refund webhook can arrive before
  // the checkout completion webhook or before the customer returns.
  const intent=await stripeRequest<StripeIntent>(`payment_intents/${encodeURIComponent(session.payment_intent!)}?expand[]=latest_charge`);
  const charge=intent.latest_charge;
  if(!charge||intent.id!==session.payment_intent||intent.status!=="succeeded"||intent.amount!==order.amount_cents||intent.currency!=="usd"||intent.livemode!==(order.payment_mode==="live")||intent.metadata?.order_id!==order.id||charge.amount!==order.amount_cents)throw new HttpError(409,"Payment details don’t match this order.");
  const refunded=charge.amount_refunded;
  if(!Number.isInteger(refunded)||refunded<0||refunded>order.amount_cents)throw new HttpError(409,"Payment details could not be confirmed.");
  const status=refunded===order.amount_cents||order.status==="refunded"?"refunded":"paid";
  if (order.status !== "refunded") await databaseResult(client.from("store_orders").update({status, refunded_amount_cents:refunded,stripe_payment_intent_id: session.payment_intent, paid_at: order.paid_at || new Date().toISOString(), updated_at: new Date().toISOString()}).eq("id", order.id).in("status", ["pending", "expired","paid"]).lte("refunded_amount_cents",refunded));
  if(status==="paid")await inviteOrderReview(order,client);
  return {id: order.id, status, product_slug:order.product_slug};
}
