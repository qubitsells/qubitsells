import {test} from "node:test";
import assert from "node:assert/strict";
import {createHmac} from "node:crypto";
import {verifyStripeSignature,type StripeSession} from "../lib/server/stripe";
import {validatePaidSession} from "../lib/server/commerce";
import {checkoutSchema} from "../lib/commerce";
import {GET as checkoutAvailability} from "../app/api/checkout/route";

test("Stripe webhooks require an authentic raw-body signature and a recent timestamp",()=>{
  const raw=Buffer.from('{"type":"checkout.session.completed"}'),secret="whsec_fixture",time=1792459200;
  const signed=(body:Buffer,stamp:number)=>`t=${stamp},v1=${createHmac("sha256",secret).update(`${stamp}.`).update(body).digest("hex")}`;
  verifyStripeSignature(raw,signed(raw,time),secret,time*1000);
  assert.throws(()=>verifyStripeSignature(Buffer.from('{"type":"charge.refunded"}'),signed(raw,time),secret,time*1000));
  assert.throws(()=>verifyStripeSignature(raw,signed(raw,time-301),secret,time*1000));
  assert.throws(()=>verifyStripeSignature(raw,signed(raw,time+301),secret,time*1000));
  assert.throws(()=>verifyStripeSignature(raw,null,secret,time*1000));
  assert.throws(()=>verifyStripeSignature(raw,`t=${time},v1=invalid`,secret,time*1000));
});
test("a checkout return cannot grant access with the wrong order, amount, currency, mode, quantity, or payment state",()=>{
  const session:StripeSession={id:"cs_test_fixture",object:"checkout.session",url:null,status:"complete",payment_status:"paid",amount_total:200,currency:"usd",livemode:false,client_reference_id:"order",metadata:{order_id:"order"},payment_intent:"pi_fixture",line_items:{data:[{quantity:1,amount_total:200}]}};
  const order={id:"order",stripe_session_id:"cs_test_fixture",payment_mode:"test",amount_cents:200} as Parameters<typeof validatePaidSession>[1];
  validatePaidSession(session,order);
  for(const change of [{payment_status:"unpaid"},{amount_total:1},{currency:"eur"},{livemode:true},{status:"open"},{client_reference_id:"stranger"},{metadata:{order_id:"stranger"}},{payment_intent:null},{line_items:{data:[{quantity:2,amount_total:200}]}},{line_items:undefined}]) assert.throws(()=>validatePaidSession({...session,...change},order));
});
test("checkout accepts only real catalog products and agreed link tiers; a client cannot submit a price",()=>{
  const input={product_slug:"halloween-pumpkin-moon",duration_hours:72,checkout_key:"11111111-1111-4111-8111-111111111111",amount_cents:1};
  assert.equal((checkoutSchema.parse(input) as Record<string,unknown>).amount_cents,undefined);
  assert.equal(checkoutSchema.safeParse({...input,product_slug:"fake-product"}).success,false);
  assert.equal(checkoutSchema.safeParse({...input,duration_hours:10000}).success,false);
});
test("checkout remains unavailable with valid-format credentials until the commerce table is accessible",async()=>{
  const previousFetch=globalThis.fetch;
  const keys=["STRIPE_MODE","STRIPE_SECRET_KEY","STRIPE_WEBHOOK_SECRET","NEXT_PUBLIC_SUPABASE_URL","SUPABASE_SERVICE_ROLE_KEY"];
  const previous=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
  try{
    process.env.STRIPE_MODE="test";process.env.STRIPE_SECRET_KEY="sk_test_"+"a".repeat(30);process.env.STRIPE_WEBHOOK_SECRET="whsec_"+"b".repeat(30);process.env.NEXT_PUBLIC_SUPABASE_URL="https://checkout-ready.invalid";process.env.SUPABASE_SERVICE_ROLE_KEY="fixture-key";
    globalThis.fetch=async()=>new Response(JSON.stringify({code:"PGRST205",message:"Table unavailable"}),{status:404,headers:{"Content-Type":"application/json"}});
    assert.deepEqual(await (await checkoutAvailability()).json(),{available:false,mode:"test"});
    globalThis.fetch=async()=>new Response("[]",{status:200,headers:{"Content-Type":"application/json"}});
    assert.deepEqual(await (await checkoutAvailability()).json(),{available:true,mode:"test"});
  }finally{globalThis.fetch=previousFetch;for(const key of keys){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}}
});
