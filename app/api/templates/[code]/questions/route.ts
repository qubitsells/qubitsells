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
  saveQuestionDraftSchema,
  submitQuestionAnswersSchema,
  templateCode,
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

    await rateLimit(request, "template-questions-read", 120);

    const { user, manageHash, partnerHash } = await getAuthCredentials(request, code);

    const { data, error } = await adminClient().rpc("bonded_get_template_questions", {
      link_code: code,
      manage_token_hash: manageHash,
      partner_receipt_hash: partnerHash,
      actor_id: user?.id || null,
    });

    if (error) {
      throw new HttpError(503, "Could not load question card.");
    }

    if (!data?.success) {
      throw new HttpError(404, data?.error || "Question card not found.");
    }

    return NextResponse.json({
      success: true,
      is_creator: Boolean(data?.is_creator),
      is_partner: Boolean(data?.is_partner),
      card: data?.card || null,
      my_draft: data?.my_draft || null,
      my_submission: data?.my_submission || null,
      partner_submission: data?.partner_submission || null,
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
    await rateLimit(request, "template-questions-write", 60);

    const { code } = await context.params;
    if (!templateCode.safeParse(code).success) throw new HttpError(404, "Template not found.");

    const raw = await jsonBody(request);
    const action = raw && typeof raw === "object" && (raw as { action?: string }).action === "draft" ? "draft" : "submit";

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
      const parsedDraft = saveQuestionDraftSchema.safeParse(raw);
      if (!parsedDraft.success) {
        const firstIssue = parsedDraft.error.issues[0]?.message || "Invalid draft data.";
        throw new HttpError(400, firstIssue);
      }
      const input = parsedDraft.data;

      const { data, error } = await adminClient().rpc("bonded_save_question_draft", {
        link_code: code,
        expected_revision: input.expected_revision,
        answers: input.answers,
        is_creator_draft: input.is_creator,
        manage_token_hash: manageHash,
        partner_token_hash: partnerHashToUse,
        actor_id: user?.id || null,
      });

      if (error) {
        if (error.code === "40001" || error.message.includes("Stale question revision")) {
          throw new HttpError(409, "Stale question revision. The questions have changed. Please refresh to view the latest questions.");
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
        is_draft: true,
        saved_at: data?.saved_at || new Date().toISOString(),
        partner_token: isNewPartnerToken ? partnerTokenToUse : undefined,
      });
    }

    // Otherwise final submission
    const parsedSubmit = submitQuestionAnswersSchema.safeParse(raw);
    if (!parsedSubmit.success) {
      const firstIssue = parsedSubmit.error.issues[0]?.message || "Invalid answers submission.";
      throw new HttpError(400, firstIssue);
    }
    const input = parsedSubmit.data;

    const { data, error } = await adminClient().rpc("bonded_submit_question_answers", {
      link_code: code,
      expected_revision: input.expected_revision,
      answers: input.answers,
      is_creator_submission: input.is_creator,
      manage_token_hash: manageHash,
      partner_token_hash: partnerHashToUse,
      actor_id: user?.id || null,
    });

    if (error) {
      if (error.code === "40001" || error.message.includes("Stale question revision")) {
        throw new HttpError(409, "Stale question revision. The questions have changed. Please refresh to view the latest questions.");
      }
      throw new HttpError(error.code === "42501" ? 403 : 400, error.message || "Failed to submit answers.");
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
      is_draft: false,
      submitted_at: data?.submitted_at || new Date().toISOString(),
      partner_token: isNewPartnerToken ? partnerTokenToUse : undefined,
    });
  } catch (error) {
    return apiError(error);
  }
}

export const POST = withNotificationEmails(handlePOST);
