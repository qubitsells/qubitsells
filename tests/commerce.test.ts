import {before, after, test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {PGlite} from "@electric-sql/pglite";
const db = new PGlite();
const buyer="11111111-1111-4111-8111-111111111111", stranger="22222222-2222-4222-8222-222222222222", order="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
async function role(name:string,id=buyer) {await db.exec(`RESET ROLE; SET ROLE ${name}`);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);}
before(async()=>{
  await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role; CREATE TABLE auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}'); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; CREATE PUBLICATION supabase_realtime;");
  await db.query("insert into auth.users(id) values($1),($2)",[buyer,stranger]);
  await db.exec(await fs.readFile("supabase/bootstrap.sql","utf8"));
  for(const name of (await fs.readdir("supabase/migrations")).filter(name=>name.endsWith(".sql")).sort()) await db.exec(await fs.readFile("supabase/migrations/"+name,"utf8"));
  await role("service_role");
  await db.query("insert into public.store_orders(id,buyer_id,checkout_key,product_slug,product_name,duration_hours,amount_cents) values($1,$2,gen_random_uuid(),'halloween-pumpkin-moon','Pumpkin Moon Date',72,200)",[order,buyer]);
});
after(async()=>{await db.close();});
test("customers can read only their own shopping data and cannot forge a paid order, review, or notification",async()=>{
  await role("authenticated");assert.equal((await db.query("select id from public.store_orders")).rows.length,1);
  await assert.rejects(db.query("update public.store_orders set status='paid' where id=$1",[order]));
  await assert.rejects(db.query("select public.qubit_save_review($1,$2,'Name',5,'Nice template','A sufficiently long review.')",[buyer,order]));
  await role("authenticated",stranger);assert.equal((await db.query("select id from public.store_orders")).rows.length,0);
  await role("anon");await assert.rejects(db.query("select * from public.store_orders"));await assert.rejects(db.query("select * from public.store_reviews"));
});
test("reviews require a real paid order, remain one per buyer/product/mode, and exclude refunded purchases",async()=>{
  await role("service_role");
  const save=()=>db.query("select public.qubit_save_review($1,$2,'Taylor',5,'A lovely template','A beautiful way to send a personal message.')",[buyer,order]);
  await assert.rejects(save());
  await db.query("update public.store_orders set status='paid',paid_at=now()-interval '2 days' where id=$1",[order]);
  await db.query("select public.qubit_review_reminders($1)",[buyer]);await db.query("select public.qubit_review_reminders($1)",[buyer]);
  assert.equal((await db.query("select id from public.store_notifications where kind='review_request'")).rows.length,1);
  await save();await save();assert.equal((await db.query("select id from public.store_reviews")).rows.length,1);
  const result=await db.query<{value:{count:number;reviews:Record<string,unknown>[]}}>("select public.qubit_product_reviews('halloween-pumpkin-moon','test',0) value");
  assert.equal(result.rows[0].value.count,1);assert.equal(result.rows[0].value.reviews[0].buyer_id,undefined);assert.equal(result.rows[0].value.reviews[0].order_id,undefined);
  assert.equal((await db.query<{value:{count:number}}>("select public.qubit_product_reviews('halloween-pumpkin-moon','live',0) value")).rows[0].value.count,0);
  await db.query("update public.store_orders set status='refunded' where id=$1",[order]);await assert.rejects(save());
  assert.equal((await db.query<{value:{count:number}}>("select public.qubit_product_reviews('halloween-pumpkin-moon','test',0) value")).rows[0].value.count,0);
});
test("one paid order publishes one correct product with server-controlled duration, never grants a second link",async()=>{
  await role("service_role");await db.query("update public.store_orders set status='paid' where id=$1",[order]);
  const payload={short_code:"paid-link",theme:"halloween-pumpkin-moon",scene_index:0,partner_name:"Sam",partner_from:"Alex",message:"A personal memory",sender_gender:"male",expires_at:"2099-01-01",media_items:[],tools:[]};
  const publish=(actor:string,data:unknown)=>db.query<{value:{short_code:string;expires_at:string}}>("select public.qubit_publish_order($1,$2,NULL,'hash',$3::jsonb,'{}'::uuid[]) value",[order,actor,JSON.stringify(data)]);
  await assert.rejects(publish(stranger,payload));await assert.rejects(publish(buyer,{...payload,theme:"starlit-story"}));
  const result=(await publish(buyer,payload)).rows[0].value;assert.equal(result.short_code,"paid-link");assert.ok(Math.abs(Date.parse(result.expires_at)-Date.now()-72*3600000)<60000);
  await assert.rejects(publish(buyer,{...payload,short_code:"second-link"}));
  await db.query("insert into public.template_replies(template_id,author_name,message) select id,'Sam','PRIVATE REPLY' from public.couple_templates where short_code='paid-link'");
  const notifications=await db.query<{title:string;message:string;href:string}>("select title,message,href from public.store_notifications where kind='template_response'");
  assert.equal(notifications.rows.length,1);assert.ok(!JSON.stringify(notifications.rows).includes("PRIVATE REPLY"));
  await db.query("delete from public.couple_templates where short_code='paid-link'");await assert.rejects(publish(buyer,{...payload,short_code:"third-link"}));
});
test("private receiver drafts never generate notifications; submitted answers notify only the template owner",async()=>{
  await role("service_role");
  const template={short_code:"draft-notification",theme:"starlit-story",scene_index:0,partner_name:"Sam",partner_from:"Alex",message:"A test",sender_gender:"male",expires_at:new Date(Date.now()+86400000).toISOString(),media_items:[],tools:[]};
  await db.query("select public.bonded_create_template($1,NULL,'hash',$2::jsonb,'{}'::uuid[])",[buyer,JSON.stringify(template)]);
  const before=(await db.query("select id from public.store_notifications where kind='template_response'")).rows.length;
  await db.query("insert into public.template_question_submissions(template_id,author_role,is_draft,answers) select id,'partner',true,'{\"answer\":\"DO NOT LEAK THIS DRAFT\"}'::jsonb from public.couple_templates where short_code='draft-notification'");
  assert.equal((await db.query("select id from public.store_notifications where kind='template_response'")).rows.length,before);
  await db.query("update public.template_question_submissions set is_draft=false,submitted_at=now() where template_id=(select id from public.couple_templates where short_code='draft-notification')");
  const all=await db.query("select * from public.store_notifications where kind='template_response'");assert.equal(all.rows.length,before+1);assert.ok(!JSON.stringify(all.rows).includes("DO NOT LEAK"));
  await role("authenticated",stranger);assert.equal((await db.query("select * from public.store_notifications")).rows.length,0);
  await role("authenticated",buyer);assert.ok((await db.query("select * from public.store_notifications")).rows.length>0);
});
