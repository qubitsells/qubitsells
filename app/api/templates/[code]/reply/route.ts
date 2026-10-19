import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { adminClient, apiError, currentUser, guestIdentity, HttpError, jsonBody, rateLimit, requireSameOrigin } from "@/lib/server/security";
import { mediaIds, submitReplySchema, templateCode, uuid } from "@/lib/security/validation";
import { runOpportunisticCleanup } from "@/lib/cloudinaryCleanup";
import type { ReplyToolConfig } from "@/lib/supabase/coupleTemplates";

type Context = { params: Promise<{ code: string }> };

export const DELETION_POLICY_NOTICE =
  "The reply and its server-stored media have been permanently removed. Downloaded, screenshotted, or offline copies retained by the recipient cannot be deleted remotely.";

export async function POST(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    await rateLimit(request, "template-reply-submit", 20);

    const { code } = await context.params;
    if (!templateCode.safeParse(code).success) throw new HttpError(404, "Template not found.");

    const parsed = submitReplySchema.safeParse(await jsonBody(request));
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message || "Invalid reply content.";
      throw new HttpError(400, firstIssue);
    }
    const input = parsed.data;

    // Check template and tool configuration
    const { data: tmpl, error: tmplError } = await adminClient().rpc("bonded_template_operation", { link_code: code, operation: "read" });
    if (tmplError || !tmpl) throw new HttpError(404, "Template not found.");
    if (tmpl.expired) throw new HttpError(410, "This template has expired and is no longer accepting replies.");

    const tools = Array.isArray(tmpl.tools) ? tmpl.tools : [];
    const replyTool = tools.find((t: Record<string, unknown>) => t.type === "reply" || t.id === "reply_t01") as ReplyToolConfig | undefined;

    // Default configuration if not explicitly configured in template
    const maxChars = replyTool?.maxChars ?? 2000;
    const maxPhotos = replyTool?.maxPhotos ?? 3;
    const formats = replyTool?.enabledFormats ?? { text: true, photo: true, voice: true };

    if (input.message && !formats.text) {
      throw new HttpError(400, "Text replies are not enabled for this template.");
    }
    if (input.message.length > maxChars) {
      throw new HttpError(400, `Message cannot exceed ${maxChars} characters.`);
    }

    const photos = input.media_items.filter(m => m.type === "image" || m.media_type === "photo");
    const voices = input.media_items.filter(m => m.media_type === "voice" || (m.type === "video" && m.media_type !== "photo"));

    if (photos.length > 0 && !formats.photo) {
      throw new HttpError(400, "Photo replies are not enabled for this template.");
    }
    if (photos.length > maxPhotos) {
      throw new HttpError(400, `You can attach at most ${maxPhotos} photos.`);
    }
    if (voices.length > 0 && !formats.voice) {
      throw new HttpError(400, "Voice replies are not enabled for this template.");
    }
    if (voices.length > 1) {
      throw new HttpError(400, "You can attach at most one voice note per reply.");
    }

    const user = await currentUser();
    const guest = await guestIdentity(true);

    // Partner receipt token for verification on refresh
    const jar = await cookies();
    let partnerToken = jar.get(`bonded_reply_${code}`)?.value;
    if (!partnerToken || !/^[a-f0-9]{64}$/.test(partnerToken)) {
      partnerToken = randomBytes(32).toString("hex");
    }
    const partnerTokenHash = createHash("sha256").update(partnerToken).digest("hex");

    const assetIds = mediaIds(input.media_items);

    const { data, error } = await adminClient().rpc("bonded_submit_template_reply", {
      link_code: code,
      client_id: input.client_id,
      author_name: input.author_name || "My Love",
      message_content: input.message || "",
      reaction_content: input.reaction || null,
      asset_ids: assetIds,
      partner_token_hash: partnerTokenHash,
      actor_id: user?.id || null,
      guest_owner: guest,
    });

    if (error) {
      throw new HttpError(error.code === "42501" ? 403 : 503, error.message || "Failed to submit reply.");
    }

    // Set partner receipt cookie
    jar.set(`bonded_reply_${code}`, partnerToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: `/`,
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    runOpportunisticCleanup();

    return NextResponse.json({
      success: true,
      idempotent: data.idempotent,
      receipt: data.reply,
      receipt_token: partnerToken,
      deletion_policy: DELETION_POLICY_NOTICE,
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    await rateLimit(request, "template-reply-delete", 30);

    const { code } = await context.params;
    if (!templateCode.safeParse(code).success) throw new HttpError(404, "Template not found.");

    const body = await jsonBody(request) as { reply_id?: string; manage_token?: string };
    const replyId = body?.reply_id;
    if (!replyId || !uuid.safeParse(replyId).success) {
      throw new HttpError(400, "Valid reply ID is required.");
    }

    const jar = await cookies();
    const user = await currentUser();

    // Check manage token for creator
    const manageCookie = jar.get(`bonded_template_manage_${code}`)?.value || jar.get(`bonded_template_delete_${code}`)?.value;
    const manageToken = body.manage_token || manageCookie || new URL(request.url).searchParams.get("manage");
    const manageHash = manageToken && /^[a-f0-9]{64}$/.test(manageToken)
      ? createHash("sha256").update(manageToken).digest("hex")
      : null;

    // Check partner receipt token
    const partnerCookie = jar.get(`bonded_reply_${code}`)?.value || request.headers.get("x-reply-token");
    const partnerHash = partnerCookie && /^[a-f0-9]{64}$/.test(partnerCookie)
      ? createHash("sha256").update(partnerCookie).digest("hex")
      : null;

    const { error } = await adminClient().rpc("bonded_delete_template_reply", {
      reply_id: replyId,
      link_code: code,
      partner_receipt_hash: partnerHash,
      manage_token_hash: manageHash,
      actor_id: user?.id || null,
    });

    if (error) {
      throw new HttpError(error.code === "42501" ? 403 : 503, "Not authorized to delete this reply.");
    }

    runOpportunisticCleanup();

    return NextResponse.json({
      success: true,
      message: "Reply deleted successfully.",
      deletion_policy: DELETION_POLICY_NOTICE,
    });
  } catch (error) {
    return apiError(error);
  }
}
