import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { apiError, jsonBody, requireSameOrigin, requireUser, rateLimit, HttpError } from "@/lib/server/security";
import { capsuleOperation, hydrateCapsule } from "@/lib/server/capsules";
import { encryptPayload } from "@/lib/server/capsuleCrypto";
import { capsuleContentSchema, capsuleMetadataSchema, mediaIds, mediaReference } from "@/lib/security/validation";

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await capsuleOperation(user.id, "list");
    return NextResponse.json({ capsules: (rows as Record<string, unknown>[]).map(hydrateCapsule) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await requireUser();
    await rateLimit(request, "capsule-create", 30);
    const body = await jsonBody(request);
    const metadata = capsuleMetadataSchema.safeParse(body), content = capsuleContentSchema.safeParse(body);
    if (!metadata.success || !content.success) throw new HttpError(400, "Check your capsule fields and unlock date.");
    const urls = content.data.polaroids.map(p => p.image).concat(content.data.voice_notes.map(n => n.audioUrl || ""), content.data.video_notes.map(n => n.videoUrl), content.data.voice_note?.audioUrl || "", content.data.video_note?.videoUrl || "").filter(Boolean);
    if (urls.some(url => !mediaReference.safeParse(url).success)) throw new HttpError(400, "Upload media through QubitSells first.");
    const id = metadata.data.id || randomUUID();
    const row = await capsuleOperation(user.id, "create", { capsule_id: id, metadata: metadata.data, content: encryptPayload(content.data, id), asset_ids: mediaIds(content.data) });
    return NextResponse.json({ capsule: hydrateCapsule(row) }, { status: 201 });
  } catch (error) { return apiError(error); }
}
