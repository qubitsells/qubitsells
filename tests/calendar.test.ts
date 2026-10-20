import {before,after,test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {PGlite} from "@electric-sql/pglite";
import {createClient} from "@supabase/supabase-js";
import {requireVibePartner} from "../lib/server/vibe";
import {calendarDays,calendarEventSchema,calendarMonthSchema,calendarTime,plansForDay,shiftMonth,type CalendarEvent} from "../lib/calendar";

const db=new PGlite(),alice="11111111-1111-4111-8111-111111111111",bob="22222222-2222-4222-8222-222222222222",charlie="33333333-3333-4333-8333-333333333333";
let coupleId:string;
const eventId="44444444-4444-4444-8444-444444444444";
const data={title:"Dinner together",category:"date",status:"planned",starts_on:"2026-10-20",ends_on:"2026-10-20",all_day:false,start_time:"19:00",end_time:"21:00",time_zone:"UTC",location:"Our favourite cafe",notes:"Bring the camera."};
async function role(name:string,user=""){await db.exec(`RESET ROLE; SET ROLE ${name}`);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);}
async function operation(actor:string,action:string,id=eventId,version:number|null=null,payload:unknown=data,pair=coupleId){await role("service_role");return (await db.query<{value:CalendarEvent}>("select public.qubit_calendar_operation($1,$2,$3,$4,$5,$6::jsonb) value",[actor,pair,action,id,version,JSON.stringify(payload)])).rows[0].value;}
before(async()=>{
  await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role; CREATE TABLE auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}'); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; CREATE PUBLICATION supabase_realtime;");
  await db.query("insert into auth.users(id) values($1),($2),($3)",[alice,bob,charlie]);await db.exec(await fs.readFile("supabase/bootstrap.sql","utf8"));
  for(const name of (await fs.readdir("supabase/migrations")).filter(name=>name.endsWith(".sql")).sort())await db.exec(await fs.readFile(`supabase/migrations/${name}`,"utf8"));
  await role("authenticated",alice);const pair=(await db.query<{value:{id:string;couple_code:string}}>("select public.ensure_couple() value")).rows[0].value;coupleId=pair.id;
  await role("authenticated",bob);assert.equal((await db.query<{value:{success:boolean}}>("select public.join_couple_by_code($1) value",[pair.couple_code])).rows[0].value.success,true);
});
after(async()=>{await db.close();});
test("calendar values validate dates, time ranges, time zones, multi-day plans and leap years",()=>{
  assert.ok(calendarEventSchema.safeParse(data).success);
  for(const change of [{starts_on:"2026-02-30"},{starts_on:"2026-02-29"},{ends_on:"2026-10-19"},{end_time:"18:00"},{start_time:"24:00"},{time_zone:"Invalid/Zone"},{title:" "},{notes:"a".repeat(4001)},{all_day:true}])assert.equal(calendarEventSchema.safeParse({...data,...change}).success,false,JSON.stringify(change).slice(0,90));
  assert.ok(calendarEventSchema.safeParse({...data,starts_on:"2028-02-29",ends_on:"2028-03-01"}).success);
  assert.ok(calendarEventSchema.safeParse({...data,all_day:true,start_time:null,end_time:null}).success);
  assert.ok(calendarEventSchema.safeParse({...data,start_time:"23:00",end_time:"01:00",ends_on:"2026-10-21"}).success);
  assert.equal(calendarMonthSchema.safeParse("2026-13").success,false);assert.equal(calendarMonthSchema.safeParse("1999-12").success,false);
  assert.equal(calendarDays("2026-10").length,42);assert.equal(new Date(`${calendarDays("2026-10")[0]}T12:00:00Z`).getUTCDay(),1);assert.equal(shiftMonth("2026-12",1),"2027-01");
  assert.equal(calendarTime(calendarEventSchema.parse(data)),"7:00 PM – 9:00 PM");
  assert.equal(plansForDay([{...data,ends_on:"2026-10-23"} as CalendarEvent],"2026-10-22").length,1);
});
test("connected partners share plans; anonymous users, outsiders and direct browser writes are denied",async()=>{
  const created=await operation(alice,"create");assert.equal(created.creator_id,alice);assert.equal(created.version,1);
  for(const user of [alice,bob]){await role("authenticated",user);assert.equal((await db.query("select id from public.couple_calendar_events")).rows.length,1);}
  await assert.rejects(db.query("update public.couple_calendar_events set title='Forged'"));await assert.rejects(db.query("delete from public.couple_calendar_events"));await assert.rejects(db.query("insert into public.couple_calendar_events(id) values(gen_random_uuid())"));
  await assert.rejects(db.query("select public.qubit_calendar_operation($1,$2,'delete',$3,1,'{}')",[alice,coupleId,eventId]));
  await role("authenticated",charlie);assert.equal((await db.query("select id from public.couple_calendar_events")).rows.length,0);
  await role("anon");await assert.rejects(db.query("select * from public.couple_calendar_events"));
  await assert.rejects(operation(charlie,"update",eventId,1));
});
test("either partner can update, retries do not duplicate plans, and stale edits cannot overwrite newer changes",async()=>{
  const updated=await operation(bob,"update",eventId,1,{...data,title:"Dinner and a movie"});assert.equal(updated.version,2);assert.equal(updated.creator_id,alice);assert.equal(updated.updated_by,bob);
  await assert.rejects(operation(alice,"update",eventId,1,{...data,title:"An old draft"}));
  const retried=await operation(alice,"create");assert.equal(retried.id,eventId);assert.equal(retried.title,"Dinner and a movie");
  await assert.rejects(operation(bob,"create"));await assert.rejects(operation(alice,"update",eventId,2,{...data,time_zone:"Invalid/Zone"}));
  await role("authenticated",bob);assert.equal((await db.query<{title:string}>("select title from public.couple_calendar_events where id=$1",[eventId])).rows[0].title,"Dinner and a movie");
});
test("database constraints reject invalid time ranges, and either partner can remove a plan with the current version",async()=>{
  const other="55555555-5555-4555-8555-555555555555";
  await assert.rejects(operation(alice,"create",other,null,{...data,end_time:"18:00"}));await assert.rejects(operation(alice,"create",other,null,{...data,title:"x".repeat(121)}));
  await operation(bob,"create",other,null,{...data,all_day:true,start_time:null,end_time:null,ends_on:"2026-10-23"});
  await assert.rejects(operation(alice,"delete",other,2));await operation(alice,"delete",other,1);
  await role("service_role");assert.equal((await db.query("select id from public.couple_calendar_events where id=$1",[other])).rows.length,0);
});
test("plan requests notify only the other partner, forbid self-confirmation and accept the current version once",async()=>{
  const id="77777777-7777-4777-8777-777777777777";
  const created=await operation(alice,"create",id,null,{...data,status:"confirmed"});
  assert.equal(created.status,"planned");assert.equal(created.confirmation_status,"pending");assert.equal(created.requested_by,alice);assert.equal(created.responded_by,null);
  await operation(alice,"create",id);
  await role("authenticated",bob);let notes=(await db.query<{kind:string;href:string;message:string}>("select kind,href,message from public.store_notifications where calendar_event_id=$1",[id])).rows;
  assert.equal(notes.length,1);assert.equal(notes[0].kind,"calendar_request");assert.ok(notes[0].href.includes(`event=${id}`));assert.ok(!notes[0].message.includes(data.title));
  await role("authenticated",alice);assert.equal((await db.query("select id from public.store_notifications where calendar_event_id=$1",[id])).rows.length,0);
  await role("authenticated",charlie);assert.equal((await db.query("select id from public.store_notifications where calendar_event_id=$1",[id])).rows.length,0);
  await assert.rejects(operation(alice,"accept",id,1));await assert.rejects(operation(alice,"decline",id,1));await assert.rejects(operation(charlie,"accept",id,1));
  await assert.rejects(operation(alice,"update",id,1,{...data,status:"confirmed"}));await assert.rejects(operation(alice,"update",id,1,{...data,status:"completed"}));
  const accepted=await operation(bob,"accept",id,1);assert.equal(accepted.status,"confirmed");assert.equal(accepted.confirmation_status,"accepted");assert.equal(accepted.responded_by,bob);assert.ok(accepted.responded_at);assert.equal(accepted.version,2);
  await assert.rejects(operation(bob,"accept",id,1));await assert.rejects(operation(bob,"decline",id,2));
  await role("authenticated",alice);notes=(await db.query<{kind:string;href:string;message:string}>("select kind,href,message from public.store_notifications where calendar_event_id=$1",[id])).rows;assert.equal(notes.length,1);assert.equal(notes[0].kind,"calendar_response");
  await role("authenticated",bob);assert.equal((await db.query("select id from public.store_notifications where calendar_event_id=$1 and read_at is null",[id])).rows.length,0);
});

