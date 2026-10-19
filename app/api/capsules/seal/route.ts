import { NextResponse } from "next/server";
import { z } from "zod";
import { uuid } from "@/lib/security/validation";
import { adminClient, apiError, HttpError, jsonBody, requireSameOrigin, requireUser } from "@/lib/server/security";
const schema = z.object({ operation: z.enum(["request", "resend", "respond", "vote", "reset"]), request_id: uuid.optional(), target_capsule: uuid.optional(), response: z.enum(["accepted", "rejected"]).optional(), vote: z.boolean().optional() });
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await requireUser(), parsed = schema.safeParse(await jsonBody(request));
    if (!parsed.success || (!parsed.data.request_id && !parsed.data.target_capsule)) throw new HttpError(400, "Invalid capsule request.");
    const { data, error } = await adminClient().rpc("bonded_seal_operation", { actor_id: user.id, ...parsed.data });
    if (error) {
      if (error.message.includes("unlock date")) throw new HttpError(409, "This capsule stays sealed until its unlock date.");
      throw new HttpError(error.code === "42501" ? 403 : 409, "The capsule approval could not be changed. Refresh and try again.");
    }
    return NextResponse.json({ success: true, data, bothVoted: !!data.unlock_vote_requester && !!data.unlock_vote_partner });
  } catch (error) { return apiError(error); }
}
