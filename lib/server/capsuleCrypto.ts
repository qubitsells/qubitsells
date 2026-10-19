import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { requiredEnv } from "./security";

function key() {
  const value = requiredEnv("CAPSULE_ENCRYPTION_KEY");
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error("Invalid capsule encryption configuration");
  return Buffer.from(value, "hex");
}
export function encryptPayload(payload: unknown, capsuleId: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(capsuleId));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return { v: 1, iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), ciphertext: ciphertext.toString("base64") };
}
export function decryptPayload(payload: Record<string, unknown>, capsuleId: string): Record<string, unknown> {
  if (payload.v !== 1) return payload; // Existing content is quarantined in the private schema during migration.
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(String(payload.iv), "base64"));
  decipher.setAAD(Buffer.from(capsuleId));
  decipher.setAuthTag(Buffer.from(String(payload.tag), "base64"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(String(payload.ciphertext), "base64")), decipher.final()]).toString("utf8"));
}
