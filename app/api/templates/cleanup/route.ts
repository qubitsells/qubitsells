import { NextResponse } from "next/server";
import { apiError,HttpError,requiredEnv,secretMatches } from "@/lib/server/security";
import { purgeAllExpiredTemplates } from "@/lib/cloudinaryCleanup";
import { deliverNotificationEmails } from "@/lib/server/notification-email";
export const maxDuration=120;
async function cleanup(request:Request) {
  try {
    const secret=requiredEnv("CRON_SECRET");
    if(!secretMatches(request.headers.get("authorization")?.replace(/^Bearer\s+/i,"") || null,secret))throw new HttpError(401,"Unauthorized.");
    const [cleaned,emailed]=await Promise.allSettled([purgeAllExpiredTemplates(),deliverNotificationEmails()]);
    if(cleaned.status==="rejected")throw cleaned.reason;
    if(emailed.status==="rejected")throw new HttpError(503,"Email delivery is temporarily unavailable. Queued messages are retained.");
    const result=cleaned.value;
    return NextResponse.json({...result,emails:emailed.value},{status:result.success&&!emailed.value.deferred?200:503});
  } catch(error) {return apiError(error);}
}
export const GET=cleanup;
export const POST=cleanup;
