import "server-only";
import { after } from "next/server";
import { adminClient, HttpError } from "@/lib/server/security";
import { destroyMedia, type StoredMedia } from "@/lib/server/cloudinary";

export async function purgeQueuedMedia(assetIds?: string[]) {
  const db=adminClient();
  const {data,error}=await db.rpc("bonded_claim_cleanup",{batch_size:assetIds ? Math.min(assetIds.length,50) : 20,target_ids:assetIds || null});
  if(error)throw new HttpError(503,"Cleanup is temporarily unavailable.");
  let purged=0,failed=0;
  // Bounded parallelism keeps requests short while retaining the durable lease on failure.
  const rows=(data || []) as StoredMedia[];
  for(let start=0;start<rows.length;start+=4) {
    await Promise.all(rows.slice(start,start+4).map(async asset=>{
      try {
        if(!(await destroyMedia(asset))) {failed++;return;}
        const {error:finishError}=await db.rpc("bonded_finish_cleanup",{asset_id:asset.id});
        if(finishError)failed++;else purged++;
      } catch {failed++;}
    }));
  }
  const {data:templates,error:finishError}=await db.rpc("bonded_finish_templates");
  if(finishError)failed++;
  return {purged,failed,templatesCleaned:typeof templates==="number"?templates:0};
}
export async function purgeAllExpiredTemplates() {
  const result=await purgeQueuedMedia();
  return {success:result.failed===0,templatesCleaned:result.templatesCleaned,assetsPurged:result.purged,failedAssets:result.failed};
}
export function runOpportunisticCleanup() {
  after(async()=>{try {await purgeQueuedMedia();}catch {console.error("Background cleanup deferred; durable records retained.");}});
}
