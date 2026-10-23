import { withNotificationEmails } from "@/lib/server/notification-email";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import {
  adminClient,
  apiError,
  currentUser,
  HttpError,
  jsonBody,
  rateLimit,
  requireSameOrigin,
} from "@/lib/server/security";
import {
  confirmRevealSchema,
  lockRevealAnswerSchema,
  saveRevealDraftSchema,
  templateCode,
  withdrawRevealAnswerSchema,
} from "@/lib/security/validation";

type Context = { params: Promise<{ code: string }> };

async function getAuthCredentials(request: Request, code: string) {
  const jar = await cookies();
  const user = await currentUser();

  // Creator credentials
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

  // Partner credentials
  let partnerToken = jar.get(`bonded_reply_${code}`)?.value;
  const headerPartner = request.headers.get("x-reply-token");
  if (headerPartner && /^[a-f0-9]{64}$/.test(headerPartner)) {
    partnerToken = headerPartner;
  }

  const partnerHash =
    partnerToken && /^[a-f0-9]{64}$/.test(partnerToken)
      ? createHash("sha256").update(partnerToken).digest("hex")
      : null;

  return { jar, user, manageHash, partnerToken, partnerHash };
}

export async function GET(request: Request, context: Context) {
  try {
    const { code } = await context.params;
    if (!templateCode.safeParse(code).success) throw new HttpError(404, "Template not found.");

    await rateLimit(request, "template-reveal-read", 120);

    const { user, manageHash, partnerHash } = await getAuthCredentials(request, code);

    const { data, error } = await adminClient().rpc("bonded_get_template_reveal", {
      link_code: code,
      manage_token_hash: manageHash,
      partner_receipt_hash: partnerHash,
      actor_id: user?.id || null,
    });

    if (error) {
      throw new HttpError(503, "Could not load private reveal.");
    }

    if (!data?.success) {
      throw new HttpError(404, data?.error || "Private reveal not found.");
    }

    return NextResponse.json({
      success: true,
      is_creator: Boolean(data?.is_creator),
      is_partner: Boolean(data?.is_partner),
      reveal: data?.reveal || null,
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
    await rateLimit(request, "template-reveal-write", 60);

    const { code } = await context.params;
    if (!templateCode.safeParse(code).success) throw new HttpError(404, "Template not found.");

    const raw = await jsonBody(request);
    const action = raw && typeof raw === "object" && (raw as { action?: string }).action ? (raw as { action: string }).action : "lock";

    const { jar, user, manageHash } = await getAuthCredentials(request, code);

    let partnerTokenToUse = jar.get(`bonded_reply_${code}`)?.value;
    const headerPartner = request.headers.get("x-reply-token");
    if (headerPartner && /^[a-f0-9]{64}$/.test(headerPartner)) {
      partnerTokenToUse = headerPartner;
    }

    const isCreatorRequest = Boolean((raw as { is_creator?: boolean })?.is_creator);

    let isNewPartnerToken = false;
    if (!isCreatorRequest && (!partnerTokenToUse || !/^[a-f0-9]{64}$/.test(partnerTokenToUse))) {
      partnerTokenToUse = randomBytes(32).toString("hex");
      isNewPartnerToken = true;
    }

    const partnerHashToUse = partnerTokenToUse
      ? createHash("sha256").update(partnerTokenToUse).digest("hex")
      : null;

    if (action === "draft") {
      const parsed = saveRevealDraftSchema.safeParse(raw);
      if (!parsed.success) {
        throw new HttpError(400, parsed.error.issues[0]?.message || "Invalid draft data.");
      }
      const input = parsed.data;

      const { data, error } = await adminClient().rpc("bonded_save_reveal_draft", {
        link_code: code,
        expected_revision: input.expected_revision,
        answers: JSON.stringify(input.answers),
        is_creator_action: input.is_creator,
        manage_token_hash: manageHash,
        partner_token_hash: partnerHashToUse,
        actor_id: user?.id || null,
      });

      if (error) {
        if (error.code === "40001" || error.message.includes("Stale reveal revision")) {
          throw new HttpError(409, "Stale reveal revision. The prompt has changed. Please refresh.");
        }
        throw new HttpError(error.code === "42501" ? 403 : 400, error.message || "Failed to save draft.");
      }

      if (isNewPartnerToken && partnerTokenToUse) {
        jar.set(`bonded_reply_${code}`, partnerTokenToUse, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: `/`,
          maxAge: 60 * 60 * 24 * 30,
        });
      }

      return NextResponse.json({
        success: true,
        action: "draft",
        saved_at: data?.saved_at || new Date().toISOString(),
      });
    }

    if (action === "withdraw") {
      const parsed = withdrawRevealAnswerSchema.safeParse(raw);
      if (!parsed.success) {
        throw new HttpError(400, "Invalid withdrawal request.");
      }
      const input = parsed.data;

      const { data, error } = await adminClient().rpc("bonded_withdraw_reveal_answer", {
        link_code: code,
        expected_revision: input.expected_revision,
        is_creator_action: input.is_creator,
        manage_token_hash: manageHash,
        partner_token_hash: partnerHashToUse,
        actor_id: user?.id || null,
      });

      if (error) {
        throw new HttpError(error.code === "42501" ? 403 : 400, error.message || "Cannot withdraw answer.");
      }

      return NextResponse.json({
        success: true,
        action: "withdraw",
        status: data?.status || "open",
      });
    }

    if (action === "confirm") {
      const parsed = confirmRevealSchema.safeParse(raw);
      if (!parsed.success) {
        throw new HttpError(400, "Invalid confirm reveal request.");
      }
      const input = parsed.data;

      const { data, error } = await adminClient().rpc("bonded_confirm_reveal", {
        link_code: code,
        expected_revision: input.expected_revision,
        is_creator_action: input.is_creator,
        manage_token_hash: manageHash,
        partner_token_hash: partnerHashToUse,
        actor_id: user?.id || null,
      });

      if (error) {
        throw new HttpError(error.code === "42501" ? 403 : 400, error.message || "Cannot reveal answers.");
      }

      return NextResponse.json({
        success: true,
        action: "confirm",
        status: data?.status || "revealed",
        revealed_at: data?.revealed_at || new Date().toISOString(),
      });
    }

    // Default: action === "lock"
    const parsed = lockRevealAnswerSchema.safeParse(raw);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message || "Invalid lock submission.");
    }
    const input = parsed.data;

    const { data, error } = await adminClient().rpc("bonded_lock_reveal_answer", {
      link_code: code,
      expected_revision: input.expected_revision,
      answers: JSON.stringify(input.answers),
      is_creator_action: input.is_creator,
      manage_token_hash: manageHash,
      partner_token_hash: partnerHashToUse,
      actor_id: user?.id || null,
    });

    if (error) {
      if (error.code === "40001" || error.message.includes("Stale reveal revision")) {
        throw new HttpError(409, "Stale reveal revision. The prompt has changed. Please refresh.");
      }
      throw new HttpError(error.code === "42501" ? 403 : 400, error.message || "Failed to lock answer.");
    }

    if (isNewPartnerToken && partnerTokenToUse) {
      jar.set(`bonded_reply_${code}`, partnerTokenToUse, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: `/`,
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return NextResponse.json({
      success: true,
      action: "lock",
      status: data?.status || "waiting",
      is_eligible: Boolean(data?.is_eligible),
    });
  } catch (error) {
    return apiError(error);
  }
}

export const POST = withNotificationEmails(handlePOST);
