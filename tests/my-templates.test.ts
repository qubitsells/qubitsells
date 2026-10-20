import {test} from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {createClient} from "@supabase/supabase-js";
import {accountOrders} from "../lib/server/orders";
import type {StoreOrder} from "../lib/commerce";

const buyer="11111111-1111-4111-8111-111111111111";
const order:StoreOrder={id:"22222222-2222-4222-8222-222222222222",product_slug:"halloween-pumpkin-moon",product_name:"Pumpkin Moon Date",duration_hours:72,amount_cents:200,currency:"usd",payment_mode:"test",status:"paid",created_at:"2026-10-20T00:00:00Z",paid_at:"2026-10-20T00:01:00Z",fulfilled_at:null,template_id:null,refunded_amount_cents:0};
test("purchased library returns only the buyer’s paid templates, with ready/published filters and normal order history preserved",async()=>{
  const rows=[{...order,buyer_id:buyer},{...order,id:"published",buyer_id:buyer,fulfilled_at:"2026-10-20T01:00:00Z"},{...order,id:"unpaid",buyer_id:buyer,status:"pending"},{...order,id:"refunded",buyer_id:buyer,status:"refunded"},{...order,id:"foreign",buyer_id:"stranger"}];
  const db=createClient("https://library-fixture.invalid","fixture-service-key",{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input,init)=>{
    const url=new URL(new Request(input,init).url);
    assert.equal(url.pathname,"/rest/v1/store_orders");assert.equal(url.searchParams.get("buyer_id"),`eq.${buyer}`);
    const matches=rows.filter(row=>[...url.searchParams].every(([field,filter])=>{
      if(["select","order","offset","limit"].includes(field))return true;
      const value=row[field as keyof typeof row];
      if(filter==="is.null")return value===null;if(filter==="not.is.null")return value!==null;
      if(filter.startsWith("eq."))return String(value)===filter.slice(3);
      throw Error(`Unexpected filter ${field}=${filter}`);
    }));
    return new Response(JSON.stringify(matches),{headers:{"Content-Type":"application/json","Content-Range":`0-${Math.max(0,matches.length-1)}/${matches.length}`}});
  }}});
  const load=(query:string)=>accountOrders(db,buyer,new URL(`https://store.example.test/api/account/orders?${query}`));
  assert.equal((await load("status=paid")).count,2);
  assert.deepEqual((await load("status=paid&state=ready")).orders.map(item=>item.id),[order.id]);
  assert.deepEqual((await load("status=paid&state=published")).orders.map(item=>item.id),["published"]);
  assert.equal((await load("")).count,4);
  await assert.rejects(load("status=paid&state=invalid"));await assert.rejects(load("state=ready"));
  assert.equal((await load("status=paid&id=22222222-2222-4222-8222-222222222222")).orders.length,1);
});

function render(kind:string,props:unknown={}) {
  const script=`require('tsx/cjs');require.extensions['.css']=module=>{module.exports=new Proxy({},{get:(_,key)=>key==='__esModule'?false:String(key)})};const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');const {PathnameContext}=require('next/dist/shared/lib/hooks-client-context.shared-runtime.js');const {AuthContext}=require('./context/AuthContext.tsx');const fixture=JSON.parse(process.argv[1]);const Component=fixture.kind==='header'?require('./components/storefront/StoreHeader.tsx').default:fixture.kind==='page'?require('./components/commerce/MyTemplates.tsx').default:require('./components/commerce/MyTemplates.tsx').PurchasedTemplateCard;process.stdout.write(renderToStaticMarkup(React.createElement(PathnameContext.Provider,{value:'/my-templates'},React.createElement(AuthContext.Provider,{value:{user:null,loading:false}},React.createElement(Component,fixture.props)))));`;
  return execFileSync(process.execPath,["-e",script,JSON.stringify({kind,props})],{cwd:process.cwd(),encoding:"utf8",maxBuffer:2*1024*1024});
}
test("navbar links to My Templates in place of Occasions, and guests get a sign-in route back to their collection",()=>{
  const header=render("header");assert.ok(header.includes('href="/my-templates"'));assert.ok(header.includes("My Templates"));assert.ok(!header.includes("Occasions"));
  const page=render("page");assert.ok(page.includes('href="/login?redirect=/my-templates"'));assert.ok(page.includes("templates you’ve purchased"));
});
test("purchased cards personalize unused orders, open active links, and never republish consumed or unpaid orders",()=>{
  const ready=render("card",{order,now:Date.parse("2026-10-20T02:00:00Z")});
  for(const value of ["Ready to personalize","Pumpkin Moon Date","Personalize template",`href="/templates/halloween-pumpkin-moon?order=${order.id}"`,"Up to 3 days","$2.00"])assert.ok(ready.includes(value),value);
  const published={...order,fulfilled_at:"2026-10-20T01:00:00Z",template:{short_code:"owned-link",expires_at:"2026-10-23T01:00:00Z",deleting:false}};
  const active=render("card",{order:published,now:Date.parse("2026-10-20T02:00:00Z")});assert.ok(active.includes('href="/t/owned-link"'));assert.ok(!active.includes("Personalize template"));
  const expired=render("card",{order:published,now:Date.parse("2026-10-25T02:00:00Z")});assert.ok(expired.includes("Link expired"));assert.ok(!expired.includes('href="/t/owned-link"'));assert.ok(!expired.includes("Personalize template"));
  assert.equal(render("card",{order:{...order,status:"pending"},now:0}),"");
});
