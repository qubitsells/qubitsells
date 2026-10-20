import { NextResponse } from "next/server";
import { productSlugSchema } from "@/lib/commerce";
import { adminClient, apiError, HttpError, jsonBody, requireSameOrigin, requireUser } from "@/lib/server/security";
import { databaseResult, privateHeaders } from "@/lib/server/commerce";

export async function GET() {
  try { const user = await requireUser(); const items = await databaseResult(adminClient().from("store_wishlist").select("product_slug,created_at").eq("buyer_id", user.id).order("created_at", {ascending: false}));
    return NextResponse.json({items}, {headers: privateHeaders});
  } catch (error) { return apiError(error); }
}
async function mutate(request: Request, remove: boolean) {
  try { requireSameOrigin(request); const user = await requireUser(); const input = await jsonBody(request, 1024) as {product_slug?: unknown}; const parsed = productSlugSchema.safeParse(input.product_slug);
    if (!parsed.success) throw new HttpError(400, "Choose an available template.");
    const db = adminClient();
    if (remove) await databaseResult(db.from("store_wishlist").delete().eq("buyer_id", user.id).eq("product_slug", parsed.data));
    else await databaseResult(db.from("store_wishlist").upsert({buyer_id: user.id, product_slug: parsed.data}, {onConflict: "buyer_id,product_slug", ignoreDuplicates: true}));
    return NextResponse.json({success: true}, {headers: privateHeaders});
  } catch (error) { return apiError(error); }
}
export const POST = (request: Request) => mutate(request, false);
export const DELETE = (request: Request) => mutate(request, true);
