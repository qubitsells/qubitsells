import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { adminClient,apiError,currentUser,HttpError,rateLimit,requireSameOrigin } from "@/lib/server/security";
import { templateCode } from "@/lib/security/validation";
import { runOpportunisticCleanup } from "@/lib/cloudinaryCleanup";
type Context={params:Promise<{code:string}>};
export async function GET(request:Request,context:Context) {
  try {
    const {code}=await context.params;
    if(!templateCode.safeParse(code).success)throw new HttpError(404,"Template not found.");
    await rateLimit(request,"template-read",300);
    const {data,error}=await adminClient().rpc("bonded_template_operation",{link_code:code,operation:"read"});
    if(error)throw new HttpError(503,"This template is temporarily unavailable.");
    if(!data)throw new HttpError(404,"Template not found.");
    if(data.expired) {runOpportunisticCleanup();return NextResponse.json({error:"This template has expired.",expired:true},{status:410});}
    const media=Array.isArray(data.media_items)?data.media_items:[];
    const visual=media.filter((m:Record<string,unknown>)=>m.type==="image" || m.type==="video").map((m:Record<string,unknown>)=>({
      ...m,public_id:typeof m.url==="string" && m.url.startsWith("/api/media/")?m.url.split("/").pop():m.public_id,
      url:typeof m.url==="string" && m.url.startsWith("/api/media/")?`${m.url}?template=${code}`:m.url,
    }));
    const music=data.music_track || media.find((m:Record<string,unknown>)=>m.type==="music_track" || m.type==="audio_track")?.track || null;
    return NextResponse.json({success:true,template:{...data,music_track:music,media_items:visual}},{headers:{"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"}});
  } catch(error) {return apiError(error);}
}
export async function DELETE(request:Request,context:Context) {
  try {
    requireSameOrigin(request);
    const {code}=await context.params;
    if(!templateCode.safeParse(code).success)throw new HttpError(404,"Template not found.");
    const token=(await cookies()).get(`bonded_template_delete_${code}`)?.value;
    if(!token || !/^[a-f0-9]{64}$/.test(token))throw new HttpError(401,"Only the creator can delete this template from their original browser.");
    const user = await currentUser();
    const {error}=await adminClient().rpc("bonded_template_operation",{link_code:code,operation:"delete",provided_hash:createHash("sha256").update(token).digest("hex"),actor_id:user?.id || null});
    if(error)throw new HttpError(403,"This template cannot be deleted by this browser.");
    runOpportunisticCleanup();
    return NextResponse.json({success:true});
  } catch(error) {return apiError(error);}
}
