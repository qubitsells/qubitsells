import "server-only";
import type {SupabaseClient} from "@supabase/supabase-js";
import type {AccountReviewEntry, ProductReview} from "@/lib/commerce";
import {PRODUCTS} from "@/lib/storefront";
import {databaseResult} from "./commerce";
import {stripeMode} from "./stripe";

type PaidOrder={id:string;buyer_id:string;product_slug:string;product_name:string;payment_mode:"test"|"live";paid_at:string|null};
export const reviewAccountHref=(slug:string,mode:string)=>`/profile?view=reviews&review=${encodeURIComponent(slug)}&mode=${mode}`;
export async function accountReviewEntries(buyerId:string,db:SupabaseClient):Promise<AccountReviewEntry[]> {
  const reviews:(ProductReview&{product_slug:string})[]=(await databaseResult(db.from("store_reviews").select("id,product_slug,author_name,rating,title,body,created_at,updated_at,payment_mode").eq("buyer_id",buyerId)))||[];
  const entries=new Map<string,AccountReviewEntry>();
  // Page through purchases so repeat purchases never hide a different product.
  for(let page=0;;page++) {
    const orders:PaidOrder[]=(await databaseResult(db.from("store_orders").select("id,buyer_id,product_slug,product_name,payment_mode,paid_at").eq("buyer_id",buyerId).eq("status","paid").order("paid_at",{ascending:false}).order("id",{ascending:false}).range(page*1000,page*1000+999)))||[];
    for(const order of orders){const key=`${order.product_slug}:${order.payment_mode}`;if(!entries.has(key))entries.set(key,{product_slug:order.product_slug,product_name:order.product_name,payment_mode:order.payment_mode,order_id:order.id,purchased_at:order.paid_at,review:null,can_review:order.payment_mode===stripeMode()});}
    if(orders.length<1000||entries.size===PRODUCTS.length*2)break;
  }
  for(const review of reviews){const key=`${review.product_slug}:${review.payment_mode}`;let entry=entries.get(key);if(!entry){entry={product_slug:review.product_slug,product_name:PRODUCTS.find(item=>item.slug===review.product_slug)?.name||"Your template",payment_mode:review.payment_mode,order_id:null,purchased_at:null,review:null,can_review:false};entries.set(key,entry);}entry.review=review;}
  return [...entries.values()];
}
export async function inviteOrderReview(order:PaidOrder,db:SupabaseClient) {
  const paid=await databaseResult(db.from("store_orders").select("id").eq("id",order.id).eq("buyer_id",order.buyer_id).eq("payment_mode",order.payment_mode).eq("status","paid").maybeSingle());
  if(!paid)return;
  const existing=await databaseResult(db.from("store_reviews").select("id").eq("buyer_id",order.buyer_id).eq("product_slug",order.product_slug).eq("payment_mode",order.payment_mode).maybeSingle());
  if(!existing)await databaseResult(db.from("store_notifications").upsert({user_id:order.buyer_id,kind:"review_request",title:"Your template, your opinion",message:`${order.product_name} · Tell us how it went. Choose your stars and leave a quick review.`,href:reviewAccountHref(order.product_slug,order.payment_mode),dedupe_key:`review:${order.id}`},{onConflict:"user_id,dedupe_key",ignoreDuplicates:true}));
}
export async function ensureReviewInvitations(buyerId:string,db:SupabaseClient) {
  const entries=await accountReviewEntries(buyerId,db);
  const invitations=entries.filter(entry=>entry.can_review&&!entry.review&&entry.order_id).map(entry=>({user_id:buyerId,kind:"review_request",title:"Your template, your opinion",message:`${entry.product_name} · Tell us how it went. Choose your stars and leave a quick review.`,href:reviewAccountHref(entry.product_slug,entry.payment_mode),dedupe_key:`review:${entry.order_id}`}));
  if(invitations.length)await databaseResult(db.from("store_notifications").upsert(invitations,{onConflict:"user_id,dedupe_key",ignoreDuplicates:true}));
}
export async function completeReviewInvitations(buyerId:string,slug:string,db:SupabaseClient) {
  await databaseResult(db.from("store_notifications").update({read_at:new Date().toISOString()}).eq("user_id",buyerId).eq("kind","review_request").in("href",[reviewAccountHref(slug,stripeMode()),`/products/${slug}?review=1#reviews`]).is("read_at",null));
}
