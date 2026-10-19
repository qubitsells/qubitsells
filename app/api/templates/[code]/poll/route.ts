import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { adminClient, apiError, currentUser, HttpError, jsonBody, rateLimit, requireSameOrigin } from "@/lib/server/security";
import { resolvePollSchema, templateCode, votePollSchema } from "@/lib/security/validation";

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

    await rateLimit(request, "template-poll-read", 120);

    const { user, manageHash, partnerHash } = await getAuthCredentials(request, code);

    const { data, error } = await adminClient().rpc("bonded_get_template_poll", {
      link_code: code,
      manage_token_hash: manageHash,
      partner_receipt_hash: partnerHash,
      actor_id: user?.id || null,
    });

    if (error) {
      throw new HttpError(503, "Could not load poll.");
    }

    if (!data?.success) {
      throw new HttpError(404, data?.error || "Poll not found.");
    }

    return NextResponse.json({
      success: true,
      is_creator: Boolean(data?.is_creator),
      is_partner: Boolean(data?.is_partner),
      is_closed: Boolean(data?.is_closed),
      my_votes: Array.isArray(data?.my_votes) ? data.my_votes : [],
      poll: data?.poll || null,
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

export async function POST(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    await rateLimit(request, "template-poll-vote", 30);

    const { code } = await context.params;
    if (!templateCode.safeParse(code).success) throw new HttpError(404, "Template not found.");

    const parsed = votePollSchema.safeParse(await jsonBody(request));
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message || "Invalid vote submission.";
      throw new HttpError(400, firstIssue);
    }
    const input = parsed.data;

    const { jar, user, manageHash } = await getAuthCredentials(request, code);

    let partnerTokenToUse = jar.get(`bonded_reply_${code}`)?.value;
    const headerPartner = request.headers.get("x-reply-token");
    if (headerPartner && /^[a-f0-9]{64}$/.test(headerPartner)) {
      partnerTokenToUse = headerPartner;
    }

    let isNewPartnerToken = false;
    if (!input.is_creator_vote && (!partnerTokenToUse || !/^[a-f0-9]{64}$/.test(partnerTokenToUse))) {
      partnerTokenToUse = randomBytes(32).toString("hex");
      isNewPartnerToken = true;
    }

    const partnerHashToUse = partnerTokenToUse
      ? createHash("sha256").update(partnerTokenToUse).digest("hex")
      : null;

    const { data, error } = await adminClient().rpc("bonded_vote_template_poll", {
      link_code: code,
      expected_revision: input.expected_revision,
      selected_option_ids: JSON.stringify(input.selected_option_ids),
      is_creator_vote: input.is_creator_vote,
      manage_token_hash: manageHash,
      partner_token_hash: partnerHashToUse,
      actor_id: user?.id || null,
      custom_suggestion_text: input.custom_suggestion_text || null,
    });

    if (error) {
      if (error.code === "40001" || error.message.includes("Stale poll revision")) {
        throw new HttpError(409, "Stale poll revision. The options have changed. Please refresh to view the latest options.");
      }
      throw new HttpError(error.code === "42501" ? 403 : 400, error.message || "Failed to register vote.");
    }

    // Set partner receipt cookie if newly generated
    if (isNewPartnerToken && partnerTokenToUse) {
      jar.set(`bonded_reply_${code}`, partnerTokenToUse, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: `/`,
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    return NextResponse.json({
      success: true,
      resolved_option_id: data?.resolved_option_id,
      has_agreement: Boolean(data?.has_agreement),
      creator_voted: Boolean(data?.creator_voted),
      partner_voted: Boolean(data?.partner_voted),
      partner_token: isNewPartnerToken ? partnerTokenToUse : undefined,
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    await rateLimit(request, "template-poll-resolve", 30);

    const { code } = await context.params;
    if (!templateCode.safeParse(code).success) throw new HttpError(404, "Template not found.");

    const { user, manageHash } = await getAuthCredentials(request, code);
    if (!manageHash && !user?.id) {
      throw new HttpError(403, "Not authorized to resolve this poll.");
    }

    const parsed = resolvePollSchema.safeParse(await jsonBody(request));
    if (!parsed.success) {
      throw new HttpError(400, "Invalid agreed option.");
    }

    const { data, error } = await adminClient().rpc("bonded_resolve_poll_manually", {
      link_code: code,
      agreed_option_id: parsed.data.agreed_option_id,
      manage_token_hash: manageHash,
      actor_id: user?.id || null,
    });

    if (error) {
      throw new HttpError(400, error.message || "Failed to resolve poll.");
    }

    return NextResponse.json({
      success: true,
      resolved_option_id: data?.resolved_option_id,
    });
  } catch (error) {
    return apiError(error);
  }
}