test("edited details request fresh consent, switch the recipient when the other partner edits, and support declining and cancellation",async()=>{
  const id="77777777-7777-4777-8777-777777777777";
  const revised={...data,location:"The garden",status:"confirmed"};
  let event=await operation(alice,"update",id,2,revised);assert.equal(event.status,"planned");assert.equal(event.confirmation_status,"pending");assert.equal(event.responded_by,null);assert.equal(event.version,3);
  await assert.rejects(operation(bob,"accept",id,2));await assert.rejects(operation(alice,"accept",id,3));
  event=await operation(bob,"update",id,3,{...revised,start_time:"18:00",status:"planned"});assert.equal(event.requested_by,bob);assert.equal(event.version,4);
  await assert.rejects(operation(bob,"accept",id,4));event=await operation(alice,"decline",id,4);assert.equal(event.confirmation_status,"declined");assert.equal(event.responded_by,alice);assert.equal(event.status,"planned");
  event=await operation(bob,"update",id,5,{...revised,start_time:"18:00",status:"planned"});assert.equal(event.confirmation_status,"pending");assert.equal(event.version,6);
  event=await operation(bob,"update",id,6,{...revised,start_time:"18:00",status:"cancelled"});assert.equal(event.status,"cancelled");await assert.rejects(operation(alice,"accept",id,7));
  await role("authenticated",alice);assert.equal((await db.query("select id from public.store_notifications where calendar_event_id=$1 and kind='calendar_request' and read_at is null",[id])).rows.length,0);
  event=await operation(bob,"update",id,7,{...revised,start_time:"18:00",status:"planned"});assert.equal(event.confirmation_status,"pending");assert.equal(event.requested_by,bob);
  event=await operation(alice,"accept",id,8);assert.equal(event.status,"confirmed");
  event=await operation(bob,"update",id,9,{...revised,start_time:"18:00",status:"completed"});assert.equal(event.status,"completed");assert.equal(event.confirmation_status,"accepted");
});

