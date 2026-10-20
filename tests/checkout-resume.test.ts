import {test} from "node:test";
import assert from "node:assert/strict";
import {createClient} from "@supabase/supabase-js";
import {createOrResumeCheckout} from "../lib/server/checkout";
import {checkoutRequestSchema} from "../lib/commerce";
import type {StoreOrder} from "../lib/commerce";
import type {StripeSession} from "../lib/server/stripe";

const buyer = {id:"11111111-1111-4111-8111-111111111111",email:"buyer@example.test"};
const id = "22222222-2222-4222-8222-222222222222";
const attempt = "33333333-3333-4333-8333-333333333333";
const origin = "https://store.example.test";
type Order = StoreOrder & {buyer_id:string;checkout_key:string;stripe_session_id:string|null};
function order(overrides:Partial<Order> = {}): Order {
  return {id,buyer_id:buyer.id,checkout_key:attempt,product_slug:"halloween-pumpkin-moon",product_name:"Pumpkin Moon Date",duration_hours:72,amount_cents:200,currency:"usd",payment_mode:"test",status:"pending",created_at:"2026-10-20T00:00:00Z",paid_at:null,fulfilled_at:null,refunded_amount_cents:0,template_id:null,stripe_session_id:"cs_test_original",...overrides};
}
function session(overrides:Partial<StripeSession> = {}): StripeSession {
  return {id:"cs_test_original",object:"checkout.session",url:"https://checkout.stripe.com/c/pay/original",status:"open",payment_status:"unpaid",amount_total:200,currency:"usd",livemode:false,client_reference_id:id,metadata:{order_id:id},payment_intent:null,...overrides};
}

// Exercise real Supabase query builders and Stripe HTTP serialization against
// an isolated provider fixture. No external account or payment is modified.
async function fixture(run:(f:ReturnType<typeof provider>)=>Promise<void>, rows=[order()], sessions=[session()]) {
  const previousFetch=globalThis.fetch;
  const keys=["STRIPE_MODE","STRIPE_SECRET_KEY","STRIPE_WEBHOOK_SECRET"];
  const previous=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
  try {
    process.env.STRIPE_MODE="test";process.env.STRIPE_SECRET_KEY="sk_test_"+"a".repeat(30);process.env.STRIPE_WEBHOOK_SECRET="whsec_"+"b".repeat(30);
    const f=provider(rows,sessions);globalThis.fetch=f.fetch;
    await run(f);
  } finally {globalThis.fetch=previousFetch;for(const key of keys){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}}
}
function provider(rows:Order[], sessions:StripeSession[]) {
  const db=createClient("https://orders.example.test","fixture-service-key",{auth:{persistSession:false,autoRefreshToken:false}});
  const calls:{url:URL;method:string;body:string;key:string|null}[]=[];
  const created=new Map<string,StripeSession>();
  let loseAttachment=false;
  const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json"}});
  const fetch:typeof globalThis.fetch=async(input,init)=>{
    const request=new Request(input,init),url=new URL(request.url),method=request.method;
    const body=method==="GET"?"":await request.text(),key=request.headers.get("Idempotency-Key");
    calls.push({url,method,body,key});
    if(url.hostname==="api.stripe.com") {
      if(url.pathname.startsWith("/v1/payment_intents/"))return json({id:"pi_original",status:"succeeded",amount:200,currency:"usd",livemode:false,metadata:{order_id:id},latest_charge:{amount:200,amount_refunded:0}});
      if(method==="GET") {const found=sessions.find(item=>item.id===url.pathname.split("/").pop());assert.ok(found,"Unknown Stripe session");return json({...found,...(url.searchParams.has("expand[]")?{line_items:{data:[{quantity:1,amount_total:found.amount_total}]}}:{})});}
      assert.equal(url.pathname,"/v1/checkout/sessions");assert.ok(key);
      if(!created.has(key)) {const params=new URLSearchParams(body);created.set(key,session({id:`cs_test_replacement${created.size}`,url:`https://checkout.stripe.com/c/pay/replacement${created.size}`,amount_total:Number(params.get("line_items[0][price_data][unit_amount]")),client_reference_id:params.get("client_reference_id"),metadata:{order_id:params.get("metadata[order_id]")!}}));sessions.push(created.get(key)!);}
      return json(created.get(key));
    }
    if(url.pathname==="/rest/v1/store_reviews")return json([]);
    if(url.pathname==="/rest/v1/store_notifications"){assert.equal(method,"POST");return json(null);}
    assert.equal(url.pathname,"/rest/v1/store_orders");
    const matches=(row:Order)=>Array.from(url.searchParams).every(([field,filter])=>{
      if(["select","order","limit","on_conflict"].includes(field))return true;
      const value=row[field as keyof Order];
      if(filter.startsWith("eq."))return String(value)===filter.slice(3);
      if(filter.startsWith("in.("))return filter.slice(4,-1).split(",").includes(String(value));
      if(filter==="is.null")return value===null;
      if(filter.startsWith("lte."))return Number(value)<=Number(filter.slice(4));
      throw new Error(`Unexpected fixture filter ${field}=${filter}`);
    });
    if(method==="POST") {const data=JSON.parse(body);if(!rows.some(row=>row.buyer_id===data.buyer_id&&row.checkout_key===data.checkout_key))rows.push(order({...data,id:rows.length?"44444444-4444-4444-8444-444444444444":id,stripe_session_id:null}));return json(null);}
    const selected=rows.filter(matches);
    if(method==="PATCH") {
      const values=JSON.parse(body);
      if(loseAttachment&&values.stripe_session_id){loseAttachment=false;return json({message:"Temporary storage failure"},503);}
      selected.forEach(row=>Object.assign(row,values));
    }
    const result=url.searchParams.get("limit")==="1"?selected.slice(-1):selected;
    return json(request.headers.get("Accept")?.includes("vnd.pgrst.object")?result[0]:result);
  };
  return {db,rows,sessions,calls,created,fetch,loseNextAttachment:()=>{loseAttachment=true;}};
}

