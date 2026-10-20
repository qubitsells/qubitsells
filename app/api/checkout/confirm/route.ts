import { NextResponse } from "next/server";
import { apiError, HttpError, jsonBody, rateLimit, requireSameOrigin, requireUser } from "@/lib/server/security";
import { confirmCheckout, privateHeaders } from "@/lib/server/commerce";

export async function POST(request: Request) {
  try { requireSameOrigin(request); const user = await requireUser(); await rateLimit(request, "checkout-confirm", 40);
    const input = await jsonBody(request, 1024) as {session_id?: unknown};
    if (typeof input.session_id !== "string") throw new HttpError(400, "Checkout reference is required.");
    return NextResponse.json(await confirmCheckout(input.session_id, user.id), {headers: privateHeaders});
  } catch (error) { return apiError(error); }
}
