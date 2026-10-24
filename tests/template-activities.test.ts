import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { PRODUCTS } from "../lib/storefront";
import { publicActivityTools, questionAnswered } from "../lib/template-activities";
import { pollToolSchema, questionItemSchema } from "../lib/security/validation";
const db = new PGlite();
const owner="aaaaaaaa-2222-4222-8222-222222222222", stranger="bbbbbbbb-3333-4333-8333-333333333333", pair="cccccccc-4444-4444-8444-444444444444", solo="dddddddd-5555-5555-8555-555555555555";
const hash="a".repeat(64), receiver="b".repeat(64), other="c".repeat(64);
const poll={id:"poll_t04",type:"poll",enabled:true,question:"Our next outing?",selectionMode:"both_vote",allowMultiple:true,allowCustomSuggestion:true,options:[{id:"park",text:"Park"},{id:"cafe",text:"Cafe"}]};
const question={id:"question_t05",type:"question",enabled:true,title:"A few thoughts",questions:[{id:"memory",prompt:"Favourite memory?",type:"long",skippable:false,sender_answer:"Private sender answer",reveal_mode:"after_partner_answers"},{id:"drink",prompt:"Tea or coffee?",type:"choice",options:["Tea","Coffee"],skippable:false},{id:"optional",prompt:"Anything else?",type:"short",skippable:true}]};
const secret={id:"reveal_t06",type:"private_reveal",enabled:true,prompt:"A shared future",questions:[{id:"place",prompt:"Where?"},{id:"wish",prompt:"A wish?"}]};
async function insert(code: string, theme: string) { await db.query(`INSERT INTO public.couple_templates(short_code,theme,scene_index,partner_name,partner_from,message,has_media,media_items,expires_at,owner_id,deletion_hash,tools) VALUES($1,$2,0,'Sam','Alex','Hello',false,'[]',now()+interval '2 days',$3,$4,$5::jsonb)`,[code,theme,owner,hash,JSON.stringify([poll,question,secret])]); }
async function result(sql: string, params: unknown[]) { return (await db.query<{value: Record<string,unknown>}>(sql,params)).rows[0].value; }
before(async()=>{
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;CREATE TABLE auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;CREATE PUBLICATION supabase_realtime;`);
 await db.query('INSERT INTO auth.users(id) VALUES($1),($2)',[owner,stranger]);await db.exec(await fs.readFile('supabase/bootstrap.sql','utf8'));
 for(const migration of (await fs.readdir('supabase/migrations')).filter(name=>name.endsWith('.sql')).sort()){
  if(migration.includes('security_hardening')){await db.query("INSERT INTO public.couples(id,couple_code,partner_1_id,partner_2_id) VALUES($1,'LOVE-ACTPAIR',$2,$3)",[pair,owner,stranger]);await db.query("INSERT INTO public.time_capsules(id,couple_id,creator_id,title,unlock_date,letter,seal_mode) VALUES($1,$2,$3,'Fixture','2000-01-01',$4::jsonb,'solo')",[solo,pair,owner,'{}']);}
  if(migration.includes('poll_questions_secret_details')){await insert('legacyactivity','our-little-pink-day');await db.query(`INSERT INTO public.template_question_submissions(template_id,tool_id,author_role,author_token_hash,is_draft,answers) SELECT id,'question_t05','partner',$1,true,$2::jsonb FROM public.couple_templates WHERE short_code='legacyactivity'`,[receiver,JSON.stringify(JSON.stringify({memory:{question_id:'memory',answer_text:'Keep this draft',skipped:false}}))]);await db.query(`UPDATE public.template_private_reveals SET partner_draft=$1::jsonb WHERE template_id=(SELECT id FROM public.couple_templates WHERE short_code='legacyactivity')`,[JSON.stringify(JSON.stringify({place:'Keep this secret'}))]);}
  await db.exec(await fs.readFile('supabase/migrations/'+migration,'utf8'));
 }
});
after(()=>db.close());
test('legacy encoded drafts are repaired without losing their text and claimed by their actual receipt',async()=>{
 const q=await db.query<{answers:{memory:{answer_text:string}}}>(`SELECT answers FROM public.template_question_submissions WHERE template_id=(SELECT id FROM public.couple_templates WHERE short_code='legacyactivity')`);assert.equal(q.rows[0].answers.memory.answer_text,'Keep this draft');
 const r=await db.query<{partner_draft:{place:string}}>(`SELECT partner_draft FROM public.template_private_reveals WHERE template_id=(SELECT id FROM public.couple_templates WHERE short_code='legacyactivity')`);assert.equal(r.rows[0].partner_draft.place,'Keep this secret');
 const hidden=await result(`SELECT public.bonded_get_template_questions('legacyactivity',NULL,$1,NULL) AS value`,[other]);assert.equal(hidden.my_draft,null);
});
test('all six themes keep complete poll, Q&A, and synchronized secret details with private drafts',async()=>{
 for(const [index,product] of PRODUCTS.entries()){
  const code='activityfixture'+index;await insert(code,product.slug);
  const vote=(ids:string[],creator=false,suggestion:string|null=null)=>result(`SELECT public.bonded_vote_template_poll($1,1,$2::jsonb,$3,NULL,$4,$5::uuid,$6) AS value`,[code,JSON.stringify(ids),creator,receiver,creator?owner:null,suggestion]);
  await vote(['park'],true);let p=await vote(['park','cafe','park']);assert.equal(p.has_agreement,true);
  p=await vote(['cafe']);assert.equal(p.has_agreement,false);
  const state=await result(`SELECT public.bonded_get_template_poll($1,NULL,$2,NULL) AS value`,[code,receiver]);assert.equal((state.poll as {status:string}).status,'open');
  await assert.rejects(db.query(`SELECT public.bonded_resolve_poll_manually($1,'forged',NULL,$2::uuid)`,[code,owner]),/offered/);
  await vote([],false,'A museum');
  const choices=await result(`SELECT public.bonded_get_template_poll($1,NULL,$2,NULL) AS value`,[code,receiver]);assert.ok(JSON.stringify(choices).includes('A museum'));
  const answers={memory:{question_id:'memory',answer_text:'Our first trip',skipped:false},drink:{question_id:'drink',selected_choice:'Coffee',skipped:false},optional:{question_id:'optional',skipped:true}};
  await result(`SELECT public.bonded_save_question_draft($1,1,$2::jsonb,false,NULL,$3,NULL) AS value`,[code,JSON.stringify(answers),receiver]);
  const impostor=await result(`SELECT public.bonded_get_template_questions($1,NULL,$2,NULL) AS value`,[code,other]);assert.equal(impostor.my_draft,null);assert.ok(!JSON.stringify(impostor).includes('Our first trip'));
  await assert.rejects(db.query(`SELECT public.bonded_submit_question_answers($1,1,$2::jsonb,false,NULL,$3,NULL)`,[code,JSON.stringify({...answers,memory:{question_id:'memory',answer_text:' ',skipped:false}}),receiver]),/Write an answer/);
  await assert.rejects(db.query(`SELECT public.bonded_submit_question_answers($1,1,$2::jsonb,false,NULL,$3,NULL)`,[code,JSON.stringify({...answers,drink:{question_id:'drink',selected_choice:'Forged',skipped:false}}),receiver]),/offered/);
  await result(`SELECT public.bonded_submit_question_answers($1,1,$2::jsonb,false,NULL,$3,NULL) AS value`,[code,JSON.stringify(answers),receiver]);
  const unrelated=await result(`SELECT public.bonded_get_template_questions($1,NULL,$2,NULL) AS value`,[code,other]);assert.ok(!JSON.stringify(unrelated).includes('Private sender answer'));assert.equal(unrelated.my_submission,null);
  const q=await db.query<{answers:unknown;question_snapshot:unknown}>(`SELECT answers,question_snapshot FROM public.template_question_submissions WHERE template_id=(SELECT id FROM public.couple_templates WHERE short_code=$1) AND is_draft=false`,[code]);assert.deepEqual(q.rows[0].answers,answers);assert.ok(JSON.stringify(q.rows[0].question_snapshot).includes('Favourite memory?'));
  const secretAnswers={place:'Mountains',wish:'More time together'};
  await result(`SELECT public.bonded_save_reveal_draft($1,1,$2::jsonb,false,NULL,$3,NULL) AS value`,[code,JSON.stringify(secretAnswers),receiver]);
  const strangerSecret=await result(`SELECT public.bonded_get_template_reveal($1,NULL,$2,NULL) AS value`,[code,other]);assert.ok(!JSON.stringify(strangerSecret).includes('Mountains'));
  await result(`SELECT public.bonded_lock_reveal_answer($1,1,$2::jsonb,false,NULL,$3,NULL) AS value`,[code,JSON.stringify(secretAnswers),receiver]);
  await assert.rejects(db.query(`SELECT public.bonded_lock_reveal_answer($1,1,$2::jsonb,false,NULL,$3,NULL)`,[code,JSON.stringify(secretAnswers),receiver]),/Withdraw/);
  await result(`SELECT public.bonded_lock_reveal_answer($1,1,$2::jsonb,true,NULL,NULL,$3::uuid) AS value`,[code,JSON.stringify({place:'The sea',wish:'A home together'}),owner]);
  const eligible=await result(`SELECT public.bonded_get_template_reveal($1,NULL,$2,NULL) AS value`,[code,receiver]);assert.equal((eligible.reveal as {partner_answer:unknown}).partner_answer,null);
  await result(`SELECT public.bonded_confirm_reveal($1,1,false,NULL,$2,NULL) AS value`,[code,receiver]);
  const revealed=await result(`SELECT public.bonded_get_template_reveal($1,NULL,$2,NULL) AS value`,[code,receiver]);assert.equal((revealed.reveal as {partner_answer:{wish:string}}).partner_answer.wish,'A home together');
  await db.query(`UPDATE public.couple_templates SET expires_at=now()-interval '1 second' WHERE short_code=$1`,[code]);await assert.rejects(db.query(`SELECT public.bonded_resolve_poll_manually($1,'park',NULL,$2::uuid)`,[code,owner]),/unavailable/);
 }
});
test('activity functions and validators stay restricted to the server role',async()=>{
 const names=['public.bonded_get_template_questions(text,text,text,uuid)','public.bonded_confirm_reveal(text,integer,boolean,text,text,uuid)','private.qubit_validate_secret_answers(jsonb,jsonb,boolean)'];
 for(const signature of names){const row=await db.query<{anon:boolean;authenticated:boolean;server:boolean}>(`SELECT has_function_privilege('anon',$1,'EXECUTE') AS anon,has_function_privilege('authenticated',$1,'EXECUTE') AS authenticated,has_function_privilege('service_role',$1,'EXECUTE') AS server`,[signature]);assert.deepEqual(row.rows[0],{anon:false,authenticated:false,server:true});}
});
test('public tool payloads omit private sender answers and required questions need real content',()=>{
 assert.ok(!JSON.stringify(publicActivityTools([question])).includes('Private sender answer'));
 assert.equal(questionAnswered({id:'q',prompt:'Q',type:'short',skippable:false},{question_id:'q',answer_text:' ',skipped:false}),false);
 assert.equal(questionItemSchema.safeParse({id:'q',prompt:'Q',type:'choice'}).success,false);
 assert.equal(pollToolSchema.safeParse({...poll,options:[{id:'same',text:'A'},{id:'same',text:'B'}]}).success,false);
});
