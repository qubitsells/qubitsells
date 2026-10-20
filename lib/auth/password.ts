import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { authCallbackUrl } from "./navigation";

export const newPasswordSchema = z.object({
  password: z.string().min(8, "Use at least 8 characters.").max(128, "Use no more than 128 characters."),
  confirm: z.string(),
}).refine(value => value.password === value.confirm, { message: "Your passwords don’t match.", path: ["confirm"] });

export async function sendPasswordReset(client: SupabaseClient, email: string, origin: string) {
  const parsed = z.email().safeParse(email.trim());
  if (!parsed.success) throw new Error("Enter a valid email address.");
  const { error } = await client.auth.resetPasswordForEmail(parsed.data, { redirectTo: authCallbackUrl(origin, "/reset-password") });
  if (error) throw new Error("The reset email couldn’t be sent. Please wait a moment and try again.");
}

export async function saveNewPassword(client: SupabaseClient, input: unknown) {
  const parsed = newPasswordSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) throw new Error("Your reset link has expired. Request a new email and try again.");
  const { error } = await client.auth.updateUser({ password: parsed.data.password });
  if (error) throw new Error("Your password couldn’t be updated. Use a different password or request a new reset link.");
}
