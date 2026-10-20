import {test} from "node:test";
import assert from "node:assert/strict";
import {createClient} from "@supabase/supabase-js";
import {accountReviewEntries,completeReviewInvitations,ensureReviewInvitations,inviteOrderReview,reviewAccountHref} from "../lib/server/reviews";

const buyer="11111111-1111-4111-8111-111111111111",stranger="22222222-2222-4222-8222-222222222222";
type Row=Record<string,unknown>;
const purchased=(id:string,slug="halloween-pumpkin-moon",extra:Row={})=>({id,buyer_id:buyer,product_slug:slug,product_name:slug==="starlit-story"?"Starlit Story":"Pumpkin Moon Date",payment_mode:"test" as const,status:"paid",paid_at:new Date().toISOString(),...extra});
const review=(slug:string,extra:Row={})=>({id:`review-${slug}`,buyer_id:buyer,product_slug:slug,payment_mode:"test",author_name:"Alex",rating:4,title:"A personal surprise",body:"A thoughtful template with a lovely story.",created_at:new Date().toISOString(),updated_at:new Date().toISOString(),...extra});
async function fixture(run:(db:ReturnType<typeof createClient>,tables:Record<string,Row[]>)=>Promise<void>,orders:Row[],reviews:Row[]=[],notifications:Row[]=[]) {
  const previous=globalThis.fetch,mode=process.env.STRIPE_MODE;
  const tables:Record<string,Row[]>={store_orders:orders,store_reviews:reviews,store_notifications:notifications};
  try {
    process.env.STRIPE_MODE="test";
    globalThis.fetch=async(input,init)=>{
      const request=new Request(input,init),url=new URL(request.url),table=tables[url.pathname.split("/").pop()!];assert.ok(table,"Unknown table");
      const json=(value:unknown)=>new Response(JSON.stringify(value),{headers:{"Content-Type":"application/json"}});
      if(request.method==="POST") {const body=await request.json(),rows=Array.isArray(body)?body:[body];for(const row of rows)if(!table.some(item=>item.user_id===row.user_id&&item.dedupe_key===row.dedupe_key))table.push({id:`note-${table.length}`,read_at:null,...row});return json(null);}
      let rows=table.filter(row=>Array.from(url.searchParams).every(([key,condition])=>{
        if(["select","order","offset","limit"].includes(key))return true;
        if(condition.startsWith("eq."))return String(row[key])===condition.slice(3);
        if(condition==="is.null")return row[key]===null;
        if(condition.startsWith("in.("))return condition.slice(4,-1).split(",").map(value=>value.replace(/^"|"$/g,"")).includes(String(row[key]));
        throw Error(`Unexpected query ${key}=${condition}`);
      }));
      if(request.method==="PATCH"){const values=await request.json();rows.forEach(row=>Object.assign(row,values));return json(null);}
      rows=rows.slice(Number(url.searchParams.get("offset")||0),Number(url.searchParams.get("offset")||0)+Number(url.searchParams.get("limit")||rows.length));
      return json(request.headers.get("Accept")?.includes("vnd.pgrst.object")?rows[0]:rows);
    };
    await run(createClient("https://review-fixture.invalid","fixture-service-key",{auth:{persistSession:false,autoRefreshToken:false}}),tables);
  }finally{globalThis.fetch=previous;if(mode===undefined)delete process.env.STRIPE_MODE;else process.env.STRIPE_MODE=mode;}
}
test("review center combines submitted reviews and eligible purchases without duplicate products or other buyers",async()=>{
  await fixture(async db=>{
    const items=await accountReviewEntries(buyer,db);
    assert.equal(items.length,4);
    assert.equal(items.filter(item=>!item.review).length,1);
    const pumpkin=items.find(item=>item.product_slug==="halloween-pumpkin-moon"&&item.payment_mode==="test")!;
    assert.equal(pumpkin.order_id,"latest");assert.equal(pumpkin.review?.rating,4);assert.equal(pumpkin.can_review,true);
    const live=items.find(item=>item.payment_mode==="live")!;assert.equal(live.can_review,false);assert.ok(live.review);
    const archived=items.find(item=>item.product_slug==="our-little-pink-day")!;assert.equal(archived.order_id,null);assert.equal(archived.can_review,false);assert.ok(archived.review);
    assert.ok(!items.some(item=>item.product_slug==="anime-storm-and-flame"));
  },[purchased("latest"),purchased("older"),purchased("pending-review","starlit-story"),purchased("other-mode","halloween-pumpkin-moon",{payment_mode:"live"}),purchased("unpaid","anime-storm-and-flame",{status:"pending"}),purchased("foreign","anime-storm-and-flame",{buyer_id:stranger})],[review("halloween-pumpkin-moon"),review("halloween-pumpkin-moon",{payment_mode:"live"}),review("our-little-pink-day"),review("anime-storm-and-flame",{buyer_id:stranger})]);
});
test("confirmed purchases receive immediate, duplicate-safe review invitations; unpaid and already-reviewed purchases do not",async()=>{
  const paid=purchased("paid"),unpaid=purchased("unpaid","starlit-story",{status:"pending"});
  await fixture(async(db,tables)=>{
    await inviteOrderReview(paid,db);await inviteOrderReview(paid,db);
    assert.equal(tables.store_notifications.length,1);
    assert.equal(tables.store_notifications[0].href,reviewAccountHref("halloween-pumpkin-moon","test"));
    await inviteOrderReview(unpaid,db);assert.equal(tables.store_notifications.length,1);
    await ensureReviewInvitations(buyer,db);assert.equal(tables.store_notifications.length,1);
    tables.store_reviews.push(review("halloween-pumpkin-moon"));
    tables.store_notifications.length=0;await inviteOrderReview(paid,db);await ensureReviewInvitations(buyer,db);assert.equal(tables.store_notifications.length,0);
  },[paid,unpaid]);
});
test("existing paid orders are invited once per product and mode, and saving clears only the buyer’s matching invitations",async()=>{
  await fixture(async(db,tables)=>{
    await ensureReviewInvitations(buyer,db);await ensureReviewInvitations(buyer,db);
    assert.equal(tables.store_notifications.length,2);
    tables.store_notifications.push({id:"foreign",user_id:stranger,kind:"review_request",href:reviewAccountHref("halloween-pumpkin-moon","test"),read_at:null},{id:"other-mode",user_id:buyer,kind:"review_request",href:reviewAccountHref("halloween-pumpkin-moon","live"),read_at:null});
    await completeReviewInvitations(buyer,"halloween-pumpkin-moon",db);
    assert.ok(tables.store_notifications.find(item=>item.dedupe_key==="review:latest")?.read_at);
    for(const note of tables.store_notifications.filter(item=>item.dedupe_key!=="review:latest"))assert.equal(note.read_at,null);
  },[purchased("latest"),purchased("older"),purchased("second","starlit-story"),purchased("live","starlit-story",{payment_mode:"live"})]);
});
