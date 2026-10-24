import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash,randomBytes } from "node:crypto";
import { adminClient,apiError,currentUser,guestIdentity,HttpError,jsonBody,rateLimit,requireSameOrigin } from "@/lib/server/security";
import { mediaIds,templateInputSchema, replyToolSchema, invitationToolSchema, venueToolSchema, pollToolSchema, questionToolSchema, revealToolSchema, scratchRevealToolSchema, couponToolSchema, openWhenToolSchema, ourStoryToolSchema, bucketListToolSchema } from "@/lib/security/validation";
import { runOpportunisticCleanup } from "@/lib/cloudinaryCleanup";
import { getTrack,artistName } from "@/lib/freetouse";
import { databaseResult } from "@/lib/server/commerce";
import { stripeMode } from "@/lib/server/stripe";
import { PRODUCTS } from "@/lib/storefront";
import { senderPreparationError } from "@/lib/sender-preparation";
import type { TemplateTool } from "@/lib/supabase/coupleTemplates";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await rateLimit(request,"template-create",5);
    const parsed=templateInputSchema.safeParse(await jsonBody(request));
    if(!parsed.success)throw new HttpError(400,"Check your names, message, media and expiry fields.");
    const user=await currentUser(),guest=await guestIdentity(true),input=parsed.data;
    for (let index = 0; index < input.tools.length; index++) {
      const tool = input.tools[index];
      const schema = tool.type === "reply" ? replyToolSchema : tool.type === "invitation" ? invitationToolSchema : tool.type === "venue" ? venueToolSchema : tool.type === "poll" ? pollToolSchema : tool.type === "question" ? questionToolSchema : tool.type === "private_reveal" ? revealToolSchema : tool.type === "scratch_reveal" ? scratchRevealToolSchema : tool.type === "coupon" ? couponToolSchema : tool.type === "open_when" ? openWhenToolSchema : tool.type === "our_story" ? ourStoryToolSchema : tool.type === "bucket_list" ? bucketListToolSchema : null;
      if (schema) { const checked = schema.safeParse(tool); if (!checked.success) throw new HttpError(400, checked.error.issues[0]?.message || "Check your template tool settings."); input.tools[index] = checked.data; }
    }
    const setupError=senderPreparationError(input.tools as unknown as TemplateTool[]);
    if(setupError)throw new HttpError(400,setupError);
    if(!user || !input.order_id)throw new HttpError(402,"A confirmed purchase is required to publish. Open the product page to buy, then personalize from My orders.");
    if(!PRODUCTS.some(product=>product.slug===input.theme))throw new HttpError(400,"Choose an available product to publish this template.");
    const order=await databaseResult(adminClient().from("store_orders").select("id,duration_hours").eq("id",input.order_id).eq("buyer_id",user.id).eq("product_slug",input.theme).eq("payment_mode",stripeMode()).eq("status","paid").is("fulfilled_at",null).maybeSingle());
    if(!order)throw new HttpError(403,"This account needs a paid, unused order for this template. Check My orders.");
    input.expiry_hours=order.duration_hours;
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
    let expiresAt=new Date(Date.now()+input.expiry_hours*3600000).toISOString();
    let code="";
    for(let attempt=0;attempt<3;attempt++) {
      code=randomBytes(12).toString("hex");
      const {data,error}=await adminClient().rpc("qubit_publish_order",{
        p_order_id:order.id,p_actor_id:user.id,p_guest_owner:guest,p_deletion_hash:deletionHash,p_asset_ids:mediaIds([input.media_items, input.tools]),
        p_template_data:{...input,short_code:code,theme:input.theme,expires_at:expiresAt,music_track:music},
      });
      if(!error){expiresAt=data.expires_at;break;}
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
