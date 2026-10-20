import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { mediaIds, safeRedirect, templateInputSchema } from "../lib/security/validation";
import { supportedMedia } from "../lib/security/files";
import { encryptPayload, decryptPayload } from "../lib/server/capsuleCrypto";
import { authCookieOptions } from "../lib/security/sessionCookies";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const db = new PGlite();
const alice="11111111-1111-4111-8111-111111111111",bob="22222222-2222-4222-8222-222222222222",eve="33333333-3333-4333-8333-333333333333";
const pair="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",solo="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",shared="cccccccc-cccc-4ccc-8ccc-cccccccccccc";
async function role(name:string,user="") { await db.exec(`RESET ROLE; SET ROLE ${name}`);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]); }
async function capsule(actor:string,operation:string,id:string|null=null,metadata:unknown={},content:unknown=null,assets:string[]=[]) {
  const result=await db.query<{value:Record<string,unknown>}>("select public.bonded_capsule_operation($1::uuid,$2,$3::uuid,$4::jsonb,$5::jsonb,$6::uuid[]) value",[actor,operation,id,JSON.stringify(metadata),content===null?null:JSON.stringify(content),assets]);
  return result.rows[0].value;
}
before(async()=>{
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;
    CREATE TABLE auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE PUBLICATION supabase_realtime;
  `);
  await db.query("insert into auth.users(id) values($1),($2),($3)",[alice,bob,eve]);
  await db.exec(await fs.readFile("supabase/bootstrap.sql","utf8"));
  const migrations=(await fs.readdir("supabase/migrations")).filter(f=>f.endsWith(".sql")).sort();
  for(const migration of migrations) {
    if(migration.includes("security_hardening")) {
      await db.query("insert into public.couples(id,couple_code,partner_1_id,partner_2_id) values($1,'LOVE-TESTPAIR',$2,$3)",[pair,alice,bob]);
      await db.query("insert into public.time_capsules(id,couple_id,creator_id,title,unlock_date,letter,seal_mode) values($1,$2,$3,'Private letter','2000-01-01',$4::jsonb,'solo')",[solo,pair,alice,JSON.stringify({body:"preserved secret"})]);
    }
    await db.exec(await fs.readFile("supabase/migrations/"+migration,"utf8"));
  }
});
after(async()=>{await db.close();});

test("redirects cannot escape the site or become script URLs",()=>{
  for(const url of ["https://evil.test","//evil.test","javascript:alert(1)","/\\evil.test","/\nheader"])assert.equal(safeRedirect(url),"/");
  assert.equal(safeRedirect("/profile?code=LOVE-ABC"),"/profile?code=LOVE-ABC");
});
test("remember-me off creates session cookies and preserves logout deletion",()=>{
  const options={path:"/",maxAge:3600,expires:new Date("2099-01-01")};
  assert.equal(authCookieOptions(options,false,true).maxAge,undefined);
  assert.equal(authCookieOptions(options,false,true).expires,undefined);
  assert.equal(authCookieOptions(options,true,true).maxAge,3600);
  assert.equal(authCookieOptions({...options,maxAge:0},false,true).maxAge,0);
});
test("uploads reject active SVG content and mismatched MIME types",()=>{
  const png=new Uint8Array([137,80,78,71,13,10,26,10]);
  assert.equal(supportedMedia(png,"image/png"),"image");
  assert.equal(supportedMedia(png,"image/jpeg"),null);
  assert.equal(supportedMedia(Buffer.from("<svg onload='alert(1)'/>"),"image/svg+xml"),null);
});
test("template validation rejects arbitrary asset IDs and excessive videos",()=>{
  const body={scene_index:0,partner_name:"Partner",partner_from:"Creator",message:"Hi",has_media:true,expiry_hours:24,
    media_items:[{url:"https://res.cloudinary.com/other/image/upload/victim.jpg",public_id:"victim",type:"image"}]};
  assert.equal(templateInputSchema.safeParse(body).success,false);
  const local={url:`/api/media/${solo}`,public_id:solo,type:"video"};
  assert.equal(templateInputSchema.safeParse({...body,media_items:[local,local]}).success,false);
  assert.deepEqual(mediaIds({images:[`/api/media/${solo}`,`/api/media/${solo}`]}),[solo]);
});
test("capsule encryption detects content tampering and swapping between capsules",()=>{
  process.env.CAPSULE_ENCRYPTION_KEY="a".repeat(64);
  const encrypted=encryptPayload({body:"private"},solo);
  assert.equal(JSON.stringify(encrypted).includes("private"),false);
  assert.deepEqual(decryptPayload(encrypted,solo),{body:"private"});
  assert.throws(()=>decryptPayload(encrypted,shared));
  assert.throws(()=>decryptPayload({...encrypted,ciphertext:"AAAA"},solo));
});
test("migration preserves old content and removes it from browser-readable rows",async()=>{
  await role("service_role");
  const content=await db.query<{payload:{letter:{body:string}}}>("select payload from private.capsule_payloads where capsule_id=$1",[solo]);
  assert.equal(content.rows[0].payload.letter.body,"preserved secret");
  const row=await db.query<{letter:unknown}>("select letter from public.time_capsules where id=$1",[solo]);
  assert.deepEqual(row.rows[0].letter,{});
});
test("anonymous and partner clients cannot read solo capsules or private contents",async()=>{
  await role("anon");
  await assert.rejects(db.query("select * from public.time_capsules"));
  await role("authenticated",bob);
  const rows=await db.query("select id from public.time_capsules where id=$1",[solo]);
  assert.equal(rows.rows.length,0);
  await assert.rejects(db.query("select * from private.capsule_payloads"));
  await assert.rejects(db.query("select public.bonded_capsule_operation($1::uuid,'list')",[alice]));
  await assert.rejects(db.query("update public.couples set partner_2_id=$1 where id=$2",[eve,pair]));
});
test("server capsule reads reject strangers and withhold sealed content",async()=>{
  await role("service_role");
  await assert.rejects(capsule(eve,"get",solo));
  assert.equal((await capsule(alice,"get",solo)).content,null);
  const opened=await capsule(alice,"unlock",solo);
  assert.deepEqual((opened.content as {letter:unknown}).letter,{body:"preserved secret"});
});
test("future solo capsules cannot be opened or edited early",async()=>{
  await role("service_role");
  const id="dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  await capsule(alice,"create",id,{title:"Future",category:"milestone",unlock_date:"2099-01-01T00:00:00Z",seal_mode:"solo",seal_color:"rose",seal_stamp:"love"},{letter:{body:"future"}});
  await assert.rejects(capsule(alice,"unlock",id),/unlock date/);
  await assert.rejects(capsule(alice,"update",id,{},{}),/sealed/);
});
test("shared drafts stay editable for creator; sealing and votes require distinct partners",async()=>{
  await role("service_role");
  const draft=await capsule(alice,"create",shared,{title:"Together",category:"milestone",unlock_date:"2000-01-01T00:00:00Z",seal_mode:"couple",seal_color:"rose",seal_stamp:"love"},{letter:{body:"shared memory"}});
  assert.equal(draft.is_locked,false);
  assert.equal((await capsule(bob,"get",shared)).content,null);
  const requests=await db.query<{id:string}>("select id from public.capsule_seal_requests where capsule_id=$1",[shared]);
  const id=requests.rows[0].id;
  await assert.rejects(db.query("select public.bonded_seal_operation($1::uuid,'respond',$2::uuid,NULL,'accepted')",[alice,id]));
  await db.query("select public.bonded_seal_operation($1::uuid,'respond',$2::uuid,NULL,'accepted')",[bob,id]);
  assert.equal((await capsule(alice,"get",shared)).content,null);
  await db.query("select public.bonded_seal_operation($1::uuid,'vote',$2::uuid)",[alice,id]);
  await assert.rejects(capsule(alice,"unlock",shared),/Both partners/);
  await db.query("select public.bonded_seal_operation($1::uuid,'vote',$2::uuid)",[bob,id]);
  assert.deepEqual((await capsule(bob,"get",shared)).content,{letter:{body:"shared memory"}});
  await role("authenticated",alice);
  await assert.rejects(db.query("update public.capsule_seal_requests set unlock_vote_partner=true where id=$1",[id]));
});
test("media ownership prevents strangers deleting files or attaching them to templates",async()=>{
  await role("service_role");
  const asset="eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
  await db.query("select public.bonded_register_media($1::jsonb)",[JSON.stringify({id:asset,public_id:"bonded/capsules/test",resource_type:"image",format:"png",owner_id:alice})]);
  await assert.rejects(db.query("select public.bonded_media_operation($1::uuid,NULL,$2::uuid,'discard')",[eve,asset]));
  await assert.rejects(db.query("select public.bonded_create_template($1::uuid,NULL,'hash',$2::jsonb,$3::uuid[])",[eve,JSON.stringify({short_code:"123456abcdef",expires_at:"2099-01-01"}),[asset]]));
  const result=await db.query<{state:string}>("select state from private.media_assets where id=$1",[asset]);
  assert.equal(result.rows[0].state,"pending");
});
test("public templates cannot be enumerated or inserted directly and expired links stop working",async()=>{
  await role("authenticated",alice);
  await assert.rejects(db.query("select * from public.couple_templates"));
  await assert.rejects(db.query("insert into public.couple_templates(short_code) values('ATTACK')"));
  await assert.rejects(db.query("select public.delete_expired_templates()"));
  await role("service_role");
  await db.query("insert into public.couple_templates(short_code,expires_at) values('expired123456',now()-interval '1 day')");
  const result=await db.query<{value:unknown}>("select public.bonded_template_operation('expired123456','read') value");
  assert.deepEqual(result.rows[0].value,{expired:true});
});
test("rate limits fail closed after the quota and are not bypassed by concurrent inserts",async()=>{
  await role("service_role");
  const results=await Promise.all(Array.from({length:6},()=>db.query<{allowed:boolean}>("select public.bonded_take_rate_limit('test-bucket',5,3600) allowed")));
  assert.equal(results.filter(r=>r.rows[0].allowed).length,5);
});
test("failed cleanup retains media for retry instead of removing ownership records",async()=>{
  await role("service_role");
  await db.query("select public.bonded_media_operation($1::uuid,NULL,$2::uuid,'discard')",[alice,"eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"]);
  const claimed=await db.query("select id from public.bonded_claim_cleanup(20)");
  assert.equal(claimed.rows.length,1);
  const remaining=await db.query("select id from private.media_assets where state='deleting'");
  assert.equal(remaining.rows.length,1);
});
test("pairing is real, idempotent and preserves a joining partner's solo capsules",async()=>{
  const first="44444444-4444-4444-8444-444444444444",second="55555555-5555-4555-8555-555555555555",memory="88888888-8888-4888-8888-888888888888";
  await role("postgres");
  await db.query("insert into auth.users(id) values($1),($2)",[first,second]);
  await role("authenticated",first);
  const a=await db.query<{pair:{id:string;couple_code:string}}>("select public.ensure_couple() pair");
  const repeat=await db.query<{pair:{id:string}}>("select public.ensure_couple() pair");
  assert.equal(a.rows[0].pair.id,repeat.rows[0].pair.id);
  assert.equal(a.rows[0].pair.couple_code.length,37);
  await role("authenticated",second);
  await db.query("select public.ensure_couple()");
  await role("service_role");
  await capsule(second,"create",memory,{title:"My solo memory",category:"milestone",unlock_date:"2000-01-01",seal_mode:"solo",seal_color:"rose",seal_stamp:"love"},{letter:{body:"keep this"}});
  await role("authenticated",second);
  const joined=await db.query<{result:{success:boolean}}>("select public.join_couple_by_code($1) result",[a.rows[0].pair.couple_code]);
  assert.equal(joined.rows[0].result.success,true);
  const own=await db.query<{id:string}>("select id from public.couples");
  assert.deepEqual(own.rows.map(r=>r.id),[a.rows[0].pair.id]);
  await role("service_role");
  assert.equal((await capsule(second,"get",memory)).couple_id,a.rows[0].pair.id);
  await assert.rejects(capsule(first,"get",memory));
  await role("authenticated",eve);
  const invalid=await db.query<{result:{success:boolean}}>("select public.join_couple_by_code('LOVE-NOTREAL') result");
  assert.equal(invalid.rows[0].result.success,false);
  const occupied=await db.query<{result:{success:boolean}}>("select public.join_couple_by_code($1) result",[a.rows[0].pair.couple_code]);
  assert.equal(occupied.rows[0].result.success,false);
});
test("profile upserts work for owner without allowing membership changes to strangers",async()=>{
  await role("authenticated","44444444-4444-4444-8444-444444444444");
  const pairs=await db.query<{id:string}>("select id from public.couples");
  const id="44444444-4444-4444-8444-444444444444";
  await db.query("insert into public.profiles(id,couple_id,full_name) values($1,$2,'Owner') on conflict(id) do update set id=excluded.id,couple_id=excluded.couple_id,full_name=excluded.full_name",[id,pairs.rows[0].id]);
  await assert.rejects(db.query("update public.profiles set couple_id=$1 where id=$2",[pair,id]));
});
test("both partners can edit opened shared media, while a sealed capsule denies file access",async()=>{
  await role("service_role");
  const asset="66666666-6666-4666-8666-666666666666";
  await db.query("select public.bonded_register_media($1::jsonb)",[JSON.stringify({id:asset,public_id:"bonded/capsules/shared-photo",resource_type:"image",format:"png",owner_id:alice})]);
  await capsule(alice,"update",shared,{}, {polaroids:[{image:`/api/media/${asset}`}]},[asset]);
  await db.query("select public.bonded_media_operation($1::uuid,NULL,$2::uuid,'read')",[bob,asset]);
  await assert.rejects(db.query("select public.bonded_media_operation($1::uuid,NULL,$2::uuid,'read')",[eve,asset]));
  const bobAsset="77777777-7777-4777-8777-777777777777";
  await db.query("select public.bonded_register_media($1::jsonb)",[JSON.stringify({id:bobAsset,public_id:"bonded/capsules/partner-photo",resource_type:"image",format:"png",owner_id:bob})]);
  await capsule(bob,"update",shared,{}, {polaroids:[{image:`/api/media/${asset}`},{image:`/api/media/${bobAsset}`}]},[asset,bobAsset]);
  await db.query("select public.bonded_media_operation($1::uuid,NULL,$2::uuid,'read')",[alice,bobAsset]);
  // A stale wizard cancellation, including a lost response to a save, cannot purge attached media.
  await db.query("select public.bonded_media_operation($1::uuid,NULL,$2::uuid,'discard')",[bob,bobAsset]);
  const preserved=await db.query<{state:string}>("select state from private.media_assets where id=$1",[bobAsset]);
  assert.equal(preserved.rows[0].state,"attached");
  const futureAsset="99999999-9999-4999-8999-999999999999",futureCapsule="abababab-abab-4bab-8bab-abababababab";
  await db.query("select public.bonded_register_media($1::jsonb)",[JSON.stringify({id:futureAsset,public_id:"bonded/capsules/sealed-photo",resource_type:"image",format:"png",owner_id:alice})]);
  await capsule(alice,"create",futureCapsule,{title:"Sealed media",category:"milestone",unlock_date:"2099-01-01",seal_mode:"solo",seal_color:"rose",seal_stamp:"love"},{polaroids:[{image:`/api/media/${futureAsset}`}]},[futureAsset]);
  await assert.rejects(db.query("select public.bonded_media_operation($1::uuid,NULL,$2::uuid,'read')",[alice,futureAsset]));
});
test("migration utilities encrypt in place without changing capsule ownership or state",async()=>{
  await role("service_role");
  const before=await capsule(alice,"get",solo);
  const payload=encryptPayload({letter:{body:"preserved secret"}},solo);
  await db.query("select public.bonded_save_migrated('capsules',$1::uuid,$2::jsonb,'{}'::uuid[],'[]'::jsonb)",[solo,JSON.stringify(payload)]);
  const after=await capsule(alice,"get",solo);
  assert.equal(after.creator_id,before.creator_id);
  assert.equal(after.is_locked,before.is_locked);
  assert.deepEqual(decryptPayload(after.content as Record<string,unknown>,solo),{letter:{body:"preserved secret"}});
  await role("authenticated",alice);
  await assert.rejects(db.query("select public.bonded_migration_snapshot('capsules')"));
  await assert.rejects(db.query("select * from public.shared_wishes"));
});
test("an individual account can save a profile without creating or joining a couple",async()=>{
  const individual="98989898-9898-4989-8989-989898989898";
  await db.exec("RESET ROLE");
  await db.query("insert into auth.users(id) values($1)",[individual]);
  await role("authenticated",individual);
  await db.query("insert into public.profiles(id,full_name) values($1,'Taylor Morgan') on conflict(id) do update set full_name=excluded.full_name",[individual]);
  const profile=await db.query<{full_name:string;couple_id:string|null}>("select full_name,couple_id from public.profiles where id=$1",[individual]);
  assert.equal(profile.rows[0].full_name,"Taylor Morgan");
  assert.equal(profile.rows[0].couple_id,null);
  assert.equal((await db.query("select id from public.couples")).rows.length,0);
  await assert.rejects(db.query("update public.profiles set couple_id=$1 where id=$2",[pair,individual]));
});
test("Next lint directory discovery works with the safe local glob interface",()=>{
  const require=createRequire(resolve("package.json"));
  const {getRootDirs}=require("@next/eslint-plugin-next/dist/utils/get-root-dirs");
  assert.deepEqual(getRootDirs({cwd:process.cwd(),settings:{next:{rootDir:["app","components"]}}}),["app","components"]);
  assert.deepEqual(getRootDirs({cwd:process.cwd(),settings:{}}),[process.cwd()]);
});
