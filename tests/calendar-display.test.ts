import {test} from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
const event={id:"44444444-4444-4444-8444-444444444444",couple_id:"couple",creator_id:"alice",updated_by:"alice",version:1,confirmation_status:"accepted",requested_by:"alice",requested_at:"2026-10-19T00:00:00Z",responded_by:"bob",responded_at:"2026-10-19T00:00:00Z",title:"Dinner and a moonlit walk",category:"date",status:"confirmed",starts_on:"2026-10-20",ends_on:"2026-10-20",all_day:false,start_time:"19:00",end_time:"21:00",time_zone:"Asia/Karachi",location:"Our favourite cafe",notes:"Bring the camera.",created_at:"2026-10-19T00:00:00Z",updated_at:"2026-10-19T00:00:00Z"};
function render(kind:string,auth:unknown={},props:unknown={}){
  const script=`require('tsx/cjs');require.extensions['.css']=module=>{module.exports=new Proxy({},{get:(_,key)=>key==='__esModule'?false:String(key)})};const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');const {PathnameContext}=require('next/dist/shared/lib/hooks-client-context.shared-runtime.js');const {AuthContext}=require('./context/AuthContext.tsx');const input=JSON.parse(process.argv[1]);const calendar=require('./components/calendar/SharedCalendar.tsx');const Component=input.kind==='month'?calendar.CalendarMonth:input.kind==='plan'?calendar.PlanCard:input.kind==='editor'?require('./components/calendar/EventEditor.tsx').default:calendar.default;process.stdout.write(renderToStaticMarkup(React.createElement(PathnameContext.Provider,{value:'/couple-space/calendar'},React.createElement(AuthContext.Provider,{value:{user:null,loading:false,coupleLoading:false,couple:null,isConnected:false,...input.auth}},React.createElement(Component,{...input.props,onSelect:()=>{},onEdit:()=>{},onClose:()=>{},onSaved:()=>{},onConflict:()=>{}})))));`;
  return execFileSync(process.execPath,["-e",script,JSON.stringify({kind,auth,props})],{cwd:process.cwd(),encoding:"utf8",maxBuffer:3*1024*1024});
}
test("shared calendar requires sign-in and a connected partner without creating a Couple Space",()=>{
  const guest=render("page");assert.ok(guest.includes('href="/login?redirect=/couple-space/calendar"'));assert.ok(!guest.includes("Make a plan"));
  const solo=render("page",{user:{id:"alice"},couple:{id:"couple",partner_1_id:"alice",partner_2_id:null},isConnected:false});assert.ok(solo.includes("Connect with your partner"));assert.ok(!solo.includes("Make a plan"));
});
test("connected calendar renders month/agenda controls and an accessible selected date with saved plans",()=>{
  const page=render("page",{user:{id:"alice"},couple:{id:"couple",partner_1_id:"alice",partner_2_id:"bob"},isConnected:true});
  for(const text of ["Make time","Make a plan","Previous month","Next month","Month","Agenda","Private to your connected Couple Space"])assert.ok(page.includes(text),text);
  const month=render("month",{},{month:"2026-10",selected:"2026-10-20",today:"2026-10-20",events:[event]});assert.ok(month.includes("Dinner and a moonlit walk"));assert.ok(month.includes('aria-current="date"'));assert.ok(month.includes('aria-pressed="true"'));assert.ok(month.includes("20 October 2026, 1 plan"));
});
test("shared plan cards show time zone, location, notes, author and edit action",()=>{
  const html=render("plan",{},{event,userId:"alice",showDate:true});for(const value of ["Dinner and a moonlit walk","Confirmed together","7:00 PM – 9:00 PM","Asia/Karachi","Our favourite cafe","Bring the camera.","Added by","you","View &amp; edit"])assert.ok(html.includes(value),value);
});
test("pending plans visibly distinguish sender and recipient, and only the recipient sees response buttons",()=>{
  const pending={...event,status:"planned",confirmation_status:"pending",responded_by:null,responded_at:null};
  const sender=render("plan",{},{event:pending,userId:"alice"});assert.ok(sender.includes("Waiting for your partner"));assert.ok(!sender.includes(">Confirm plan</button>"));assert.ok(!sender.includes(">Decline</button>"));
  const recipient=render("plan",{},{event:pending,userId:"bob"});for(const text of ["Awaiting your response","Confirm plan","Decline"])assert.ok(recipient.includes(text),text);
  for(const change of [{status:"cancelled"},{confirmation_status:"declined"},{confirmation_status:"accepted",status:"confirmed"}])assert.ok(!render("plan",{},{event:{...pending,...change},userId:"bob"}).includes(">Confirm plan</button>"));
  const month=render("month",{},{month:"2026-10",selected:"2026-10-20",today:"2026-10-20",events:[pending]});assert.ok(month.includes("Requested · Dinner"));
});
test("event editor exposes dates, time zone, all-day and shared notes with the correct new/edit actions",()=>{
  const fresh=render("editor",{},{coupleId:"couple",date:"2026-10-20"});for(const value of ["What’s the plan?","Kind of plan","Start date","End date","All-day plan","Plan’s time zone","Where?","The little details","Send plan request"])assert.ok(fresh.includes(value),value);
  assert.ok(!fresh.includes("Remove plan"));const editing=render("editor",{},{coupleId:"couple",date:"2026-10-20",event});assert.ok(editing.includes("Save changes"));assert.ok(editing.includes("Remove plan"));assert.ok(editing.includes("Bring the camera."));
});
