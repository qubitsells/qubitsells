import { withNotificationEmails } from "@/lib/server/notification-email";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { adminClient, apiError, currentUser, HttpError, jsonBody, rateLimit, requireSameOrigin } from "@/lib/server/security";
import { manageInvitationSchema, respondInvitationSchema, templateCode } from "@/lib/security/validation";

type Context = { params: Promise<{ code: string }> };

async function getCreatorCredentials(request: Request, code: string) {
  const jar = await cookies();
  const user = await currentUser();

  const manageCookie =
    jar.get(`bonded_template_manage_${code}`)?.value ||
    jar.get(`bonded_template_delete_${code}`)?.value;
  const urlManage = new URL(request.url).searchParams.get("manage");
  const headerManage = request.headers.get("x-manage-token");
  const manageToken = urlManage || headerManage || manageCookie;

  const manageHash =
    manageToken && /^[a-f0-9]{64}$/.test(manageToken)
      ? createHash("sha256").update(manageToken).digest("hex")
      : null;

  return { manageHash, actorId: user?.id || null };
}

export async function GET(request: Request, context: Context) {
  try {
    const { code } = await context.params;
    if (!templateCode.safeParse(code).success) throw new HttpError(404, "Template not found.");

    await rateLimit(request, "template-invitation-read", 120);

    const { manageHash, actorId } = await getCreatorCredentials(request, code);

    const { data, error } = await adminClient().rpc("bonded_get_template_invitation", {
      link_code: code,
      manage_token_hash: manageHash,
      actor_id: actorId,
    });

    if (error) {
      throw new HttpError(503, "Could not load invitation details.");
    }

    if (!data?.success) {
      throw new HttpError(404, data?.error || "Template invitation not available.");
    }

    return NextResponse.json({
      success: true,
      is_creator: Boolean(data?.is_creator),
      invitation: data?.invitation || null,
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

async function handlePOST(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    await rateLimit(request, "template-invitation-respond", 30);

    const { code } = await context.params;
    if (!templateCode.safeParse(code).success) throw new HttpError(404, "Template not found.");

    const parsed = respondInvitationSchema.safeParse(await jsonBody(request));
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message || "Invalid RSVP response.";
      throw new HttpError(400, firstIssue);
    }
    const input = parsed.data;

    const { data, error } = await adminClient().rpc("bonded_respond_template_invitation", {
      link_code: code,
      expected_revision: input.expected_revision,
      response_type: input.response_type,
      chosen_slot: input.chosen_slot || null,
      suggested_slot: input.suggested_slot || null,
      partner_tz: input.partner_tz || null,
      partner_note_text: input.partner_note_text || null,
      activity_choices: [...new Set(input.activity_choices)],
      alternative_idea: input.alternative_idea || null,
      available_slot_ids: [...new Set(input.available_slot_ids)],
    });

    if (error) {
      if (error.code === "40001" || error.message.includes("Stale invitation revision")) {
        throw new HttpError(409, "Stale invitation revision. The date or details have changed. Please review the updated options.");
      }
      throw new HttpError(400, error.message || "Failed to process RSVP response.");
    }

    return NextResponse.json({
      success: true,
      status: data?.status,
      revision: data?.revision,
      invitation: data?.invitation,
    });
  } catch (error) {
    return apiError(error);
  }
}

async function handlePATCH(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    await rateLimit(request, "template-invitation-manage", 30);

    const { code } = await context.params;
    if (!templateCode.safeParse(code).success) throw new HttpError(404, "Template not found.");

    const { manageHash, actorId } = await getCreatorCredentials(request, code);
    if (!manageHash && !actorId) {
      throw new HttpError(403, "You do not have permission to manage this invitation.");
    }

    const parsed = manageInvitationSchema.safeParse(await jsonBody(request));
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message || "Invalid management action.";
      throw new HttpError(400, firstIssue);
    }
    const input = parsed.data;

    const { data, error } = await adminClient().rpc("bonded_manage_template_invitation", {
      link_code: code,
      action_type: input.action_type,
      manage_token_hash: manageHash,
      actor_id: actorId,
      new_slots: input.new_slots || null,
      new_private_notes: input.new_private_notes || null,
      selected_slot_id: input.selected_slot_id || null,
      expected_revision: input.expected_revision || null,
    });

    if (error) {
      throw new HttpError(error.code === "40001" ? 409 : error.code === "42501" ? 403 : 400, error.message || "Failed to update invitation.");
    }

    return NextResponse.json({
      success: true,
      result: data,
    });
  } catch (error) {
    return apiError(error);
  }
}

export const POST = withNotificationEmails(handlePOST);

export const PATCH = withNotificationEmails(handlePATCH);
