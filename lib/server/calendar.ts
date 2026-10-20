import "server-only";
import {HttpError} from "./security";
import type {SupabaseClient} from "@supabase/supabase-js";

export function calendarError(error:{code?:string}|null){
  if(!error)return;
  if(error.code==="42501")throw new HttpError(403,"You cannot make this change. Only the invited partner can confirm or decline an active request in your connected Couple Space.");
  if(error.code==="40001")throw new HttpError(409,"This plan changed or was already answered. Refresh the calendar and review its latest details.");
  if(error.code==="P0002")throw new HttpError(404,"This plan was removed. Refresh your calendar.");
  if(error.code==="23505")throw new HttpError(409,"This plan is already being saved. Refresh your calendar before trying again.");
  if(["22023","23514","23502","22007","22008"].includes(error.code||""))throw new HttpError(400,"Check the event dates, times, and details.");
  throw new HttpError(503,"The shared calendar is temporarily unavailable. Please try again shortly.");
}
export async function requireCalendarPair(client:SupabaseClient,coupleId:string,buyerId:string){
  const {data,error}=await client.from("couples").select("id,partner_1_id,partner_2_id").eq("id",coupleId).maybeSingle();calendarError(error);
  if(!data||!data.partner_2_id||![data.partner_1_id,data.partner_2_id].includes(buyerId))throw new HttpError(403,"Connect with your partner in Couple Space to use your shared calendar.");
  return data;
}
