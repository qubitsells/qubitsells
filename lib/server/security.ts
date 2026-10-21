import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) { super(message); }
}
export function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value || /^(your-|replace-|https:\/\/your-|change[-_]?me(?:\b|[-_]))/i.test(value) || (["CRON_SECRET", "IP_HASH_SALT"].includes(name) && value.length < 32)) throw new HttpError(503, "This service is not configured. Please contact support.");
  return value;
}
export function adminClient() {
  return createSupabaseClient(requiredEnv("NEXT_PUBLIC_SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false, autoRefreshToken: false } });
}
export async function currentUser() {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  return error ? null : user;
}
export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Please sign in to continue.");
  return user;
}
export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const deny = () => { throw new HttpError(403, "Request origin is not allowed.", "origin_not_allowed"); };
  if (!origin || request.headers.get("sec-fetch-site") === "cross-site") return deny();
  let parsed: URL;
  try { parsed = new URL(origin); } catch { return deny(); }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) return deny();

  const target = new URL(request.url);
  // The browser's Host identifies the domain actually visited (including www,
  // previews and local ports). Next can normalize the request URL to localhost.
  // Only Vercel's proxy may supply the public protocol; ignore forwarded hosts.
  const host = request.headers.get("host") || target.host;
  const forwardedProtocol = process.env.VERCEL === "1" ? request.headers.get("x-forwarded-proto") : null;
  const protocol = process.env.VERCEL === "1"
    ? forwardedProtocol === "http" ? "http:" : "https:"
    : target.protocol;
  if (!/[\\/\s,@?#]/.test(host)) {
    try { if (origin === new URL(`${protocol}//${host}`).origin) return; } catch { /* Invalid Host is not trusted. */ }
  }
  // Keep the explicitly configured public origin usable behind other proxies.
  // It supplements the actual request origin instead of replacing it.
  const configured = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (configured) {
    try { if (origin === new URL(configured).origin) return; } catch { /* Bad canonical config must not bypass validation. */ }
  }
  return deny();
}
export function secretMatches(provided: string | null, expected: string) {
  if (!provided) return false;
  const a = Buffer.from(provided), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function guestIdentity(create = false) {
  const jar = await cookies();
  let token = jar.get("bonded_media_owner")?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    if (!create) return null;
    token = randomBytes(32).toString("hex");
    jar.set("bonded_media_owner", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 60 * 60 * 24 * 31 });
  }
  return createHmac("sha256", requiredEnv("IP_HASH_SALT")).update(`guest:${token}`).digest("hex");
}
export async function rateLimit(request: Request, operation: string, limit: number, windowSeconds = 3600) {
  // On Vercel use its platform-populated IP header; other hosts must set a trusted reverse proxy.
  const trustedHeader = process.env.VERCEL === "1" ? "x-vercel-forwarded-for" : process.env.TRUSTED_PROXY_IP_HEADER;
  const ip = trustedHeader ? request.headers.get(trustedHeader)?.split(",")[0]?.trim() || "unknown" : "unknown";
  const key = createHmac("sha256", requiredEnv("IP_HASH_SALT")).update(`${operation}:${ip}`).digest("hex");
  const { data, error } = await adminClient().rpc("bonded_take_rate_limit", { bucket_key: key, max_requests: limit, window_seconds: windowSeconds });
  if (error) throw new HttpError(503, "Please try again shortly.");
  if (!data) throw new HttpError(429, "Too many requests. Please try again later.");
}
export function apiError(error: unknown) {
  if (error instanceof HttpError) return NextResponse.json({ success: false, error: error.message, ...(error.code ? { code: error.code } : {}) }, { status: error.status });
  // Do not log credentials, private payloads, provider responses, or exception messages.
  console.error("Server operation failed", { type: error instanceof Error ? error.name : "Unknown" });
  return NextResponse.json({ success: false, error: "The operation could not be completed. Please try again." }, { status: 500 });
}
export async function boundedBody(request: Request, maxBytes: number): Promise<Buffer> {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > maxBytes) throw new HttpError(413, "Request is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Request body is required.");
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > maxBytes) { await reader.cancel(); throw new HttpError(413, "Request is too large."); }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
export async function jsonBody(request: Request, maxBytes = 256 * 1024): Promise<unknown> {
  const bytes = await boundedBody(request, maxBytes);
  try { return JSON.parse(bytes.toString("utf8")); }
  catch { throw new HttpError(400, "Invalid JSON body."); }
}