test("removed requests delete their notifications",async()=>{
  const id="88888888-8888-4888-8888-888888888888";await operation(alice,"create",id);await operation(bob,"delete",id,1);
  await role("service_role");assert.equal((await db.query("select id from public.store_notifications where calendar_event_id=$1",[id])).rows.length,0);
});

test("vibe connection checks read current pair membership under authenticated RLS",async()=>{
  let actor=alice;
  const client=createClient("https://vibe-rls.invalid","fixture-key",{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input,init)=>{
    const request=new Request(input,init),url=new URL(request.url);assert.equal(request.method,"GET");assert.equal(url.pathname,"/rest/v1/couples");assert.equal(url.searchParams.get("id"),`eq.${coupleId}`);
    await role("authenticated",actor);const rows=(await db.query("select id,partner_1_id,partner_2_id from public.couples where id=$1",[coupleId])).rows;
    return new Response(JSON.stringify(rows[0]||null),{headers:{"Content-Type":"application/json"}});
  }}});
  for(const member of [alice,bob]){actor=member;assert.equal((await requireVibePartner(client,coupleId,actor)).id,coupleId);}
  actor=charlie;await assert.rejects(requireVibePartner(client,coupleId,actor),{status:403});
  await role("service_role");await db.query("update public.couples set partner_2_id=null where id=$1",[coupleId]);actor=alice;await assert.rejects(requireVibePartner(client,coupleId,actor),{status:403});
  await role("service_role");await db.query("update public.couples set partner_2_id=$1 where id=$2",[bob,coupleId]);
});

test("changing a partner never exposes old plans or notifications, and disconnecting deletes the former calendar",async()=>{
  await role("service_role");await db.query("update public.couples set partner_2_id=$1 where id=$2",[charlie,coupleId]);
  for(const user of [alice,bob,charlie]){await role("authenticated",user);assert.equal((await db.query("select id from public.couple_calendar_events")).rows.length,0);assert.equal((await db.query("select id from public.store_notifications where calendar_couple_id=$1",[coupleId])).rows.length,0);}
  await assert.rejects(operation(alice,"update",eventId,2));await assert.rejects(operation(bob,"create","66666666-6666-4666-8666-666666666666"));
  await operation(charlie,"create","66666666-6666-4666-8666-666666666666");
  await role("authenticated",alice);const disconnected=(await db.query<{value:{success:boolean}}>("select public.disconnect_couple() value")).rows[0].value;assert.equal(disconnected.success,true);
  await role("service_role");assert.equal((await db.query("select id from public.couple_calendar_events where couple_id=$1",[coupleId])).rows.length,0);
  assert.equal((await db.query("select id from public.store_notifications where calendar_couple_id=$1",[coupleId])).rows.length,0);
});
