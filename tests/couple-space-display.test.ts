import {test} from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";

const auth={user:null,loading:false,coupleLoading:false,coupleError:null,isConnected:false,couple:null,fullName:"Alex",partnerName:"Sam"};
function render(kind:string,overrides:Record<string,unknown>={},path="/couple-space"){
  const script=`require('tsx/cjs');require.extensions['.css']=module=>{module.exports=new Proxy({},{get:(_,key)=>key==='__esModule'?false:String(key)})};const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');const {PathnameContext}=require('next/dist/shared/lib/hooks-client-context.shared-runtime.js');const {AuthContext}=require('./context/AuthContext.tsx');const input=JSON.parse(process.argv[1]);const name={overview:'CoupleOverview',navigation:'CoupleNavigation',capsules:'SharedCapsules',ideas:'DateIdeas',shell:'CoupleShell'}[input.kind];const Component=require('./components/couple/'+name+'.tsx').default;process.stdout.write(renderToStaticMarkup(React.createElement(PathnameContext.Provider,{value:input.path},React.createElement(AuthContext.Provider,{value:{...input.auth,refreshCouple:async()=>{}}},React.createElement(Component,null,input.kind==='shell'?'Couple content':undefined)))));`;
  return execFileSync(process.execPath,["-e",script,JSON.stringify({kind,auth:{...auth,...overrides},path})],{cwd:process.cwd(),encoding:"utf8",maxBuffer:3*1024*1024});
}
test("Couple Space provides its own navigation and a clear switch to the personal account",()=>{
  const html=render("navigation",{},"/couple-space/calendar");
  for(const text of ["Overview","Couple Profile","Shared Calendar","Shared Capsules","Vibe Generator",'aria-label="Couple Space navigation"'])assert.ok(html.includes(text),text);
  const links=html.match(/<a\b[^>]*>/g)||[];assert.equal(links.filter(link=>link.includes('aria-current="page"')).length,1);assert.ok(links.some(link=>link.includes('href="/couple-space/calendar"')&&link.includes('aria-current="page"')));
  const shell=render("shell");assert.equal((shell.match(/<main\b/g)||[]).length,1);assert.ok(shell.includes("Personal account"));assert.ok(shell.includes('href="/profile"'));
});
test("overview offers sign-in and explicit partner setup, without creating a space on a visit",()=>{
  const guest=render("overview");assert.ok(guest.includes('href="/login?redirect=/couple-space"'));assert.ok(!guest.includes("Checking your plans"));
  const solo=render("overview",{user:{id:"alex"}});assert.ok(solo.includes("Set up Couple Space"));
  const awaiting=render("overview",{user:{id:"alex"},couple:{id:"couple",partner_2_id:null}});assert.ok(awaiting.includes("Invite your partner"));assert.ok(!awaiting.includes("Connected together"));
});
test("connected overview shows real couple details and all shared tools without personal commerce sections",()=>{
  const html=render("overview",{user:{id:"alex"},isConnected:true,couple:{id:"couple",partner_2_id:"sam",anniversary_date:"2020-05-16",couple_motto:"Our shared story"}});
  for(const text of ["Alex &amp; Sam","16 May 2020","Our shared story","Connected together",'href="/couple-space/profile"','href="/couple-space/calendar"','href="/couple-space/time-capsules"','href="/couple-space/date-ideas"'])assert.ok(html.includes(text),text);
  for(const text of ["Your orders","Wishlist","Work details","Create Couple Space"])assert.ok(!html.includes(text),text);
});
test("shared capsule page requires a connected partner and date ideas lead into the shared calendar",()=>{
  const guest=render("capsules");assert.ok(guest.includes('href="/login?redirect=/couple-space/time-capsules"'));assert.ok(!guest.includes("Create a capsule"));
  const solo=render("capsules",{user:{id:"alex"}});assert.ok(solo.includes("Connect with your partner"));assert.ok(!solo.includes("Create a capsule"));
  const idea=render("ideas");assert.ok(idea.includes("Sign in to Couple Space"));assert.ok(!idea.includes("Generate our vibe"));
});
