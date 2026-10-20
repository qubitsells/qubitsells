import "server-only";
import type {SupabaseClient} from "@supabase/supabase-js";
import {z} from "zod";
import {databaseResult} from "./commerce";
import {HttpError} from "./security";

export async function accountOrders(db:SupabaseClient,buyerId:string,url:URL) {
  const raw=Number(url.searchParams.get("page")||0),page=Number.isFinite(raw)?Math.max(0,Math.min(Math.floor(raw),10000)):0;
  let query=db.from("store_orders").select("id,product_slug,product_name,duration_hours,amount_cents,currency,payment_mode,status,created_at,paid_at,fulfilled_at,template_id,refunded_amount_cents,template:couple_templates(short_code,expires_at,deleting)",{count:"exact"}).eq("buyer_id",buyerId);
  const id=url.searchParams.get("id");if(id&&!z.uuid().safeParse(id).success)throw new HttpError(400,"Invalid order reference.");if(id)query=query.eq("id",id);
  const status=url.searchParams.get("status"),state=url.searchParams.get("state");
  if(status&&status!=="paid")throw new HttpError(400,"Choose a valid order filter.");
  if(status==="paid")query=query.eq("status","paid");
  if(state){if(status!=="paid"||(state!=="ready"&&state!=="published"))throw new HttpError(400,"Choose a valid template filter.");query=state==="ready"?query.is("fulfilled_at",null):query.not("fulfilled_at","is",null);}
  const {data,count,error}=await query.order("created_at",{ascending:false}).order("id",{ascending:false}).range(page*15,page*15+14);
  await databaseResult(Promise.resolve({data:null,error}));
  return {orders:data||[],count:count||0};
}