test("pending order resumes its original Stripe session; returning to the product also reuses the order",async()=>{
  await fixture(async f=>{
    const first=await createOrResumeCheckout({order_id:id},buyer,origin,f.db);
    assert.equal(first.url,"https://checkout.stripe.com/c/pay/original");
    const next=await createOrResumeCheckout({product_slug:"halloween-pumpkin-moon",duration_hours:72,checkout_key:"55555555-5555-4555-8555-555555555555"},buyer,origin,f.db);
    assert.equal(next.url,first.url);assert.equal(f.rows.length,1);
    assert.equal(f.calls.filter(call=>call.method==="POST").length,0);
  });
});
test("expired checkout renews the payment session on the same order and retries reuse it",async()=>{
  await fixture(async f=>{
    const first=await createOrResumeCheckout({order_id:id},buyer,origin,f.db);
    const next=await createOrResumeCheckout({order_id:id},buyer,origin,f.db);
    assert.equal(next.url,first.url);assert.equal(f.rows.length,1);assert.equal(f.rows[0].id,id);assert.equal(f.rows[0].status,"pending");assert.equal(f.created.size,1);
    const create=f.calls.find(call=>call.url.hostname==="api.stripe.com"&&call.method==="POST")!;
    const params=new URLSearchParams(create.body);
    assert.equal(params.get("client_reference_id"),id);assert.equal(params.get("metadata[order_id]"),id);assert.equal(params.get("line_items[0][price_data][unit_amount]"),"200");assert.equal(params.get("cancel_url"),`${origin}/profile?view=orders#order-${id}`);
    assert.ok(create.key?.endsWith("-after-cs_test_original"));
  },[order({status:"expired"})],[session({status:"expired",url:null})]);
});
test("a lost database response and concurrent payment retries cannot create extra Stripe sessions",async()=>{
  await fixture(async f=>{
    f.loseNextAttachment();
    await assert.rejects(createOrResumeCheckout({order_id:id},buyer,origin,f.db));
    const result=await Promise.all([createOrResumeCheckout({order_id:id},buyer,origin,f.db),createOrResumeCheckout({order_id:id},buyer,origin,f.db)]);
    assert.equal(result[0].url,result[1].url);assert.equal(f.created.size,1);assert.equal(f.rows.length,1);
  },[order()],[session({status:"expired",url:null})]);
});
test("payment already completed in Stripe confirms the existing pending order instead of charging again",async()=>{
  await fixture(async f=>{
    const result=await createOrResumeCheckout({order_id:id},buyer,origin,f.db);
    assert.equal(result.url,`${origin}/checkout/success?session_id=cs_test_original`);assert.equal(f.rows[0].status,"paid");assert.equal(f.rows.length,1);assert.equal(f.created.size,0);
    const paid=await createOrResumeCheckout({order_id:id},buyer,origin,f.db);
    assert.equal(paid.url,`${origin}/templates/halloween-pumpkin-moon?order=${id}`);
    assert.equal(f.created.size,0);
  },[order()],[session({status:"complete",payment_status:"paid",url:null,payment_intent:"pi_original"})]);
});
test("resuming an order enforces ownership, payment mode, recorded price and refund status",async()=>{
  for(const changes of [{buyer_id:"66666666-6666-4666-8666-666666666666"},{payment_mode:"live" as const},{amount_cents:1},{status:"refunded" as const}])await fixture(async f=>{
    await assert.rejects(createOrResumeCheckout({order_id:id},buyer,origin,f.db));assert.equal(f.calls.filter(call=>call.url.hostname==="api.stripe.com").length,0);assert.equal(f.rows.length,1);
  },[order(changes)]);
  assert.equal(checkoutRequestSchema.safeParse({order_id:id,amount_cents:1}).success,false);
  assert.equal(checkoutRequestSchema.safeParse({order_id:id,product_slug:"starlit-story",duration_hours:72,checkout_key:attempt}).success,false);
});
test("a new purchase still creates a correctly priced order when no matching payment is pending",async()=>{
  await fixture(async f=>{
    const result=await createOrResumeCheckout({product_slug:"halloween-pumpkin-moon",duration_hours:168,checkout_key:attempt},buyer,origin,f.db);
    assert.ok(result.url.startsWith("https://checkout.stripe.com/"));assert.equal(f.rows.length,1);assert.equal(f.rows[0].amount_cents,300);assert.equal(f.rows[0].duration_hours,168);assert.equal(f.created.size,1);
  },[],[]);
});
