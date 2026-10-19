import { NextResponse } from "next/server";
import { apiError,HttpError,requiredEnv,secretMatches } from "@/lib/server/security";
import { purgeAllExpiredTemplates } from "@/lib/cloudinaryCleanup";
export const maxDuration=120;
async function cleanup(request:Request) {
  try {
    const secret=requiredEnv("CRON_SECRET");
    if(!secretMatches(request.headers.get("authorization")?.replace(/^Bearer\s+/i,"") || null,secret))throw new HttpError(401,"Unauthorized.");
    const result=await purgeAllExpiredTemplates();
    return NextResponse.json(result,{status:result.success?200:503});
  } catch(error) {return apiError(error);}
}
export const GET=cleanup;
export const POST=cleanup;
