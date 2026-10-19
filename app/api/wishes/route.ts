import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes,randomUUID,createHash } from "node:crypto";
import { z } from "zod";
import { adminClient,apiError,HttpError,jsonBody,rateLimit,requireSameOrigin } from "@/lib/server/security";
import { encryptPayload } from "@/lib/server/capsuleCrypto";
const schema=z.object({slug:z.string().regex(/^[a-z0-9-]{1,100}$/),to:z.string().trim().min(1).max(100),from:z.string().trim().min(1).max(100),msg:z.string().min(1).max(5000),memory:z.string().max(5000),distance:z.string().max(100),days:z.string().max(100)});
export async function POST(request:Request) {
  try {
    requireSameOrigin(request);
    await rateLimit(request,"wish-create",10);
    const parsed=schema.safeParse(await jsonBody(request));
    if(!parsed.success)throw new HttpError(400,"Check your wish fields before creating a link.");
    const id=randomUUID(),code=randomBytes(12).toString("hex"),token=randomBytes(32).toString("hex");
    const {slug,...content}=parsed.data;
    const {error}=await adminClient().from("shared_wishes").insert({id,short_code:code,slug,payload:encryptPayload(content,id),deletion_hash:createHash("sha256").update(token).digest("hex")});
    if(error)throw new HttpError(503,"Your wish could not be saved. Please try again.");
    (await cookies()).set(`bonded_wish_delete_${code}`,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:`/api/wishes/${code}`,maxAge:60*60*24*365});
    return NextResponse.json({url:`${new URL(request.url).origin}/love/${slug}?wish=${code}`});
  } catch(error) {return apiError(error);}
}
