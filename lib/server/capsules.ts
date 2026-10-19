import "server-only";
import { adminClient, HttpError } from "./security";
import { decryptPayload } from "./capsuleCrypto";
import type { TimeCapsuleRecord } from "@/lib/supabase/timeCapsules";

export async function capsuleOperation(actorId: string, operation: string, args: Record<string, unknown> = {}) {
  const { data, error } = await adminClient().rpc("bonded_capsule_operation", { actor_id: actorId, operation, ...args });
  if (error) {
    if (error.code === "42501") throw new HttpError(403, "This capsule is private or sealed.");
    if (error.message.includes("unlock date")) throw new HttpError(409, "This capsule stays sealed until its unlock date.");
    if (error.message.includes("Both partners")) throw new HttpError(409, "Both partners must approve before opening this capsule.");
    throw new HttpError(503, "The capsule could not be saved. Please try again.");
  }
  return data;
}
export function hydrateCapsule(row: Record<string, unknown>): TimeCapsuleRecord {
  const { content, ...metadata } = row;
  const payload = content && typeof content === "object" ? decryptPayload(content as Record<string, unknown>, String(row.id)) : {};
  return {
    ...metadata, ...payload,
    letter: { author: "", greeting: "", body: "", signOff: "", paperTheme: "parchment", ...(payload.letter && typeof payload.letter === "object" ? payload.letter : {}) },
    ...Object.fromEntries(["folders", "polaroids", "voice_notes", "video_notes", "text_notes", "predictions"].map(name => [name, Array.isArray(payload[name]) ? payload[name] : []])),
  } as unknown as TimeCapsuleRecord;
}
