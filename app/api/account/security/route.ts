import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminClient, apiError, jsonBody, rateLimit, requireSameOrigin, requireUser } from "@/lib/server/security";
import { deletePersonalAccount } from "@/lib/server/account-security";
import { runOpportunisticCleanup } from "@/lib/cloudinaryCleanup";

export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
    await requireUser();
    await rateLimit(request, "delete-account", 5);
    await deletePersonalAccount(adminClient(), await createClient(), await jsonBody(request, 2048));
    runOpportunisticCleanup();
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
