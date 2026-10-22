import { NextResponse } from "next/server";
import { checkoutRequestSchema } from "@/lib/commerce";
import { adminClient, apiError, HttpError, jsonBody, rateLimit, requireSameOrigin, requireUser } from "@/lib/server/security";
import { privateHeaders } from "@/lib/server/commerce";
import { checkoutReturnOrigin, createOrResumeCheckout } from "@/lib/server/checkout";
import { stripeMode, stripeReady } from "@/lib/server/stripe";

export async function GET() {
  let available=false;
  if(stripeReady()){
    try {const {error}=await adminClient().from("store_orders").select("id").limit(0);available=!error;}catch{}
  }
  return NextResponse.json({available, mode: stripeMode()}, {headers: privateHeaders});
}
export async function POST(request: Request) {
  try {
    requireSameOrigin(request); const user = await requireUser(); await rateLimit(request, "checkout", 20);
    if (!stripeReady()) throw new HttpError(503, "Checkout is temporarily unavailable. Please try again later.");
    const input = checkoutRequestSchema.safeParse(await jsonBody(request, 4096));
    if (!input.success) throw new HttpError(400, "Choose a template and a valid link duration.");
    const origin = checkoutReturnOrigin(request);
    const result = await createOrResumeCheckout(input.data, user, origin);
    return NextResponse.json(result, {headers: privateHeaders});
  } catch (error) { return apiError(error); }
}
