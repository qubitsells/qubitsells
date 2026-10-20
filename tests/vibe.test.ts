import {test} from "node:test";
import assert from "node:assert/strict";
import {createClient} from "@supabase/supabase-js";
import {generateVibe,requireVibePartner} from "../lib/server/vibe";
import {vibeOptionsSchema,vibeCalendarInput,vibePlanText,VIBE_MOODS,VIBE_SETTINGS,VIBE_BUDGETS,type VibeOptions} from "../lib/vibe";

test("every supported mood, setting, duration and budget yields an itinerary that fits the choices",()=>{
  for(const {value:mood} of VIBE_MOODS)for(const {value:setting} of VIBE_SETTINGS)for(const duration of [30,60,120] as const)for(const {value:budget} of VIBE_BUDGETS){
    const options={mood,setting,duration,budget},plan=generateVibe(options),next=generateVibe(options,plan.ideaKey);
    assert.deepEqual(plan.options,options);assert.notEqual(plan.id,next.id);assert.notEqual(plan.ideaKey,next.ideaKey);assert.ok(plan.title.length<=120);assert.equal(plan.steps[0].start,0);assert.equal(plan.steps.at(-1)?.end,duration);
    for(let index=1;index<plan.steps.length;index++)assert.equal(plan.steps[index].start,plan.steps[index-1].end);
    assert.ok(plan.steps.every(step=>step.end>step.start));assert.ok(plan.conversation);assert.ok(plan.bring.length);if(budget==="free")assert.ok(plan.budgetNote.includes("No purchase needed"));
  }
});
test("unsupported inputs and attempts to inject connection claims are rejected",()=>{
  const options:VibeOptions={mood:"cozy",setting:"home",duration:60,budget:"free"};assert.ok(vibeOptionsSchema.safeParse(options).success);
  for(const changes of [{mood:"unknown"},{setting:"anywhere"},{duration:0},{duration:180},{budget:"unlimited"},{isConnected:true}])assert.equal(vibeOptionsSchema.safeParse({...options,...changes}).success,false);
});
test("calendar requests include the whole generated plan and handle midnight, month and leap-year rollover",()=>{
  const plan=generateVibe({mood:"romantic",setting:"home",duration:120,budget:"free"});
  for(const [day,end] of [["2026-10-31","2026-11-01"],["2028-02-28","2028-02-29"],["2026-12-31","2027-01-01"]]){
    const event=vibeCalendarInput(plan,day,"23:30","Asia/Karachi");assert.equal(event.ends_on,end);assert.equal(event.end_time,"01:30");assert.equal(event.time_zone,"Asia/Karachi");assert.equal(event.status,"planned");
    assert.equal(event.title,plan.title);for(const step of plan.steps)assert.ok(event.notes.includes(step.description));assert.ok(event.notes.includes(plan.conversation));assert.ok(event.notes.length<=4000);
  }
  for(const [day,time,zone] of [["2026-02-30","19:00","UTC"],["2026-10-21","24:00","UTC"],["2100-12-31","23:30","UTC"],["2026-10-21","19:00","Invalid/Zone"]])assert.throws(()=>vibeCalendarInput(plan,day,time,zone));
  const copied=vibePlanText(plan);for(const text of [plan.title,plan.conversation,plan.steps[1].description,"120 minutes"])assert.ok(copied.includes(text));
});
test("connection gate queries the exact couple and checks actual membership, both partners, missing rows and provider failure",async()=>{
  const previous=globalThis.fetch;let row:Record<string,unknown>|null={id:"pair",partner_1_id:"alice",partner_2_id:"bob"},failure=false;
  const calls:URL[]=[];
  try{
    globalThis.fetch=async(input,init)=>{const request=new Request(input,init),url=new URL(request.url);calls.push(url);assert.equal(request.method,"GET");assert.equal(url.pathname,"/rest/v1/couples");assert.equal(url.searchParams.get("id"),"eq.pair");assert.equal(url.searchParams.get("select"),"id,partner_1_id,partner_2_id");return new Response(JSON.stringify(failure?{message:"Unavailable"}:row),{status:failure?503:200,headers:{"Content-Type":"application/json"}});};
    const client=createClient("https://vibe-fixture.invalid","fixture-key",{auth:{persistSession:false,autoRefreshToken:false}});
    for(const member of ["alice","bob"])assert.equal((await requireVibePartner(client,"pair",member)).id,"pair");
    await assert.rejects(requireVibePartner(client,"pair","outsider"),{status:403});row={id:"pair",partner_1_id:"alice",partner_2_id:null,is_connected:true};await assert.rejects(requireVibePartner(client,"pair","alice"),{status:403});
    row=null;await assert.rejects(requireVibePartner(client,"pair","alice"),{status:403});failure=true;await assert.rejects(requireVibePartner(client,"pair","alice"),{status:503});assert.ok(calls.length>=6);
  }finally{globalThis.fetch=previous;}
});
