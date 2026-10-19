import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
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
  manageCouponSchema,
  requestCouponSchema,
  templateCode,
} from "@/lib/security/validation";

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

    await rateLimit(request, "template-coupon-read", 120);

    const { manageHash, actorId } = await getCreatorCredentials(request, code);

    const { data, error } = await adminClient().rpc("bonded_get_template_coupon", {
      link_code: code,
      manage_token_hash: manageHash,
      actor_id: actorId,
    });

    if (error) {
      throw new HttpError(503, "Could not load love coupon.");
    }

    if (!data?.success) {
      throw new HttpError(404, data?.error || "Love coupon not found.");
    }

    return NextResponse.json(
      {
        success: true,
        is_creator: Boolean(data?.is_creator),
        coupon: data?.coupon || null,
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
    await rateLimit(request, "template-coupon-write", 60);

    const { code } = await context.params;
    if (!templateCode.safeParse(code).success) throw new HttpError(404, "Template not found.");

    const raw = await jsonBody(request);
    const action = raw && typeof raw === "object" && (raw as { action?: string }).action ? (raw as { action: string }).action : "request";

    if (action === "request") {
      // Recipient action: Request to use
      const parsed = requestCouponSchema.safeParse(raw);
      if (!parsed.success) {
        throw new HttpError(400, "Invalid coupon request. Please check notes and details.");
      }

      const { data, error } = await adminClient().rpc("bonded_request_template_coupon", {
        link_code: code,
        request_note: parsed.data.request_note || null,
        preferred_date: parsed.data.preferred_date || null,
        expected_revision: parsed.data.expected_revision,
      });

      if (error) {
        if (error.code === "40001") throw new HttpError(409, "Coupon state has updated. Please refresh.");
        throw new HttpError(error.code === "42501" ? 400 : 503, error.message || "Could not request coupon redemption.");
      }

      return NextResponse.json({
        success: true,
        status: data.status,
        revision: data.revision,
      });
    }

    // Issuer management actions: accept, fulfill, cancel, decline_request
    const parsed = manageCouponSchema.safeParse(raw);
    if (!parsed.success) {
      throw new HttpError(400, "Invalid coupon management action.");
    }

    const { manageHash, actorId } = await getCreatorCredentials(request, code);

    const { data, error } = await adminClient().rpc("bonded_manage_template_coupon", {
      link_code: code,
      action_type: parsed.data.action,
      manage_token_hash: manageHash,
      actor_id: actorId,
      expected_revision: parsed.data.expected_revision,
      cancel_reason: parsed.data.cancel_reason || null,
    });

    if (error) {
      if (error.code === "40001") throw new HttpError(409, "Coupon state has updated. Please refresh.");
      throw new HttpError(error.code === "42501" ? 403 : 503, error.message || "Failed to update coupon.");
    }

    return NextResponse.json({
      success: true,
      status: data.status,
      revision: data.revision,
    });
  } catch (error) {
    return apiError(error);
  }
}
