import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { replyReceipt } from "@/lib/template-reply";
import type { TemplateReply } from "@/lib/supabase/coupleTemplates";
import { adminClient, apiError, currentUser, HttpError, rateLimit } from "@/lib/server/security";
import { templateCode } from "@/lib/security/validation";

type Context = { params: Promise<{ code: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { code } = await context.params;
    if (!templateCode.safeParse(code).success) throw new HttpError(404, "Template not found.");

    await rateLimit(request, "template-replies-read", 120);

    const jar = await cookies();
    const user = await currentUser();

    // Check creator manage token: cookie, query param, or header
    const manageCookie = jar.get(`bonded_template_manage_${code}`)?.value || jar.get(`bonded_template_delete_${code}`)?.value;
    const urlManage = new URL(request.url).searchParams.get("manage");
    const headerManage = request.headers.get("x-manage-token");
    const manageToken = urlManage || headerManage || manageCookie;

    const manageHash = manageToken && /^[a-f0-9]{64}$/.test(manageToken)
      ? createHash("sha256").update(manageToken).digest("hex")
      : null;

    // Check partner receipt token: cookie or header
    const partnerCookie = jar.get(`bonded_reply_${code}`)?.value;
    const headerPartner = request.headers.get("x-reply-token");
    const partnerToken = headerPartner || partnerCookie || randomBytes(32).toString("hex");
    if (!partnerCookie && !headerPartner) jar.set(`bonded_reply_${code}`, partnerToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 60 * 60 * 24 * 30 });

    const partnerHash = partnerToken && /^[a-f0-9]{64}$/.test(partnerToken)
      ? createHash("sha256").update(partnerToken).digest("hex")
      : null;

    const { data, error } = await adminClient().rpc("bonded_get_template_replies", {
      link_code: code,
      partner_receipt_hash: partnerHash,
      manage_token_hash: manageHash,
      actor_id: user?.id || null,
    });

    if (error) {
      throw new HttpError(503, "Could not load replies.");
    }
    if (!data?.success) throw new HttpError(410, data?.error || "This template is no longer available.");

    const replies = Array.isArray(data?.replies) ? data.replies : [];
    // Ensure media items have accessible proxy URLs
    const formattedReplies = replies.map((reply: TemplateReply) => replyReceipt(reply, code)).sort((a: TemplateReply, b: TemplateReply) => Date.parse(b.created_at) - Date.parse(a.created_at));

    return NextResponse.json({
      success: true,
      is_creator: Boolean(data?.is_creator),
      replies: formattedReplies,
      my_reply: !data?.is_creator && formattedReplies.length > 0 ? formattedReplies[0] : null,
    }, {
      headers: {
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
