import {NextResponse} from "next/server";
import {z} from "zod";
import {vibeOptionsSchema} from "@/lib/vibe";
import {apiError,HttpError,jsonBody,rateLimit,requireSameOrigin,requireUser} from "@/lib/server/security";
import {createClient} from "@/lib/supabase/server";
import {generateVibe,requireVibePartner} from "@/lib/server/vibe";
import {privateHeaders} from "@/lib/server/commerce";

const inputSchema=z.object({couple_id:z.uuid(),options:vibeOptionsSchema,previous_key:z.string().max(60).regex(/^[a-z-]+-\d$/).optional()}).strict();
export async function POST(request:Request){try{
  requireSameOrigin(request);const user=await requireUser();
  const input=inputSchema.safeParse(await jsonBody(request,2000));if(!input.success)throw new HttpError(400,"Choose a mood, place, time, and budget for your vibe.");
  const client=await createClient();await requireVibePartner(client,input.data.couple_id,user.id);await rateLimit(request,"couple-vibe",60);
  return NextResponse.json({plan:generateVibe(input.data.options,input.data.previous_key)},{headers:privateHeaders});
}catch(error){return apiError(error);}}
