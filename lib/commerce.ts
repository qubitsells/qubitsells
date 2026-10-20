import { z } from "zod";
import { LINK_DURATION_PRICES, PRODUCTS } from "@/lib/storefront";

export const productSlugSchema = z.string().refine(slug => PRODUCTS.some(product => product.slug === slug), "Choose an available template.");
export const checkoutSchema = z.object({product_slug: productSlugSchema, duration_hours: z.union([z.literal(72), z.literal(168), z.literal(720)]), checkout_key: z.uuid()});
export const checkoutRequestSchema = z.union([z.object({order_id: z.uuid()}).strict(), checkoutSchema.extend({order_id: z.never().optional()})]);
export const reviewSchema = z.object({order_id: z.uuid(), rating: z.number().int().min(1).max(5), title: z.string().trim().min(3).max(120), body: z.string().trim().min(15).max(2000)});
export const money = (cents: number) => new Intl.NumberFormat("en-US", {style: "currency", currency: "USD"}).format(cents / 100);
export const durationLabel = (hours: number) => LINK_DURATION_PRICES.find(price => price.maxHours === hours)?.label || `${hours} hours`;
export type StoreOrder = {id: string; product_slug: string; product_name: string; duration_hours: number; amount_cents: number; currency: string; payment_mode: "test" | "live"; status: "pending" | "paid" | "expired" | "refunded"; created_at: string; paid_at: string | null; fulfilled_at: string | null; refunded_amount_cents: number; template_id: string | null; template?: {short_code: string; expires_at: string; deleting: boolean} | null};
export type ProductReview = {id: string; author_name: string; rating: number; title: string; body: string; created_at: string; updated_at: string; payment_mode: "test" | "live"};
export type AccountReviewEntry = {product_slug:string; product_name:string; payment_mode:"test"|"live"; order_id:string|null; purchased_at:string|null; review:ProductReview|null; can_review:boolean};
export type ReviewsData = {count: number; average: number | null; distribution: Record<string, number>; reviews: ProductReview[]; own_review: ProductReview | null; eligible_order_id: string | null; mode: "test" | "live"};
export type StoreNotification = {id: string; kind: "order" | "template_response" | "review_request" | "calendar_request" | "calendar_response"; title: string; message: string; href: string; read_at: string | null; created_at: string};
