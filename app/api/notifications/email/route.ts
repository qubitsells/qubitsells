import { NextResponse } from "next/server";
import { apiError, HttpError, requiredEnv, secretMatches } from "@/lib/server/security";
import { deliverNotificationEmails } from "@/lib/server/notification-email";

export const runtime = "nodejs";
export const maxDuration = 120;

async function deliver(request: Request) {
  try {
    const secret = requiredEnv("CRON_SECRET");
    if (!secretMatches(request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || null, secret)) throw new HttpError(401, "Unauthorized.");
    // The request cannot choose recipients or content. Only queued database events are sent.
    const result = await deliverNotificationEmails();
    return NextResponse.json(result, { status: result.deferred ? 503 : 200, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
export const POST = deliver;
export const GET = deliver;
