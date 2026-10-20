import type { SupabaseClient } from "@supabase/supabase-js";

export interface CoupleAnthem {
  url?:string;youtubeId?:string;title?:string;artist?:string;thumbnail?:string;duration?:number;startAt?:number;autoplay?:boolean;
}
export interface CoupleData {
  id:string;couple_code:string;partner_1_id:string;partner_2_id:string|null;
  anniversary_date:string|null;couple_motto:string|null;is_connected:boolean;
  partner_name?:string|null;couple_anthem?:CoupleAnthem|null;
  updated_at?:string;
}

/** Read existing membership without creating a relationship space on sign-in. */
export async function getExistingCouple(supabase:SupabaseClient,userId:string,metadata?:Record<string,unknown>):Promise<CoupleData|null> {
  const [profileResult, coupleResult] = await Promise.all([
    supabase.from("profiles").select("couple_id").eq("id", userId).maybeSingle(),
    supabase.from("couples").select("id,couple_code,partner_1_id,partner_2_id,anniversary_date,couple_motto,couple_anthem,updated_at,created_at")
      .or(`partner_1_id.eq.${userId},partner_2_id.eq.${userId}`).order("created_at", {ascending:false}),
  ]);
  if(profileResult.error || coupleResult.error)throw new Error("Your couple profile could not be loaded. Please try again.");
  const rows = (coupleResult.data || []).filter(row => row.partner_1_id === userId || row.partner_2_id === userId);
  const row = rows.find(item => item.id === profileResult.data?.couple_id) || rows.find(item => item.partner_2_id) || rows[0];
  if(!row)return null;
  const partnerId = row.partner_1_id === userId ? row.partner_2_id : row.partner_1_id;
  let partnerName = typeof metadata?.partner_nickname === "string" && metadata.partner_nickname ? metadata.partner_nickname : "Your partner";
  if(partnerId) {
    const {data} = await supabase.from("profiles").select("full_name").eq("id", partnerId).maybeSingle();
    if(typeof data?.full_name === "string" && data.full_name)partnerName = data.full_name;
  }
  return {...row,is_connected:!!row.partner_2_id,partner_name:partnerId ? partnerName : null};
}
export async function getOrCreateCouple(supabase:SupabaseClient,userId:string,metadata?:Record<string,unknown>):Promise<CoupleData> {
  const {data,error}=await supabase.rpc("ensure_couple");
  if(error || !data)throw new Error("Your shared space could not be loaded. Please try again.");
  const row=data as Omit<CoupleData,"is_connected">;
  const partnerId=row.partner_1_id===userId?row.partner_2_id:row.partner_1_id;
  let partnerName=typeof metadata?.partner_nickname==="string"?metadata.partner_nickname:"Partner";
  if(partnerId) {
    const {data:profile}=await supabase.from("profiles").select("full_name").eq("id",partnerId).maybeSingle();
    if(typeof profile?.full_name==="string" && profile.full_name)partnerName=profile.full_name;
  }
  return {...row,is_connected:!!row.partner_2_id,partner_name:partnerId?partnerName:null};
}
export async function pairWithLoveCode(supabase:SupabaseClient,_userId:string,codeInput:string):Promise<{success:boolean;message:string}> {
  const code=codeInput.trim().toUpperCase();
  if(!/^LOVE-[A-Z0-9]{6,64}$/.test(code))return {success:false,message:"Invalid Love Code. Please check with your partner."};
  const {data,error}=await supabase.rpc("join_couple_by_code",{code_input:code});
  if(error || !data)return {success:false,message:"Pairing is temporarily unavailable. Please try again."};
  return {success:data.success===true,message:typeof data.message==="string"?data.message:"Please try again."};
}

export async function disconnectCouple(supabase:SupabaseClient):Promise<{success:boolean;message:string}> {
  try {
    const res=await fetch("/api/couple/disconnect",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
    });
    const result=await res.json();
    if(res.ok && result.success) {
      return {success:true,message:typeof result.message==="string"?result.message:"Disconnected successfully."};
    }
    if(result?.error || result?.message) {
      return {success:false,message:result.error || result.message};
    }
  } catch {}

  try {
    const {data,error}=await supabase.rpc("disconnect_couple");
    if(!error && data) {
      return {success:data.success===true,message:typeof data.message==="string"?data.message:"Disconnected successfully."};
    }
  } catch {}

  return {success:false,message:"Disconnection is temporarily unavailable. Please try again."};
}
