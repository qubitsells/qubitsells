import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash,randomBytes } from "node:crypto";
import { adminClient,apiError,currentUser,guestIdentity,HttpError,jsonBody,rateLimit,requireSameOrigin } from "@/lib/server/security";
import { mediaIds,templateInputSchema } from "@/lib/security/validation";
import { runOpportunisticCleanup } from "@/lib/cloudinaryCleanup";
import { getTrack,artistName } from "@/lib/freetouse";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await rateLimit(request,"template-create",5);
    const parsed=templateInputSchema.safeParse(await jsonBody(request));
    if(!parsed.success)throw new HttpError(400,"Check your names, message, media and expiry fields.");
    const user=await currentUser(),guest=await guestIdentity(true),input=parsed.data;
    let music=input.music_track || null;
    if(music?.type==="youtube" && music.youtubeId) {
      music={...music,mp3Url:`https://www.youtube.com/watch?v=${music.youtubeId}`,youtubeUrl:`https://www.youtube.com/watch?v=${music.youtubeId}`,thumbnailUrl:`https://img.youtube.com/vi/${music.youtubeId}/hqdefault.jpg`};
    } else if(music) {
      if(!/^[a-zA-Z0-9-]{1,100}$/.test(music.id))throw new HttpError(400,"Invalid music track.");
      const track=await getTrack(music.id);
      if(!track)throw new HttpError(400,"This music track is unavailable. Please select another.");
      music={id:track.id,title:track.title,artist:artistName(track),thumbnailUrl:track.thumbnails.md || track.thumbnails.sm || "",mp3Url:track.files.mp3,duration:track.duration,startAt:Math.min(music.startAt,track.duration),waveform:track.waveform,type:"freetouse"};
    }
    const token=randomBytes(32).toString("hex"),deletionHash=createHash("sha256").update(token).digest("hex");
    const expiresAt=new Date(Date.now()+input.expiry_hours*3600000).toISOString();
    let code="";
    for(let attempt=0;attempt<3;attempt++) {
      code=randomBytes(12).toString("hex");
      const {error}=await adminClient().rpc("bonded_create_template",{
        actor_id:user?.id || null,guest_owner:guest,deletion_hash:deletionHash,asset_ids:mediaIds([input.media_items, input.tools]),
        template_data:{...input,short_code:code,theme:input.theme || (input.sender_gender==="female"?"anime_female":"anime_male"),expires_at:expiresAt,music_track:music},
      });
      if(!error)break;
      if(error.code!=="23505")throw new HttpError(error.code==="42501"?403:503,"The template could not be saved. Check that all media belongs to your upload session.");
      if(attempt===2)throw new HttpError(503,"Please try creating the link again.");
    }
    const jar = await cookies();
    jar.set(`bonded_template_delete_${code}`,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:`/api/templates/${code}`,maxAge:input.expiry_hours*3600});
    jar.set(`bonded_template_manage_${code}`,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:input.expiry_hours*3600});
    runOpportunisticCleanup();
    const origin = new URL(request.url).origin;
    return NextResponse.json({
      success:true,
      short_code:code,
      url:`${origin}/t/${code}`,
      manage_url:`${origin}/t/${code}?manage=${token}`,
      manage_token:token,
      expires_at:expiresAt,
    });
  } catch(error) {return apiError(error);}
}
