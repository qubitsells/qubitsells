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
  mutateBucketListSchema,
  templateCode,
} from "@/lib/security/validation";
import { runOpportunisticCleanup } from "@/lib/cloudinaryCleanup";

type Context = { params: Promise<{ code: string }> };

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
    jar.get(`bonded_bucket_list_${code}`)?.value ||
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

    await rateLimit(request, "template-bucket-list-read", 120);

    const { manageHash, partnerHash, actorId } = await getAuthCredentials(request, code);

    const { data, error } = await adminClient().rpc("bonded_get_template_bucket_list", {
      p_link_code: code,
      p_manage_token_hash: manageHash,
      p_partner_token_hash: partnerHash,
      p_actor_id: actorId,
    });

    if (error) {
      throw new HttpError(503, "Could not load Mini Couple Bucket List.");
    }

    if (!data?.success) {
      throw new HttpError(404, data?.error || "Bucket list not found.");
    }

    return NextResponse.json(
      {
        success: true,
        is_creator: Boolean(data?.is_creator),
        is_partner: Boolean(data?.is_partner),
        bucket_list: data?.bucket_list || null,
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
    await rateLimit(request, "template-bucket-list-mutate", 60);

    const { code } = await context.params;
    if (!templateCode.safeParse(code).success) throw new HttpError(404, "Template not found.");

    const raw = await jsonBody(request);
    const parsed = mutateBucketListSchema.safeParse(raw);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message || "Invalid bucket list mutation.";
      throw new HttpError(400, firstIssue);
    }

    const { manageHash, actorId } = await getAuthCredentials(request, code);
    const jar = await cookies();
    const guest = await guestIdentity(true);

    // Partner token minting / persistence
    let partnerToken = jar.get(`bonded_bucket_list_${code}`)?.value;
    if (!partnerToken || !/^[a-f0-9]{64}$/.test(partnerToken)) {
      partnerToken = randomBytes(32).toString("hex");
    }
    const partnerHash = createHash("sha256").update(partnerToken).digest("hex");

    const input = parsed.data;

    const { data, error } = await adminClient().rpc("bonded_mutate_template_bucket_list", {
      p_link_code: code,
      p_action: input.action,
      p_item_id: input.item_id || null,
      p_payload: input.payload || {},
      p_partner_token_hash: partnerHash,
      p_manage_token_hash: manageHash,
      p_actor_id: actorId,
      p_guest_owner: guest,
    });

    if (error) {
      throw new HttpError(
        error.code === "42501" ? 403 : error.code === "22023" ? 400 : 503,
        error.message || "Failed to update bucket list."
      );
    }

    // Set partner cookie
    jar.set(`bonded_bucket_list_${code}`, partnerToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    if (input.action === "attach_memory" && input.payload?.asset_id) {
      runOpportunisticCleanup();
    }

    return NextResponse.json({
      success: true,
      action: data?.action,
      items: data?.items,
      revision: data?.revision,
    });
  } catch (error) {
    return apiError(error);
  }
}
