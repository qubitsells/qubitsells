import {test} from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {generateVibe} from "../lib/server/vibe";

function render(kind:string,auth:Record<string,unknown>={},plan?:unknown){
  const script=`require('tsx/cjs');require.extensions['.css']=module=>{module.exports=new Proxy({},{get:(_,key)=>key==='__esModule'?false:String(key)})};const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');const {AuthContext}=require('./context/AuthContext.tsx');const args=JSON.parse(process.argv[1]);const module=require('./components/vibe/VibeGenerator.tsx');const Component=args.kind==='floating'?require('./components/FloatingVibeCheck.tsx').default:args.kind==='result'?module.VibeResult:module.default;process.stdout.write(renderToStaticMarkup(React.createElement(AuthContext.Provider,{value:{user:null,loading:false,coupleLoading:false,coupleError:null,isConnected:false,couple:null,...args.auth}},React.createElement(Component,{coupleId:'pair',plan:args.plan}))));`;
  return execFileSync(process.execPath,["-e",script,JSON.stringify({kind,auth,plan})],{cwd:process.cwd(),encoding:"utf8",maxBuffer:3*1024*1024});
}
test("guest and unconnected users see connection guidance with no generator controls or generated plan",()=>{
  const guest=render("generator");assert.ok(guest.includes('href="/login?redirect=/couple-space/date-ideas"'));assert.ok(!guest.includes("Generate our vibe"));
  const solo=render("generator",{user:{id:"alice"},couple:{id:"pair",partner_2_id:null},isConnected:true});assert.ok(solo.includes("Connect with your partner"));assert.ok(!solo.includes("Generate our vibe"));
  const loading=render("generator",{loading:true});assert.ok(loading.includes("Checking your Couple Space"));assert.ok(!loading.includes("Generate our vibe"));
});
test("connected generator shows real preferences but requires Generate before displaying a date",()=>{
  const html=render("generator",{user:{id:"alice"},couple:{id:"pair",partner_1_id:"alice",partner_2_id:"bob"},isConnected:true,partnerName:"Bob"});
  for(const text of ["Generate our vibe","Unwind","Reconnect","Explore","Have fun","Stay in","Head out","30 minutes","1 hour","2 hours","No spend","Keep it low","Flexible","Connected with Bob","Your next good"])assert.ok(html.includes(text),text);
  assert.ok(!html.includes("Plan this with my partner"));assert.ok(!html.includes("Send plan request"));
});
test("results show itinerary, conversation, practical details and an explicit calendar invitation action",()=>{
  const plan=generateVibe({mood:"cozy",setting:"home",duration:60,budget:"free"}),html=render("result",{},plan);
  for(const text of [plan.title,plan.steps[1].description,plan.conversation,"Bring along","Copy this plan","Plan this with my partner","shared calendar"])assert.ok(html.includes(text.replaceAll("&","&amp;")),text);
  assert.ok(!html.includes("Request sent"));assert.ok(!html.includes("GPS coordinates"));
});
test("floating trigger exposes a labelled native dialog and theme-aligned generator entry",()=>{
  const html=render("floating");for(const text of ["Vibe Generator",'aria-haspopup="dialog"','aria-expanded="false"',"<dialog",'aria-label="Close Vibe Generator"'])assert.ok(html.includes(text),text);
  assert.ok(!html.includes("Tonight&#x27;s Mood"));assert.ok(!html.includes("Love.svg"));assert.ok(!html.includes("Generate our vibe"));
});
