import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import {
  adminClient,
  apiError,
  currentUser,
  guestIdentity,
  HttpError,
  jsonBody,
  rateLimit,
  requireSameOrigin,
} from "@/lib/server/security";
import {
  submitPartnerSideSchema,
  templateCode,
} from "@/lib/security/validation";
import { runOpportunisticCleanup } from "@/lib/cloudinaryCleanup";

type Context = { params: Promise<{ code: string }> };

export const STORY_RETENTION_NOTICE =
  "Ephemeral story memory: Saved with this template. Follows template expiry and deletion rules. Not permanent cloud album storage.";

async function getAuthCredentials(request: Request, code: string) {
  const jar = await cookies();
  const user = await currentUser();

  // Manage token for creator
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

  // Partner receipt token
  let partnerToken =
    jar.get(`bonded_story_partner_${code}`)?.value ||
    jar.get(`bonded_reply_${code}`)?.value ||
    request.headers.get("x-partner-token");

  const partnerHash =
    partnerToken && /^[a-f0-9]{64}$/.test(partnerToken)
      ? createHash("sha256").update(partnerToken).digest("hex")
      : null;

  return { manageHash, partnerToken, partnerHash, actorId: user?.id || null };
}

export async function GET(request: Request, context: Context) {
  try {
    const { code } = await context.params;
    if (!templateCode.safeParse(code).success) throw new HttpError(404, "Template not found.");

    await rateLimit(request, "template-our-story-read", 120);

    const { manageHash, partnerHash, actorId } = await getAuthCredentials(request, code);

    const { data, error } = await adminClient().rpc("bonded_get_template_our_story", {
      p_link_code: code,
      p_manage_token_hash: manageHash,
      p_partner_token_hash: partnerHash,
      p_actor_id: actorId,
    });

    if (error) {
      throw new HttpError(503, "Could not load Our Story memories.");
    }

    if (!data?.success) {
      throw new HttpError(404, data?.error || "Our Story memories not found.");
    }

    return NextResponse.json(
      {
        success: true,
        is_creator: Boolean(data?.is_creator),
        is_partner: Boolean(data?.is_partner),
        story: data?.story || null,
        retention_policy: STORY_RETENTION_NOTICE,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
          "Referrer-Policy": "no-referrer",
        },
      }
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    await rateLimit(request, "template-our-story-contribute", 30);

    const { code } = await context.params;
    if (!templateCode.safeParse(code).success) throw new HttpError(404, "Template not found.");

    const raw = await jsonBody(request);
    const parsed = submitPartnerSideSchema.safeParse(raw);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message || "Invalid contribution content.";
      throw new HttpError(400, firstIssue);
    }

    const { manageHash, actorId } = await getAuthCredentials(request, code);
    const jar = await cookies();
    const guest = await guestIdentity(true);

    // If caller has creator manage hash or is recognized as creator, block them from submitting as partner
    const { data: storyData } = await adminClient().rpc("bonded_get_template_our_story", {
      p_link_code: code,
      p_manage_token_hash: manageHash,
      p_actor_id: actorId,
    });

    if (storyData?.is_creator) {
      throw new HttpError(403, "Template creators cannot submit the partner's side of the story.");
    }

    // Partner receipt token
    let partnerToken = jar.get(`bonded_story_partner_${code}`)?.value;
    if (!partnerToken || !/^[a-f0-9]{64}$/.test(partnerToken)) {
      partnerToken = randomBytes(32).toString("hex");
    }
    const partnerHash = createHash("sha256").update(partnerToken).digest("hex");

    const input = parsed.data;

    const { data, error } = await adminClient().rpc("bonded_submit_our_story_partner_side", {
      p_link_code: code,
      p_author_name: input.author_name || "My Love",
      p_caption: input.caption,
      p_photo_url: input.photo_url,
      p_date: input.date || null,
      p_asset_id: input.asset_id || null,
      p_partner_token_hash: partnerHash,
      p_actor_id: actorId,
      p_guest_owner: guest,
    });

    if (error) {
      throw new HttpError(
        error.code === "42501" ? 403 : 503,
        error.message || "Failed to submit your side of the story."
      );
    }

    // Set partner receipt cookie
    jar.set(`bonded_story_partner_${code}`, partnerToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    runOpportunisticCleanup();

    return NextResponse.json({
      success: true,
      partner_contribution: data?.partner_contribution,
      retention_policy: STORY_RETENTION_NOTICE,
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    await rateLimit(request, "template-our-story-delete", 30);

    const { code } = await context.params;
    if (!templateCode.safeParse(code).success) throw new HttpError(404, "Template not found.");

    const { manageHash, partnerHash, actorId } = await getAuthCredentials(request, code);

    const { error } = await adminClient().rpc("bonded_delete_our_story_partner_side", {
      p_link_code: code,
      p_partner_token_hash: partnerHash,
      p_manage_token_hash: manageHash,
      p_actor_id: actorId,
    });

    if (error) {
      throw new HttpError(
        error.code === "42501" ? 403 : 503,
        error.message || "Not authorized to delete this contribution."
      );
    }

    runOpportunisticCleanup();

    return NextResponse.json({
      success: true,
      message: "Story contribution removed.",
      retention_policy: STORY_RETENTION_NOTICE,
    });
  } catch (error) {
    return apiError(error);
  }
}
