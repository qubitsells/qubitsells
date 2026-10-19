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
  openEnvelopeSchema,
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

    await rateLimit(request, "template-open-when-read", 120);

    const { manageHash, actorId } = await getCreatorCredentials(request, code);

    const { data, error } = await adminClient().rpc("bonded_get_template_open_when", {
      p_link_code: code,
      p_manage_token_hash: manageHash,
      p_actor_id: actorId,
    });

    if (error) {
      throw new HttpError(503, "Could not load open when letters.");
    }

    if (!data?.success) {
      throw new HttpError(404, data?.error || "Open when letters not found.");
    }

    return NextResponse.json(
      {
        success: true,
        is_creator: Boolean(data?.is_creator),
        letters: data?.letters || null,
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
    await rateLimit(request, "template-open-when-write", 60);

    const { code } = await context.params;
    if (!templateCode.safeParse(code).success) throw new HttpError(404, "Template not found.");

    const raw = await jsonBody(request);
    const parsed = openEnvelopeSchema.safeParse(raw);
    if (!parsed.success) {
      throw new HttpError(400, "Invalid envelope request.");
    }

    const { data, error } = await adminClient().rpc("bonded_open_template_envelope", {
      p_link_code: code,
      p_envelope_id: parsed.data.envelope_id,
    });

    if (error) {
      throw new HttpError(error.code === "42501" ? 400 : 503, error.message || "Failed to open envelope.");
    }

    return NextResponse.json({
      success: true,
      envelope_id: data.envelope_id,
      opened_at: data.opened_at,
      opened_envelopes: data.opened_envelopes,
    });
  } catch (error) {
    return apiError(error);
  }
}
