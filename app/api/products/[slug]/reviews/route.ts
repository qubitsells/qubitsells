import { NextResponse } from "next/server";
import { productSlugSchema, reviewSchema } from "@/lib/commerce";
import { adminClient, apiError, currentUser, HttpError, jsonBody, rateLimit, requireSameOrigin, requireUser } from "@/lib/server/security";
import { databaseResult, privateHeaders } from "@/lib/server/commerce";
import { stripeMode } from "@/lib/server/stripe";
import { completeReviewInvitations } from "@/lib/server/reviews";

type Context = {params: Promise<{slug: string}>};
export async function GET(request: Request, context: Context) {
  try {
    const {slug} = await context.params; if (!productSlugSchema.safeParse(slug).success) throw new HttpError(404, "Template not found.");
    const rawPage = Number(new URL(request.url).searchParams.get("page") || 0); const page = Number.isInteger(rawPage) ? Math.max(0, Math.min(rawPage, 10000)) : 0;
    const db = adminClient(), mode = stripeMode(), user = await currentUser();
    const publicReviews = await databaseResult(db.rpc("qubit_product_reviews", {p_slug: slug, p_mode: mode, p_page: page}));
    let ownReview = null, eligibleOrderId = null;
    if (user) {
      const [own, orders] = await Promise.all([
        databaseResult(db.from("store_reviews").select("id,author_name,rating,title,body,created_at,updated_at,payment_mode").eq("buyer_id", user.id).eq("product_slug", slug).eq("payment_mode", mode).maybeSingle()),
        databaseResult(db.from("store_orders").select("id").eq("buyer_id", user.id).eq("product_slug", slug).eq("payment_mode", mode).eq("status", "paid").order("paid_at", {ascending: false}).limit(1)),
      ]);
      ownReview = own; eligibleOrderId = orders?.[0]?.id || null;
    }
    return NextResponse.json({...publicReviews, own_review: ownReview, eligible_order_id: eligibleOrderId, mode}, {headers: privateHeaders});
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request, context: Context) {
  try {
    requireSameOrigin(request); const user = await requireUser(); await rateLimit(request, "product-review", 15);
    const {slug} = await context.params; const parsed = reviewSchema.safeParse(await jsonBody(request, 12000));
    if (!parsed.success || !productSlugSchema.safeParse(slug).success) throw new HttpError(400, "Choose a rating, a title (3–120 characters), and a review (15–2000 characters).");
    const db = adminClient(); const order = await databaseResult(db.from("store_orders").select("id").eq("id", parsed.data.order_id).eq("buyer_id", user.id).eq("product_slug", slug).eq("status", "paid").eq("payment_mode", stripeMode()).maybeSingle());
    if (!order) throw new HttpError(403, "A confirmed purchase of this template is required to leave a review.");
    const author = typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name.trim().slice(0, 80) : "QubitSells customer";
    await databaseResult(db.rpc("qubit_save_review", {p_actor_id: user.id, p_order_id: order.id, p_author_name: author || "QubitSells customer", p_rating: parsed.data.rating, p_title: parsed.data.title, p_body: parsed.data.body}));
    await completeReviewInvitations(user.id,slug,db);
    return NextResponse.json({success: true}, {headers: privateHeaders});
  } catch (error) { return apiError(error); }
}
export async function DELETE(request: Request, context: Context) {
  try { requireSameOrigin(request); const user = await requireUser(); const {slug} = await context.params;
    await databaseResult(adminClient().from("store_reviews").delete().eq("buyer_id", user.id).eq("product_slug", slug).eq("payment_mode", stripeMode()));
    return NextResponse.json({success: true}, {headers: privateHeaders});
  } catch (error) { return apiError(error); }
}
