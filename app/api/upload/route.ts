import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { adminClient, apiError, boundedBody, currentUser, guestIdentity, HttpError, jsonBody, rateLimit, requireSameOrigin } from "@/lib/server/security";
import { destroyMedia, uploadMedia } from "@/lib/server/cloudinary";
import { MAX_UPLOAD_BYTES, supportedMedia } from "@/lib/security/files";
import { mediaReference, uuid } from "@/lib/security/validation";
import { purgeQueuedMedia } from "@/lib/cloudinaryCleanup";

export const maxDuration = 120;
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await rateLimit(request, "media-upload", 30);
    const bytes = await boundedBody(request, MAX_UPLOAD_BYTES+64*1024);
    const form = await new Response(new Uint8Array(bytes), { headers: { "Content-Type": request.headers.get("content-type") || "" } }).formData();
    const file = form.get("file");
    if (!(file instanceof Blob) || file.size===0 || file.size>MAX_UPLOAD_BYTES) throw new HttpError(400,"Upload a file no larger than 25 MB.");
    const resourceType = supportedMedia(new Uint8Array(await file.slice(0,32).arrayBuffer()),file.type);
    if (!resourceType) throw new HttpError(400,"Use a supported photo, video, or audio file. SVG and executable files are not allowed.");
    const folder = form.get("folder");
    const isTemplate = folder==="bonded/couple_templates" || folder==="bonded/template_replies";
    const user = await currentUser();
    if (!isTemplate && !user) throw new HttpError(401,"Sign in to upload capsule memories.");
    const guest = isTemplate ? await guestIdentity(true) : null, id = randomUUID();
    const uploaded = await uploadMedia(file,id,resourceType,isTemplate ? "templates" : "capsules");
    const asset = { id,...uploaded,resource_type:resourceType,owner_id:user?.id || null,guest_hash:user ? null : guest };
    const { error } = await adminClient().rpc("bonded_register_media",{ asset });
    if (error) {
      await destroyMedia({ ...asset,delivery_type:"authenticated" }).catch(()=>false);
      throw new HttpError(503,"Your upload could not be saved. Please try again.");
    }
    return NextResponse.json({ success:true,url:`/api/media/${id}`,secure_url:`/api/media/${id}`,public_id:id,resource_type:resourceType,duration:uploaded.duration });
  } catch(error) { return apiError(error); }
}
const deleteSchema = z.object({ urls:z.array(mediaReference).max(100).default([]),public_ids:z.array(z.object({public_id:uuid,resource_type:z.string().optional()})).max(100).default([]) });
export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
    await rateLimit(request, "media-discard", 120);
    const parsed = deleteSchema.safeParse(await jsonBody(request));
    if (!parsed.success) throw new HttpError(400,"Invalid media references.");
    const user = await currentUser(), guest = await guestIdentity();
    if (!user && !guest) throw new HttpError(401,"Your upload session is required.");
    const ids = [...new Set([...parsed.data.urls.map(url=>url.split("/").pop()!),...parsed.data.public_ids.map(item=>item.public_id)])];
    for (const id of ids) {
      const { error } = await adminClient().rpc("bonded_media_operation",{actor_id:user?.id || null,guest_owner:guest,asset_id:id,operation:"inspect"});
      if (error) throw new HttpError(403,"This media does not belong to an editable capsule or your upload session.");
    }
    const queued: string[] = [];
    for (const id of ids) {
      const { data, error } = await adminClient().rpc("bonded_media_operation",{actor_id:user?.id || null,guest_owner:guest,asset_id:id,operation:"discard"});
      if (error) throw new HttpError(409,"The media state changed. Refresh and try again.");
      if (data && data.state !== "attached") queued.push(id);
    }
    const result = queued.length ? await purgeQueuedMedia(queued) : { purged: 0, failed: 0 };
    const pending = Math.max(0, queued.length - result.purged);
    return NextResponse.json({ success:true,deletedCount:result.purged,pendingCount:pending,savedAssetsPreserved:ids.length-queued.length },{status:pending ? 202 : 200});
  } catch(error) { return apiError(error); }
}
