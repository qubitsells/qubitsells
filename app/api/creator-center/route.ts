import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { adminClient, apiError, currentUser, rateLimit } from "@/lib/server/security";
import { loadCreatorCenter } from "@/lib/server/creator-center";
import { runOpportunisticCleanup } from "@/lib/cloudinaryCleanup";

export async function GET(request: Request) {
  try {
    await rateLimit(request, "creator-center-read", 60);
    const jar = await cookies();
    const user = await currentUser();
    const hashes = new Set<string>();
    const addToken = (token: string) => {
      if (/^[a-f0-9]{64}$/.test(token)) hashes.add(createHash("sha256").update(token).digest("hex"));
    };
    for (const cookie of jar.getAll()) {
      if (/^bonded_template_(manage|delete)_/.test(cookie.name)) addToken(cookie.value);
    }
    for (const token of (new URL(request.url).searchParams.get("tokens") || "").split(",").slice(0, 50)) addToken(token.trim());

    // Account ownership or a matching private token is required. Short codes
    // alone are public recipient links and cannot grant access to responses.
    const templates = await loadCreatorCenter(adminClient(), user?.id || null, [...hashes]);
    runOpportunisticCleanup();
    return NextResponse.json({
      success: true,
      user_id: user?.id || null,
      templates: templates.map(item => ({
        ...item,
        manage_token: jar.get(`bonded_template_manage_${item.short_code}`)?.value || null,
      })),
    }, { headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
  } catch (error) { return apiError(error); }
}
