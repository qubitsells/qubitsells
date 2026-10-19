import nextEnv from "@next/env";
import { randomUUID,createHmac } from "node:crypto";
import { adminClient,requiredEnv } from "../lib/server/security";
import { uploadMedia,destroyMedia,type StoredMedia } from "../lib/server/cloudinary";
import { encryptPayload,decryptPayload } from "../lib/server/capsuleCrypto";
import { mediaIds } from "../lib/security/validation";
if (process.argv.includes("--help")) {
  console.log("Preview: npm run security:migrate-media\nMigrate during maintenance: npm run security:migrate-media -- --apply\nRetire reviewed originals after successful migration: npm run security:migrate-media -- --apply --retire-legacy");
  process.exit(0);
}
nextEnv.loadEnvConfig(process.cwd());
const apply=process.argv.includes("--apply"),retire=process.argv.includes("--retire-legacy");
if(retire && !apply)throw new Error("Use --apply with --retire-legacy after reviewing the migration instructions.");
const db=adminClient(),cloud=requiredEnv("CLOUDINARY_CLOUD_NAME");
function legacyMedia(value:string):Omit<StoredMedia,"id">|null {
  if(!value.startsWith("https://res.cloudinary.com/"))return null;
  const url=new URL(value),segments=url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  if(segments[0]!==cloud || !["image","video"].includes(segments[1]) || segments[2]!=="upload")throw new Error("A legacy media URL does not belong to the configured account.");
  const parts=segments.slice(3);if(/^v\d+$/.test(parts[0]))parts.shift();
  const path=parts.join("/"),dot=path.lastIndexOf(".");
  if(dot<1 || /[,=]/.test(path) || !path.startsWith("bonded/"))throw new Error("A legacy asset needs manual review before migration.");
  return {public_id:path.slice(0,dot),format:path.slice(dot+1),resource_type:segments[1] as "image"|"video",delivery_type:"upload"};
}
let scanned=0,migrated=0,copied=0,legacyFound=0;
for(const kind of ["capsules","templates"] as const) {
  let cursor:string|null=null;
  while(true) {
    const {data,error}=await db.rpc("bonded_migration_snapshot",{kind,cursor_id:cursor});
    if(error)throw new Error("Apply the security database migration before running this utility.");
    const rows=data as {id:string;creator_id?:string;content:Record<string,unknown>|unknown[]}[];
    if(!rows.length)break;
    for(const row of rows) {
      scanned++;
      const content=kind==="capsules"?decryptPayload(row.content as Record<string,unknown>,row.id):row.content;
      const replacements=new Map<string,string>(),legacy:Omit<StoredMedia,"id">[]=[];
      function collect(value:unknown) {
        if(typeof value==="string" && legacyMedia(value))replacements.set(value,"");
        else if(Array.isArray(value))value.forEach(collect);
        else if(value && typeof value==="object")Object.values(value).forEach(collect);
      }
      collect(content);legacyFound+=replacements.size;
      if(!apply)continue;
      if(kind==="capsules" && !row.creator_id)throw new Error("A legacy capsule needs an owner assigned before it can be migrated. No original media was deleted.");
      for(const url of replacements.keys()) {
        const original=legacyMedia(url)!;legacy.push(original);
        const id=randomUUID(),uploaded=await uploadMedia(url,id,original.resource_type,kind);
        const guest=kind==="templates"?createHmac("sha256",requiredEnv("IP_HASH_SALT")).update("legacy:"+row.id).digest("hex"):null;
        const asset={id,...uploaded,resource_type:original.resource_type,owner_id:row.creator_id || null,guest_hash:guest};
        const {error:registerError}=await db.rpc("bonded_register_media",{asset});
        if(registerError) {
          await destroyMedia({...asset,delivery_type:"authenticated"}).catch(()=>false);
          throw new Error("A protected copy could not be registered. Original media was retained.");
        }
        replacements.set(url,"/api/media/"+id);copied++;
      }
      function rewrite(value:unknown):unknown {
        if(typeof value==="string")return replacements.get(value) || value;
        if(Array.isArray(value))return value.map(rewrite);
        if(value && typeof value==="object")return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,rewrite(v)]));
        return value;
      }
      const result=rewrite(content);
      const payload=kind==="capsules"?encryptPayload(result,row.id):result;
      const {error:saveError}=await db.rpc("bonded_save_migrated",{kind,target_id:row.id,payload,asset_ids:mediaIds(result),legacy_assets:legacy});
      if(saveError)throw new Error("A migration update failed. Original files were retained; the utility can be run again.");
      migrated++;
    }
    cursor=rows[rows.length-1].id;
  }
}
if(retire) {
  const {error}=await db.rpc("bonded_retire_legacy_media");
  if(error)throw new Error("Original-media retirement could not be scheduled.");
}
console.log(JSON.stringify({mode:apply?"apply":"preview",scanned,migrated,copied,legacyReferences:legacyFound,originalRetirementScheduled:retire}));
