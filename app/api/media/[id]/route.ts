import { adminClient, apiError, currentUser, guestIdentity, HttpError } from "@/lib/server/security";
import { mediaDeliveryUrl, type StoredMedia } from "@/lib/server/cloudinary";
import { templateCode, uuid } from "@/lib/security/validation";
type Context = { params: Promise<{ id:string }> };
export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    if (!uuid.safeParse(id).success) throw new HttpError(404,"Media not found.");
    const user = await currentUser(), guest = await guestIdentity();
    const code = new URL(request.url).searchParams.get("template");
    if (code && !templateCode.safeParse(code).success) throw new HttpError(404,"Media not found.");
    const { data,error } = await adminClient().rpc("bonded_media_operation",{ actor_id:user?.id || null,guest_owner:guest,asset_id:id,operation:"read",link_code:code });
    if (error || !data) throw new HttpError(404,"Media not found.");
    const range = request.headers.get("range"), headers: Record<string,string> = {};
    if (range && /^bytes=\d*-\d*$/.test(range)) headers.Range=range;
    const upstream = await fetch(mediaDeliveryUrl(data as StoredMedia), {headers,cache:"no-store",signal:AbortSignal.timeout(30000),redirect:"error"});
    if (!upstream.ok) throw new HttpError(502,"Media is temporarily unavailable.");
    const contentType = upstream.headers.get("content-type")?.split(";")[0].trim().toLowerCase() || "";
    if (!/^(image\/(jpeg|png|gif|webp)|video\/(mp4|webm)|audio\/(mpeg|mp3|wav|x-wav|ogg|webm|mp4|x-m4a))$/.test(contentType)) throw new HttpError(502,"Unsupported media response.");
    const output = new Headers({"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Disposition":"inline","Cross-Origin-Resource-Policy":"same-origin"});
    for (const name of ["Content-Type","Content-Length","Content-Range","Accept-Ranges"]) { const value=upstream.headers.get(name);if(value)output.set(name,value); }
    return new Response(upstream.body,{status:upstream.status,headers:output});
  } catch(error) { return apiError(error); }
}
