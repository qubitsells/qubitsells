import "server-only";
import { createHash } from "node:crypto";
import { HttpError, requiredEnv } from "./security";
export interface StoredMedia { id: string; public_id: string; resource_type: "image" | "video"; delivery_type: "authenticated" | "upload"; format: string; }
export function cloudinaryConfig() {
  return { cloudName: requiredEnv("CLOUDINARY_CLOUD_NAME"), apiKey: requiredEnv("CLOUDINARY_API_KEY"), apiSecret: requiredEnv("CLOUDINARY_API_SECRET") };
}
export function signedParams(params: Record<string,string>) {
  const { apiSecret, apiKey } = cloudinaryConfig();
  const serialized = Object.keys(params).sort().map(k=>`${k}=${params[k]}`).join("&");
  return { ...params, api_key: apiKey, signature: createHash("sha1").update(serialized+apiSecret).digest("hex") };
}
export async function uploadMedia(file: Blob | string, id: string, resourceType: "image" | "video", purpose: "capsules" | "templates") {
  const { cloudName } = cloudinaryConfig();
  const params = signedParams({ public_id: `bonded/${purpose}/${id}`, timestamp: String(Math.floor(Date.now()/1000)), type: "authenticated", overwrite: "false", allowed_formats: resourceType === "image" ? "jpg,jpeg,png,gif,webp" : "mp4,webm,mp3,wav,ogg,m4a" });
  const form = new FormData(); form.set("file",file);
  Object.entries(params).forEach(([k,v])=>form.set(k,v));
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${resourceType}/upload`, { method: "POST", body: form, signal: AbortSignal.timeout(60000) });
  const result = await response.json();
  if (!response.ok || result.error || typeof result.public_id!=="string" || typeof result.format!=="string") throw new HttpError(502,"The media upload failed. Please try again.");
  return { public_id: result.public_id as string, format: result.format as string, duration: typeof result.duration==="number" ? result.duration : null };
}
export async function destroyMedia(media: StoredMedia): Promise<boolean> {
  const { cloudName } = cloudinaryConfig();
  const params = signedParams({ public_id: media.public_id, type: media.delivery_type, invalidate: "true", timestamp: String(Math.floor(Date.now()/1000)) });
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${media.resource_type}/destroy`, { method:"POST",body:new URLSearchParams(params),signal:AbortSignal.timeout(15000) });
  const result = await response.json();
  return response.ok && (result.result==="ok" || result.result==="not found");
}
export function mediaDeliveryUrl(media: StoredMedia) {
  const { cloudName, apiSecret } = cloudinaryConfig();
  const path = `${media.public_id}.${media.format}`;
  const signature = createHash("sha1").update(path+apiSecret).digest("base64url").slice(0,8);
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/${media.resource_type}/${media.delivery_type}/s--${signature}--/${encoded}`;
}
