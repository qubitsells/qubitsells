import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { HttpError } from "./security";

export const stripeMode = (): "test" | "live" => process.env.STRIPE_MODE === "live" ? "live" : "test";
export function stripeReady() { return new RegExp(`^sk_${stripeMode()}_[A-Za-z0-9]{20,}$`).test(process.env.STRIPE_SECRET_KEY||"") && /^whsec_[A-Za-z0-9]{20,}$/.test(process.env.STRIPE_WEBHOOK_SECRET||""); }
export async function stripeRequest<T>(path: string, method: "GET" | "POST" = "GET", body?: URLSearchParams, idempotencyKey?: string): Promise<T> {
  if (!stripeReady()) throw new HttpError(503, "Checkout is being prepared. Please try again later.");
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {method, cache: "no-store", signal: AbortSignal.timeout(20000), headers: {
    Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "Stripe-Version": "2025-02-24.acacia",
    ...(body ? {"Content-Type": "application/x-www-form-urlencoded"} : {}), ...(idempotencyKey ? {"Idempotency-Key": idempotencyKey} : {}),
  }, ...(body ? {body} : {})});
  if (!response.ok) throw new HttpError(502, "The payment provider couldn’t complete this request. Please try again.");
  return response.json() as Promise<T>;
}
export type StripeSession = {id: string; object: "checkout.session"; url: string | null; status: string; payment_status: string; amount_total: number | null; currency: string | null; livemode: boolean; client_reference_id: string | null; metadata: {order_id?: string}; payment_intent: string | null; line_items?: {data: {quantity: number; amount_total: number}[]}};
export type StripeIntent = {id:string;status:string;amount:number;currency:string;livemode:boolean;metadata:{order_id?:string};latest_charge:{amount:number;amount_refunded:number}|null};
export function verifyStripeSignature(raw: Buffer, header: string | null, secret: string, now = Date.now()) {
  if (!header || !secret.startsWith("whsec_")) throw new HttpError(400, "Invalid webhook signature.");
  const parts = header.split(",").map(part => part.split("="));
  const timestamps = parts.filter(([key]) => key === "t");
  const stamp = timestamps[0]?.[1];
  if (timestamps.length !== 1 || !/^\d+$/.test(stamp || "") || Math.abs(now / 1000 - Number(stamp)) > 300) throw new HttpError(400, "Invalid webhook timestamp.");
  const expected = createHmac("sha256", secret).update(`${stamp}.`).update(raw).digest();
  if (!parts.some(([key, value]) => key === "v1" && /^[a-f0-9]{64}$/.test(value || "") && timingSafeEqual(expected, Buffer.from(value, "hex")))) throw new HttpError(400, "Invalid webhook signature.");
}
