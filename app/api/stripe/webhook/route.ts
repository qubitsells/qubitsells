import { NextResponse } from "next/server";
import { adminClient, apiError, boundedBody, HttpError } from "@/lib/server/security";
import { confirmCheckout, databaseResult } from "@/lib/server/commerce";
import { stripeMode, stripeRequest, verifyStripeSignature,type StripeIntent } from "@/lib/server/stripe";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const raw = await boundedBody(request, 128 * 1024);
    verifyStripeSignature(raw, request.headers.get("stripe-signature"), process.env.STRIPE_WEBHOOK_SECRET || "");
    const event = JSON.parse(raw.toString("utf8")) as {type: string; livemode: boolean; data: {object: {id: string; payment_intent?: string; amount?: number; amount_refunded?: number; currency?: string}}};
    if (event.livemode !== (stripeMode() === "live")) throw new HttpError(400, "Webhook mode does not match this store.");
    const object = event.data.object;
    if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) await confirmCheckout(object.id);
    else if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
      await databaseResult(adminClient().from("store_orders").update({status: "expired", updated_at: new Date().toISOString()}).eq("stripe_session_id", object.id).eq("payment_mode", stripeMode()).eq("status", "pending"));
    } else if (event.type === "charge.refunded" && typeof object.payment_intent === "string") {
      const db = adminClient();
      const intent=await stripeRequest<StripeIntent>(`payment_intents/${encodeURIComponent(object.payment_intent)}`);
      const order = intent.metadata?.order_id?await databaseResult(db.from("store_orders").select("id,amount_cents,refunded_amount_cents").eq("id",intent.metadata.order_id).eq("payment_mode", stripeMode()).maybeSingle()):null;
      if (order && object.currency === "usd" && object.amount === order.amount_cents && Number.isInteger(object.amount_refunded) && object.amount_refunded! > order.refunded_amount_cents && object.amount_refunded! <= order.amount_cents) {
        await databaseResult(db.from("store_orders").update({status: object.amount_refunded === order.amount_cents ? "refunded" : "paid",stripe_payment_intent_id:object.payment_intent,refunded_amount_cents: object.amount_refunded, updated_at: new Date().toISOString()}).eq("id", order.id).lt("refunded_amount_cents", object.amount_refunded));
      }
    }
    return NextResponse.json({received: true});
  } catch (error) { return apiError(error); }
}
