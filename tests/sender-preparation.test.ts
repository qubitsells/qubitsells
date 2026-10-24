import {before,after,test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {PGlite} from "@electric-sql/pglite";
import {PRODUCTS} from "../lib/storefront";
import {senderPreparationError} from "../lib/sender-preparation";
import {publicActivityTools} from "../lib/template-activities";
import {pollToolSchema,revealToolSchema} from "../lib/security/validation";
import type {TemplateTool} from "../lib/supabase/coupleTemplates";
const db=new PGlite(),owner="aaaaaaaa-2222-4222-8222-222222222222",partner="bbbbbbbb-3333-4333-8333-333333333333",pair="cccccccc-4444-4444-8444-444444444444",solo="dddddddd-5555-5555-8555-555555555555",hash="a".repeat(64),receipt="b".repeat(64);
const poll={id:"poll_t04",type:"poll",enabled:true,question:"Where shall we go?",selectionMode:"both_vote",allowMultiple:false,allowCustomSuggestion:true,options:[{id:"park",text:"The park"},{id:"sea",text:"The sea"}],senderOptionIds:["sea"]};
const question={id:"question_t05",type:"question",enabled:true,title:"A few thoughts",questions:[{id:"memory",prompt:"A favourite memory?",type:"long",skippable:false,sender_answer:"Our first coffee",reveal_mode:"after_partner_answers"},{id:"drink",prompt:"Tea or coffee?",type:"choice",options:["Tea","Coffee"],skippable:true,sender_answer:"Coffee",reveal_mode:"hidden"}]};
const secret={id:"reveal_t06",type:"private_reveal",enabled:true,prompt:"A secret wish?",countdownSeconds:1,questions:[{id:"wish",prompt:"A wish for us?"},{id:"trip",prompt:"A dream trip?"}],senderAnswers:{wish:"A home together",trip:"Northern lights"}};
const tools=[poll,question,secret];
before(async()=>{await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;CREATE TABLE auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;CREATE PUBLICATION supabase_realtime;`);await db.query('INSERT INTO auth.users(id) VALUES($1),($2)',[owner,partner]);await db.exec(await fs.readFile('supabase/bootstrap.sql','utf8'));for(const file of(await fs.readdir('supabase/migrations')).filter(n=>n.endsWith('.sql')).sort()){if(file.includes('security_hardening')){await db.query("INSERT INTO public.couples(id,couple_code,partner_1_id,partner_2_id) VALUES($1,'LOVE-SENDERSET',$2,$3)",[pair,owner,partner]);await db.query("INSERT INTO public.time_capsules(id,couple_id,creator_id,title,unlock_date,letter,seal_mode) VALUES($1,$2,$3,'Fixture','2000-01-01',$4::jsonb,'solo')",[solo,pair,owner,'{}']);}await db.exec(await fs.readFile('supabase/migrations/'+file,'utf8'));}});
after(()=>db.close());
async function order(theme:string){return(await db.query<{id:string}>(`INSERT INTO public.store_orders(buyer_id,checkout_key,product_slug,product_name,duration_hours,amount_cents,status,paid_at) VALUES($1,gen_random_uuid(),$2,'Fixture',72,200,'paid',now()) RETURNING id`,[owner,theme])).rows[0].id;}
function payload(code:string,theme:string,input:unknown=tools){return{short_code:code,theme,scene_index:0,sender_gender:"male",partner_name:"Sam",partner_from:"Alex",message:"Hello",has_media:false,media_items:[],tools:input,expires_at:"2099-01-01"};}
async function publish(id:string,code:string,theme:string,input:unknown=tools){await db.exec('SET ROLE service_role');try{return await db.query(`SELECT public.qubit_publish_order($1,$2,NULL,$3,$4::jsonb,'{}'::uuid[])`,[id,owner,hash,JSON.stringify(payload(code,theme,input))]);}finally{await db.exec('RESET ROLE');}}
async function rpc(sql:string,args:unknown[]=[]){return(await db.query<{value:Record<string,unknown>}>(sql,args)).rows[0].value as any;} // eslint-disable-line @typescript-eslint/no-explicit-any
test('all six products publish sender choices, submitted Q&A and locked secrets atomically',async()=>{
 for(const[index,product]of PRODUCTS.entries()){
  const code='senderprepared'+index,id=await order(product.slug);await publish(id,code,product.slug);
  const saved=(await db.query<{tools:unknown}>(`SELECT tools FROM public.couple_templates WHERE short_code=$1`,[code])).rows[0].tools;
  assert.ok(!JSON.stringify(saved).includes('Northern lights'));assert.ok(!JSON.stringify(saved).includes('senderOptionIds'));const publiclyVisible=JSON.stringify(publicActivityTools(saved));assert.ok(!publiclyVisible.includes('Our first coffee'));
  const creatorPoll=await rpc(`SELECT public.bonded_get_template_poll($1,$2,NULL,$3::uuid) AS value`,[code,hash,owner]);assert.equal(creatorPoll.poll.sender_prepared,true);assert.deepEqual(creatorPoll.my_votes,['sea']);
  const anonymousPoll=await rpc(`SELECT public.bonded_get_template_poll($1) AS value`,[code]);assert.deepEqual(anonymousPoll.poll.creator_votes,[]);
  const creatorQuestions=await rpc(`SELECT public.bonded_get_template_questions($1,$2,NULL,$3::uuid) AS value`,[code,hash,owner]);assert.equal(creatorQuestions.my_submission.answers.memory.answer_text,'Our first coffee');assert.ok(creatorQuestions.my_submission.submitted_at);
  const anonymousQuestions=await rpc(`SELECT public.bonded_get_template_questions($1) AS value`,[code]);assert.ok(!JSON.stringify(anonymousQuestions).includes('Our first coffee'));
  const preReveal=await rpc(`SELECT public.bonded_get_template_reveal($1) AS value`,[code]);assert.equal(preReveal.reveal.sender_prepared,true);assert.equal(preReveal.reveal.creator_locked,true);assert.equal(preReveal.reveal.partner_answer,null);assert.equal(preReveal.reveal.my_answer,null);
  await rpc(`SELECT public.bonded_vote_template_poll($1,1,'["sea"]',false,NULL,$2,NULL,NULL) AS value`,[code,receipt]);const matched=await rpc(`SELECT public.bonded_get_template_poll($1,NULL,$2,NULL) AS value`,[code,receipt]);assert.equal(matched.poll.resolved_option_id,'sea');
  const answers={memory:{question_id:'memory',answer_text:'Our walk home',skipped:false},drink:{question_id:'drink',selected_choice:'Tea',skipped:false}};
  await rpc(`SELECT public.bonded_submit_question_answers($1,1,$2::jsonb,false,NULL,$3,NULL) AS value`,[code,JSON.stringify(answers),receipt]);const questions=await rpc(`SELECT public.bonded_get_template_questions($1,NULL,$2,NULL) AS value`,[code,receipt]);assert.equal(questions.partner_submission.answers.memory.answer_text,'Our first coffee');assert.equal(questions.partner_submission.answers.drink,undefined);
  const theirSecret={wish:'A garden',trip:'Japan'};await rpc(`SELECT public.bonded_lock_reveal_answer($1,1,$2::jsonb,false,NULL,$3,NULL) AS value`,[code,JSON.stringify(theirSecret),receipt]);const locked=await rpc(`SELECT public.bonded_get_template_reveal($1,NULL,$2,NULL) AS value`,[code,receipt]);assert.equal(locked.reveal.is_eligible,true);assert.equal(locked.reveal.partner_answer,null);
  await rpc(`SELECT public.bonded_confirm_reveal($1,1,false,NULL,$2,NULL) AS value`,[code,receipt]);const opened=await rpc(`SELECT public.bonded_get_template_reveal($1,NULL,$2,NULL) AS value`,[code,receipt]);assert.equal(opened.reveal.partner_answer.trip,'Northern lights');
  await assert.rejects(db.query(`SELECT public.bonded_withdraw_reveal_answer($1,1,true,$2,NULL,$3::uuid)`,[code,hash,owner]),/setup/);await assert.rejects(db.query(`SELECT public.bonded_vote_template_poll($1,1,'["park"]',true,$2,NULL,$3::uuid,NULL)`,[code,hash,owner]),/setup/);
  const fulfilled=(await db.query<{fulfilled_at:string}>(`SELECT fulfilled_at FROM public.store_orders WHERE id=$1`,[id])).rows[0];assert.ok(fulfilled.fulfilled_at);
 }
});
test('missing or invalid sender responses leave the paid order unused and publish no gift',async()=>{
 const theme='our-little-pink-day',id=await order(theme);
 for(const[index,input]of [[{...poll,senderOptionIds:[]},question,secret],[poll,{...question,questions:[{...question.questions[0],sender_answer:''}]},secret],[poll,question,{...secret,senderAnswers:{wish:'Incomplete'}}],[{...poll,senderOptionIds:['not-offered']},question,secret]].entries()){
  const code='invalidsender'+index;await assert.rejects(publish(id,code,theme,input));assert.equal((await db.query(`SELECT id FROM public.couple_templates WHERE short_code=$1`,[code])).rows.length,0);assert.equal((await db.query<{fulfilled_at:null}>(`SELECT fulfilled_at FROM public.store_orders WHERE id=$1`,[id])).rows[0].fulfilled_at,null);
 }
 await publish(id,'senderretry',theme);await assert.rejects(publish(id,'duplicatepublish',theme));
});
test('publish validation requires sender input while legacy tool parsing remains compatible',()=>{
 assert.equal(senderPreparationError(tools as TemplateTool[]),'');assert.match(senderPreparationError([{...poll,senderOptionIds:[]} as TemplateTool]),/own answer/);assert.equal(senderPreparationError([{...poll,selectionMode:'partner_chooses',senderOptionIds:[]} as TemplateTool]),'');assert.match(senderPreparationError([{...secret,senderAnswers:{}} as TemplateTool]),/private answer/);assert.equal(senderPreparationError([{...secret,enabled:false} as TemplateTool]),'');assert.equal(pollToolSchema.safeParse({...poll,senderOptionIds:undefined}).success,true);assert.equal(revealToolSchema.safeParse({...secret,senderAnswers:undefined}).success,true);
});
