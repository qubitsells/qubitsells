import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { PRODUCTS } from "../lib/storefront";
import { submitPartnerSideSchema, ourStoryToolSchema, bucketListToolSchema } from "../lib/security/validation";
import type { TemplateOurStory, TemplateBucketList } from "../lib/supabase/coupleTemplates";
const db=new PGlite(),owner="aaaaaaaa-2222-4222-8222-222222222222",partner="bbbbbbbb-3333-4333-8333-333333333333",pair="cccccccc-4444-4444-8444-444444444444",solo="dddddddd-5555-5555-8555-555555555555",hash="a".repeat(64),receipt="b".repeat(64);
const cards=[0,1,2].map(order=>({id:`moment${order}`,photo_url:`https://example.com/${order}.jpg`,caption:`Our memory ${order}`,order}));
const story={id:"our_story_t10",type:"our_story",enabled:true,title:"Our story",cards};
const bucket={id:"bucket_list_t11",type:"bucket_list",enabled:true,title:"Our little list",items:[{id:"sea",title:"See the sea",note:"A slow weekend",status:"wished",created_by:"creator"}]};
type Result={success:boolean;is_creator?:boolean;is_partner?:boolean;story?:TemplateOurStory|null;bucket_list?:TemplateBucketList|null;partner_contribution?:TemplateOurStory["partner_contribution"];items?:TemplateBucketList["items"];revision?:number};
async function rpc(sql:string,args:unknown[]=[]){return(await db.query<{value:Result}>(sql,args)).rows[0].value;}
async function insert(code:string,theme:string){await db.query(`INSERT INTO public.couple_templates(short_code,theme,scene_index,partner_name,partner_from,message,has_media,media_items,expires_at,owner_id,deletion_hash,tools) VALUES($1,$2,0,'Sam','Alex','Hello',false,'[]',now()+interval '2 days',$3,$4,$5::jsonb)`,[code,theme,owner,hash,JSON.stringify([story,bucket])]);}
async function mutate(code:string,action:string,id:string|null,payload:unknown={}){return rpc(`SELECT public.bonded_mutate_template_bucket_list($1,$2,$3,$4::jsonb,$5,NULL,$6::uuid,'guest') AS value`,[code,action,id,JSON.stringify(payload),receipt,partner]);}
before(async()=>{await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;CREATE TABLE auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;CREATE PUBLICATION supabase_realtime;`);await db.query('INSERT INTO auth.users(id) VALUES($1),($2)',[owner,partner]);await db.exec(await fs.readFile('supabase/bootstrap.sql','utf8'));for(const file of(await fs.readdir('supabase/migrations')).filter(n=>n.endsWith('.sql')).sort()){if(file.includes('security_hardening')){await db.query("INSERT INTO public.couples(id,couple_code,partner_1_id,partner_2_id) VALUES($1,'LOVE-STORYBUC',$2,$3)",[pair,owner,partner]);await db.query("INSERT INTO public.time_capsules(id,couple_id,creator_id,title,unlock_date,letter,seal_mode) VALUES($1,$2,$3,'Fixture','2000-01-01',$4::jsonb,'solo')",[solo,pair,owner,'{}']);}await db.exec(await fs.readFile('supabase/migrations/'+file,'utf8'));}});
after(()=>db.close());
test('all six templates preserve story authorship and complete bucket-list details and history',async()=>{
 for(const[index,product]of PRODUCTS.entries()){
  const code='storybucket'+index;await insert(code,product.slug);
  await db.exec("SET TIME ZONE 'Asia/Karachi'");
  const contribution=await rpc(`SELECT public.bonded_submit_our_story_partner_side($1,'Sammy','Our own side','https://example.com/memory.jpg','October 2026',NULL,$2,$3::uuid,'guest') AS value`,[code,receipt,partner]);
  assert.equal(contribution.partner_contribution?.author_name,'Sammy');assert.equal(contribution.partner_contribution?.date,'October 2026');
  const time=await db.query<{correct:boolean}>(`SELECT abs(extract(epoch FROM (now()-$1::timestamptz)))<2 AS correct`,[contribution.partner_contribution?.created_at]);assert.equal(time.rows[0].correct,true);await db.exec("SET TIME ZONE 'UTC'");
  await assert.rejects(db.query(`SELECT public.bonded_submit_our_story_partner_side($1,'Stranger','Overwrite','https://example.com/other.jpg',NULL,NULL,'other',NULL,'other')`,[code]),/another contributor/);
  const state=await rpc(`SELECT public.bonded_get_template_our_story($1,NULL,$2,$3::uuid) AS value`,[code,receipt,partner]);assert.equal(state.is_partner,true);assert.ok(!JSON.stringify(state.story).includes('partner_token_hash'));assert.ok(!JSON.stringify(state.story).includes('actor_id'));
  await assert.rejects(mutate(code,'attach_memory','sea',{memory_note:'Too early'}),/Complete this idea/);
  await mutate(code,'toggle_interest','sea',{interested:true});const interest=await mutate(code,'toggle_interest','sea',{interested:true});assert.equal(interest.items?.[0].history?.length,1);
  await mutate(code,'plan_item','sea');const complete=await mutate(code,'complete_item','sea');const completedAt=complete.items?.[0].completed_at;
  const retry=await mutate(code,'complete_item','sea');assert.equal(retry.items?.[0].completed_at,completedAt);assert.equal(retry.items?.[0].history?.length,complete.items?.[0].history?.length);
  await mutate(code,'attach_memory','sea',{memory_note:'Waves at sunrise',memory_photo_url:'https://example.com/sea.jpg'});const changed=await mutate(code,'attach_memory','sea',{memory_note:'Sand in our shoes'});const item=changed.items![0];assert.equal(item.memory_by,'partner');assert.ok(item.memory_saved_at);assert.equal(item.memory_photo_url,'https://example.com/sea.jpg');assert.ok(item.history?.some(event=>event.note==='Waves at sunrise'));assert.equal(item.history?.at(-1)?.note,'Sand in our shoes');
  await assert.rejects(mutate(code,'add_item','sea',{title:'Duplicate'}),/unique ID/);await assert.rejects(mutate(code,'revert_status','sea',{status:'madeup'}),/dreaming or planning/);
  await assert.rejects(mutate(code,'add_item',null,{title:'Stale',expected_revision:1}),/list changed/);
  const reverted=await mutate(code,'revert_status','sea',{status:'planning'});assert.equal(reverted.items?.[0].completed_at,null);assert.ok(reverted.items?.[0].history?.some(event=>event.status==='completed'));assert.equal(reverted.items?.[0].memory_note,'Sand in our shoes');
  const added=await mutate(code,'add_item',null,{title:'A night train',note:'By the window'});assert.equal(added.items?.at(-1)?.created_by,'partner');assert.equal(added.items?.at(-1)?.history?.[0].note,'By the window');
  await db.query(`UPDATE public.couple_templates SET tools=jsonb_set(jsonb_set(tools,'{0,enabled}','false'),'{1,enabled}','false') WHERE short_code=$1`,[code]);assert.equal((await rpc(`SELECT public.bonded_get_template_our_story($1) AS value`,[code])).story,null);assert.equal((await rpc(`SELECT public.bonded_get_template_bucket_list($1) AS value`,[code])).bucket_list,null);
  await assert.rejects(mutate(code,'toggle_interest','sea'),/not enabled/);await assert.rejects(db.query(`SELECT public.bonded_delete_our_story_partner_side($1,$2)`,[code,receipt]),/not enabled/);
 }
});
test('memory photos require the matching owned image receipt and remain server restricted',async()=>{
 await insert('storymediafixture','our-little-pink-day');const id='11111111-1111-4111-8111-111111111111';
 await db.query(`INSERT INTO private.media_assets(id,public_id,resource_type,format,owner_id) VALUES($1,'fixture','image','png',$2)`,[id,partner]);
 await assert.rejects(db.query(`SELECT public.bonded_submit_our_story_partner_side('storymediafixture','Sam','Memory',$1,NULL,NULL,$2,$3::uuid,NULL)`,['/api/media/'+id,receipt,partner]),/upload receipt/);
 await assert.rejects(db.query(`SELECT public.bonded_submit_our_story_partner_side('storymediafixture','Sam','Memory','https://example.com/other.jpg',NULL,$1::uuid,$2,$3::uuid,NULL)`,[id,receipt,partner]),/does not match/);
 const uploaded=await rpc(`SELECT public.bonded_submit_our_story_partner_side('storymediafixture','Sam','Memory',$1,NULL,$2::uuid,$3,$4::uuid,NULL) AS value`,['/api/media/'+id,id,receipt,partner]);assert.ok(uploaded.success);
 const attached=await db.query<{state:string}>(`SELECT state FROM private.media_assets WHERE id=$1`,[id]);assert.equal(attached.rows[0].state,'attached');
 await assert.rejects(db.query(`SELECT public.bonded_delete_our_story_partner_side('storymediafixture','other',NULL,NULL)`),/Not authorized/);
 await rpc(`SELECT public.bonded_delete_our_story_partner_side('storymediafixture',$1,NULL,$2::uuid) AS value`,[receipt,partner]);assert.equal((await rpc(`SELECT public.bonded_get_template_our_story('storymediafixture') AS value`)).story?.partner_contribution,null);
 const acl=await db.query<{anon:boolean}>(`SELECT has_function_privilege('anon','public.bonded_submit_our_story_partner_side(text,text,text,text,text,uuid,text,uuid,text)','EXECUTE') AS anon`);assert.equal(acl.rows[0].anon,false);
});
test('story and bucket configuration reject unsafe photo URLs and duplicate IDs',()=>{
 assert.equal(submitPartnerSideSchema.safeParse({caption:'Hello',photo_url:'javascript:alert(1)'}).success,false);assert.equal(ourStoryToolSchema.safeParse({...story,cards:[cards[0],cards[0],cards[1]]}).success,false);assert.equal(bucketListToolSchema.safeParse({...bucket,items:[bucket.items[0],bucket.items[0]]}).success,false);
});
