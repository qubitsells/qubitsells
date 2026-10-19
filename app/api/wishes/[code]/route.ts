import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { adminClient,apiError,HttpError,rateLimit,requireSameOrigin,secretMatches } from "@/lib/server/security";
import { decryptPayload } from "@/lib/server/capsuleCrypto";
type Context={params:Promise<{code:string}>};
export async function GET(request:Request,context:Context) {
  try {
    const {code}=await context.params;
    if(!/^[a-f0-9]{24}$/.test(code))throw new HttpError(404,"Wish not found.");
    await rateLimit(request,"wish-read",300);
    const {data,error}=await adminClient().from("shared_wishes").select("id,slug,payload").eq("short_code",code).maybeSingle();
    if(error)throw new HttpError(503,"This wish is temporarily unavailable.");
    if(!data)throw new HttpError(404,"Wish not found.");
    return NextResponse.json({slug:data.slug,wish:decryptPayload(data.payload,data.id)},{headers:{"Cache-Control":"private, no-store"}});
  } catch(error) {return apiError(error);}
}
export async function DELETE(request:Request,context:Context) {
  try {
    requireSameOrigin(request);
    const {code}=await context.params;
    if(!/^[a-f0-9]{24}$/.test(code))throw new HttpError(404,"Wish not found.");
    const token=(await cookies()).get(`bonded_wish_delete_${code}`)?.value;
    if(!token)throw new HttpError(401,"Only the creator can remove this wish from their original browser.");
    const db=adminClient(),{data,error}=await db.from("shared_wishes").select("id,deletion_hash").eq("short_code",code).maybeSingle();
    if(error || !data || !secretMatches(createHash("sha256").update(token).digest("hex"),data.deletion_hash))throw new HttpError(403,"This wish cannot be removed by this browser.");
    const {error:removeError}=await db.from("shared_wishes").delete().eq("id",data.id);
    if(removeError)throw new HttpError(503,"This wish could not be removed. Please try again.");
    return NextResponse.json({success:true});
  } catch(error) {return apiError(error);}
}
