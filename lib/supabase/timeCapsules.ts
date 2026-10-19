import { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";

export interface GalleryFolder {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  created_at?: string;
}

export interface PolaroidData {
  id: string;
  image: string; // Cloudinary secure_url
  caption: string;
  date: string;
  location: string;
  noteOnBack?: string; // Back quotation / love message
  rotation?: number;
  folder_id?: string;
}

export interface VoiceNoteData {
  id?: string;
  title: string;
  duration: string;
  audioUrl?: string; // Cloudinary audio URL
  audioDesc?: string;
  speaker: string;
  folder_id?: string;
}

export interface VideoNoteData {
  id?: string;
  title: string;
  duration?: string;
  videoUrl: string; // Cloudinary video URL
  videoDesc?: string;
  speaker: string;
  folder_id?: string;
}

export interface TextNoteData {
  id: string;
  title: string;
  content: string;
  author?: string;
  date?: string;
  folder_id?: string;
}

export interface FuturePredictionData {
  id?: string;
  question: string;
  partner1Answer: string;
  partner2Answer: string;
  status?: "pending" | "came_true" | "plot_twist";
}

export interface TimeCapsuleRecord {
  id: string;
  couple_id?: string | null;
  creator_id?: string | null;
  title: string;
  category: "milestone" | "anniversary" | "open_when" | "predictions" | "memories";
  sealed_date: string;
  unlock_date: string;
  is_locked: boolean;
  /** 'solo' = creator-only visibility & unlock; 'couple' = dual-consent required */
  seal_mode?: "solo" | "couple";
  seal_color: "crimson" | "gold" | "velvet" | "emerald" | "rose";
  seal_stamp: string;
  folders?: GalleryFolder[];
  letter: {
    author: string;
    greeting: string;
    body: string;
    signOff: string;
    paperTheme: "parchment" | "silk" | "starlight" | "vintage";
  };
  voice_note?: VoiceNoteData | null;
  voice_notes?: VoiceNoteData[];
  video_note?: VideoNoteData | null;
  video_notes?: VideoNoteData[];
  text_notes?: TextNoteData[];
  polaroids: PolaroidData[];
  predictions?: FuturePredictionData[];
  secret_token?: {
    type: "song" | "coupon" | "vow";
    title: string;
    description: string;
    badge: string;
  } | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Tracks dual-consent sealing and dual-unlock voting for couple capsules.
 */
export interface CapsuleSealRequest {
  id: string;
  capsule_id: string;
  requester_id: string;
  partner_id: string;
  status: "pending" | "accepted" | "rejected";
  /** true once the requester confirms they want to unlock */
  unlock_vote_requester: boolean;
  /** true once the partner confirms they want to unlock */
  unlock_vote_partner: boolean;
  created_at?: string;
  updated_at?: string;
  /** Joined capsule title (client-side only, not in DB) */
  capsule_title?: string;
  /** Joined requester display name (client-side only) */
  requester_name?: string;
}


/** Identity-bound state comes from the authorized API, never a shared browser cache. */
export function clearCapsuleCache() {
  if(typeof window!=="undefined")localStorage.removeItem("bonded_time_capsules_v2");
}
export function deduplicateCapsules(list:TimeCapsuleRecord[]) {
  const ids=new Set<string>();
  return list.filter(item=>{if(!item?.id || ids.has(item.id))return false;ids.add(item.id);return true;});
}
export function calculateLockStatus(_unlockDate:string,currentStatus:boolean) {return currentStatus!==false;}
async function capsuleRequest(path:string,method="GET",body?:unknown) {
  const response=await fetch(path,{method,cache:"no-store",headers:body?{"Content-Type":"application/json"}:undefined,body:body?JSON.stringify(body):undefined});
  const data=await response.json();
  if(!response.ok)throw new Error(data.error || "Your capsule could not be saved. Please try again.");
  return data;
}
export async function fetchTimeCapsulesFromDB(_supabase:SupabaseClient,_coupleId?:string|null,userId?:string|null):Promise<TimeCapsuleRecord[]> {
  if(!userId)return [];
  const data=await capsuleRequest("/api/capsules");
  return deduplicateCapsules(data.capsules);
}
export async function createTimeCapsuleInDB(_supabase:SupabaseClient,capsule:Omit<TimeCapsuleRecord,"id"> & {id?:string},_coupleId?:string|null,userId?:string|null):Promise<TimeCapsuleRecord> {
  if(!userId)throw new Error("Please sign in to save a capsule.");
  const id=capsule.id || crypto.randomUUID();
  const unlock_date=capsule.category==="open_when"?capsule.unlock_date:new Date(capsule.unlock_date).toISOString();
  return (await capsuleRequest("/api/capsules","POST",{...capsule,id,unlock_date})).capsule;
}
export async function updateTimeCapsuleInDB(_supabase:SupabaseClient,capsuleId:string,updatedFields:Partial<TimeCapsuleRecord>):Promise<TimeCapsuleRecord> {
  return (await capsuleRequest("/api/capsules/"+capsuleId,"PATCH",updatedFields)).capsule;
}
export async function updateCapsuleLockInDB(supabase:SupabaseClient,capsuleId:string,isLocked:boolean):Promise<TimeCapsuleRecord> {
  return updateTimeCapsuleInDB(supabase,capsuleId,{is_locked:isLocked});
}
export async function purgeCloudinaryAssets(urls:(string|undefined|null)[]):Promise<boolean> {
  const valid=[...new Set(urls.filter((url):url is string=>!!url && /^\/api\/media\/[0-9a-f-]{36}$/i.test(url)))];
  if(!valid.length)return true;
  const response=await fetch("/api/upload",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({urls:valid})});
  if(!response.ok)throw new Error("The media could not be removed. Please try again.");
  // 202 means access is revoked and a durable cleanup retry is retained.
  return true;
}
export async function deleteTimeCapsuleFromDB(_supabase:SupabaseClient,capsuleId:string,_capsuleData?:TimeCapsuleRecord|null):Promise<boolean> {
  await capsuleRequest("/api/capsules/"+capsuleId,"DELETE");return true;
}
export function subscribeToTimeCapsulesRealtime(supabase:SupabaseClient,coupleId:string|null|undefined,onChange:(payload:unknown)=>void):RealtimeChannel {
  return supabase.channel("capsule-metadata-"+(coupleId || "solo")).on("postgres_changes",{
    event:"*",schema:"public",table:"time_capsules",...(coupleId?{filter:"couple_id=eq."+coupleId}:{}),
  },onChange).subscribe();
}
async function sealRequest(body:Record<string,unknown>):Promise<{success:boolean;data?:CapsuleSealRequest;bothVoted?:boolean;error?:string}> {
  const result=await capsuleRequest("/api/capsules/seal","POST",body);
  return result;
}
export async function createCapsuleSealRequest(_supabase:SupabaseClient,capsuleId:string,_requesterId:string,_partnerId:string) {
  return sealRequest({operation:"request",target_capsule:capsuleId});
}
async function sealRows(query:PromiseLike<{data:unknown;error:{message:string}|null}>):Promise<CapsuleSealRequest[]> {
  const {data,error}=await query;
  if(error)throw new Error("Capsule approvals are temporarily unavailable.");
  return (data || []) as CapsuleSealRequest[];
}
export async function fetchPendingCapsuleSealRequests(supabase:SupabaseClient,userId:string) {
  return sealRows(supabase.from("capsule_seal_requests").select("*").eq("partner_id",userId).eq("status","pending"));
}
export async function fetchCapsuleUnlockVotes(supabase:SupabaseClient,capsuleId:string):Promise<CapsuleSealRequest|null> {
  const rows=await sealRows(supabase.from("capsule_seal_requests").select("*").eq("capsule_id",capsuleId).eq("status","accepted").order("created_at",{ascending:false}).limit(1));
  return rows[0] || null;
}
export async function reRequestCapsuleSeal(_supabase:SupabaseClient,capsuleId:string,_requesterId:string,_partnerId:string) {
  return sealRequest({operation:"resend",target_capsule:capsuleId});
}
export async function fetchSealRequestsForUser(supabase:SupabaseClient,userId:string) {
  return sealRows(supabase.from("capsule_seal_requests").select("*").or("requester_id.eq."+userId+",partner_id.eq."+userId));
}
export async function fetchIncomingUnlockRequests(supabase:SupabaseClient,userId:string) {
  return sealRows(supabase.from("capsule_seal_requests").select("*").eq("status","accepted").or(
    "and(partner_id.eq."+userId+",unlock_vote_requester.eq.true,unlock_vote_partner.eq.false),and(requester_id.eq."+userId+",unlock_vote_partner.eq.true,unlock_vote_requester.eq.false)"));
}
export async function respondToCapsuleSealRequest(_supabase:SupabaseClient,requestId:string,response:"accepted"|"rejected") {
  return sealRequest({operation:"respond",request_id:requestId,response});
}
export async function resetCapsuleUnlockVotes(_supabase:SupabaseClient,requestId:string) {
  return sealRequest({operation:"reset",request_id:requestId});
}
export async function voteToCapsuleUnlock(_supabase:SupabaseClient,requestId:string,_role:"requester"|"partner",vote:boolean) {
  // The server derives the participant role from the authenticated identity.
  return sealRequest({operation:"vote",request_id:requestId,vote});
}
export function subscribeToCapsuleRequests(supabase:SupabaseClient,userId:string,onChange:(payload:unknown)=>void):RealtimeChannel {
  return supabase.channel("capsule-approvals-"+userId)
    .on("postgres_changes",{event:"*",schema:"public",table:"capsule_seal_requests",filter:"partner_id=eq."+userId},onChange)
    .on("postgres_changes",{event:"*",schema:"public",table:"capsule_seal_requests",filter:"requester_id=eq."+userId},onChange).subscribe();
}
