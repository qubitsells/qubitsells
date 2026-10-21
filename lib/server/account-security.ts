import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { HttpError } from "./security";

const deletionConfirmation = z.object({ confirmation: z.literal("DELETE"), email: z.email().max(254) }).strict();
const sessionClaims = z.object({ sub: z.string(), amr: z.array(z.object({ method: z.string(), timestamp: z.number().finite() })) });
const signInMethods = new Set(["password", "oauth", "otp", "totp", "recovery", "invite", "sso/saml", "magiclink", "email/signup"]);

export async function deletePersonalAccount(admin: SupabaseClient, client: SupabaseClient, input: unknown, now = Date.now()) {
  const { data: { session }, error: sessionError } = await client.auth.getSession();
  if (sessionError || !session?.access_token) throw new HttpError(401, "Please sign in again to continue.");
  // Explicitly verify this exact token with Supabase before reading its AMR.
  // A fresh token refresh or another device's login is not reauthentication.
  const { data: { user }, error } = await client.auth.getUser(session.access_token);
  if (error || !user) throw new HttpError(401, "Please sign in to continue.");
  const confirmation = deletionConfirmation.safeParse(input);
  if (!confirmation.success || !user.email || confirmation.data.email.toLowerCase() !== user.email.toLowerCase()) {
    throw new HttpError(400, "Enter your account email and type DELETE to confirm.");
  }
  let signedIn = 0;
  try {
    const claims = sessionClaims.parse(JSON.parse(Buffer.from(session.access_token.split(".")[1], "base64url").toString("utf8")));
    if (claims.sub === user.id) signedIn = Math.max(0, ...claims.amr.filter(value => signInMethods.has(value.method)).map(value => value.timestamp * 1000));
  } catch { /* Missing or malformed auth-method claims require a fresh sign-in. */ }
  if (!Number.isFinite(signedIn) || now - signedIn > 10 * 60 * 1000 || signedIn > now + 60_000) {
    throw new HttpError(403, "Please sign in again before deleting your account.", "reauthentication_required");
  }
  const { data: ready, error: migrationError } = await admin.rpc("qubit_account_deletion_ready");
  if (migrationError || ready !== true) throw new HttpError(503, "Account deletion is temporarily unavailable. Please try again later.");
  const { error: revokeError } = await admin.auth.admin.signOut(session.access_token, "global");
  if (revokeError) throw new HttpError(503, "Your sessions could not be closed. Please try again.");
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id, false);
  if (deleteError) throw new HttpError(503, "Deletion couldn’t be completed. Please sign in again and retry.");
  // Supabase clears local cookies even when the deleted user no longer exists.
  try { await client.auth.signOut({ scope: "local" }); } catch { /* Client also clears its session on success. */ }
}
