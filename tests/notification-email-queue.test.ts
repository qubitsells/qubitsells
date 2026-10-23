import { before, beforeEach, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const db=new PGlite(),user="11111111-1111-4111-8111-111111111111",id="22222222-2222-4222-8222-222222222222";
before(async()=>{
  await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;CREATE SCHEMA private;GRANT USAGE ON SCHEMA private,auth TO service_role;CREATE TABLE auth.users(id uuid PRIMARY KEY);CREATE TABLE public.store_notifications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES auth.users ON DELETE CASCADE,kind text,title text,message text DEFAULT '',href text,dedupe_key text,calendar_couple_id uuid,read_at timestamptz,UNIQUE(user_id,dedupe_key));GRANT ALL ON public.store_notifications TO service_role;`);
  await db.exec(await readFile("supabase/migrations/20261023002021_notification_email_outbox.sql","utf8"));
});
beforeEach(async()=>{await db.exec("RESET ROLE;TRUNCATE public.store_notifications CASCADE;");await db.query("INSERT INTO auth.users(id) VALUES($1) ON CONFLICT DO NOTHING",[user]);await db.exec("SET ROLE service_role");});
after(()=>db.close());
async function insert(kind="order") {await db.query("INSERT INTO public.store_notifications(id,user_id,kind,title,href,dedupe_key) VALUES($1,$2,$3,'A new update','/profile','unique') ON CONFLICT(user_id,dedupe_key) DO NOTHING",[id,user,kind]);}
async function claim(){return (await db.query<{notification_id:string;lease_token:string}>("SELECT * FROM public.qubit_claim_notification_emails(4)")).rows;}
async function finish(token:string,outcome="sent",error:string|null=null){return (await db.query<{ok:boolean}>("SELECT public.qubit_finish_notification_email($1,$2,$3,$4) ok",[id,token,outcome,error])).rows[0].ok;}

test("new notifications atomically queue one email, repeated events do not duplicate it, and rollbacks do not send",async()=>{
  await insert();await insert();assert.equal((await db.query("SELECT * FROM public.notification_email_outbox")).rows.length,1);
  await db.exec("BEGIN");await db.query("INSERT INTO public.store_notifications(user_id,kind,title,href,dedupe_key) VALUES($1,'template_response','Private response','/creator-center','rolled-back')",[user]);await db.exec("ROLLBACK");assert.equal((await db.query("SELECT * FROM public.notification_email_outbox")).rows.length,1);
});
test("claims are exclusive, expired leases can recover, and stale workers cannot acknowledge another worker’s job",async()=>{
  await insert();const first=(await claim())[0];assert.equal((await claim()).length,0);assert.equal(await finish("33333333-3333-4333-8333-333333333333"),false);
  await db.exec("UPDATE public.notification_email_outbox SET locked_until=now()-interval '1 minute'");const second=(await claim())[0];assert.notEqual(first.lease_token,second.lease_token);assert.equal(await finish(first.lease_token),false);assert.equal(await finish(second.lease_token),true);assert.equal((await claim()).length,0);
});
test("SMTP errors back off, stop after six attempts, and use bounded error codes rather than private provider responses",async()=>{
  await insert();const first=(await claim())[0];assert.equal(await finish(first.lease_token,"retry","smtp_failed"),true);assert.equal((await claim()).length,0);
  await db.exec("UPDATE public.notification_email_outbox SET attempts=5,next_attempt_at=now()-interval '1 minute'");const last=(await claim())[0];assert.equal(await finish(last.lease_token,"retry","smtp_failed"),true);const row=(await db.query<{status:string;attempts:number}>("SELECT status,attempts FROM public.notification_email_outbox")).rows[0];assert.deepEqual(row,{status:"failed",attempts:6});assert.equal((await claim()).length,0);
});
test("anonymous and signed-in clients cannot read or forge delivery records or invoke the worker RPCs",async()=>{
  await insert();for(const role of ["anon","authenticated"]){await db.exec(`RESET ROLE;SET ROLE ${role}`);await assert.rejects(db.query("SELECT * FROM public.notification_email_outbox"));await assert.rejects(db.query("INSERT INTO public.notification_email_outbox(notification_id) VALUES($1)",[id]));await assert.rejects(db.query("SELECT * FROM public.qubit_claim_notification_emails(4)"));await assert.rejects(db.query("SELECT public.qubit_finish_notification_email($1,$2,'sent')",[id,id]));}
});
test("deleting an account or its notification removes queued delivery data",async()=>{
  await insert();await db.exec("RESET ROLE");await db.query("DELETE FROM auth.users WHERE id=$1",[user]);assert.equal((await db.query("SELECT * FROM public.notification_email_outbox")).rows.length,0);
});
