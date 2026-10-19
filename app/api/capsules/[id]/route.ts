import { NextResponse } from "next/server";
import { apiError, jsonBody, requireSameOrigin, requireUser, HttpError } from "@/lib/server/security";
import { capsuleOperation, hydrateCapsule } from "@/lib/server/capsules";
import { encryptPayload } from "@/lib/server/capsuleCrypto";
import { capsuleContentSchema, mediaIds, uuid } from "@/lib/security/validation";
import { runOpportunisticCleanup } from "@/lib/cloudinaryCleanup";
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const user = await requireUser(), { id } = await context.params;
    if (!uuid.safeParse(id).success) throw new HttpError(400, "Invalid capsule.");
    const body = await jsonBody(request);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new HttpError(400, "Invalid capsule fields.");
    const fields = body as Record<string, unknown>;
    if ("is_locked" in fields) {
      if (Object.keys(fields).length !== 1 || typeof fields.is_locked !== "boolean") throw new HttpError(400, "Invalid lock operation.");
      const row = await capsuleOperation(user.id, fields.is_locked ? "seal" : "unlock", { capsule_id: id });
      return NextResponse.json({ capsule: hydrateCapsule(row) });
    }
    const current = hydrateCapsule(await capsuleOperation(user.id, "get", { capsule_id: id }));
    // Only note/media content is editable; identity, ownership, dates and approval state stay server-controlled.
    const contentKeys = Object.keys(capsuleContentSchema.shape);
    if (Object.keys(fields).some(k => !contentKeys.includes(k))) throw new HttpError(400, "These capsule fields cannot be changed.");
    const parsed = capsuleContentSchema.safeParse({ ...current, ...fields });
    if (!parsed.success) throw new HttpError(400, "Invalid capsule content.");
    // New remote references are forbidden. Legacy media may only be preserved verbatim until migrated.
    const oldUrls = new Set(current.polaroids.map(p => p.image).concat(current.voice_notes?.map(n => n.audioUrl || "") || [], current.video_notes?.map(n => n.videoUrl) || [], current.voice_note?.audioUrl || "", current.video_note?.videoUrl || ""));
    const nextUrls = parsed.data.polaroids.map(p => p.image).concat(parsed.data.voice_notes.map(n => n.audioUrl || ""), parsed.data.video_notes.map(n => n.videoUrl), parsed.data.voice_note?.audioUrl || "", parsed.data.video_note?.videoUrl || "");
    if (nextUrls.some(url => url && !/^\/api\/media\/[0-9a-f-]{36}$/i.test(url) && !oldUrls.has(url))) throw new HttpError(400, "Upload media through QubitSells first.");
    const row = await capsuleOperation(user.id, "update", { capsule_id: id, content: encryptPayload(parsed.data, id), asset_ids: mediaIds(parsed.data) });
    runOpportunisticCleanup();
    return NextResponse.json({ capsule: hydrateCapsule(row) });
  } catch (error) { return apiError(error); }
}
export async function DELETE(request: Request, context: Context) {
  try {
    requireSameOrigin(request);
    const user = await requireUser(), { id } = await context.params;
    if (!uuid.safeParse(id).success) throw new HttpError(400, "Invalid capsule.");
    await capsuleOperation(user.id, "delete", { capsule_id: id });
    runOpportunisticCleanup();
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
