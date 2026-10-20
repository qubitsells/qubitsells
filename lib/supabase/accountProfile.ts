import type { SupabaseClient } from "@supabase/supabase-js";
import { accountProfileSchema, type AccountProfile } from "@/lib/account-profile";
import { coupleProfileSchema, type CoupleProfileValues } from "@/lib/couple-profile";

/** Account display data is independent of couple membership and preferences. */
export async function saveAccountProfile(client: SupabaseClient, userId: string, input: AccountProfile) {
  const profile = accountProfileSchema.parse(input);
  const { full_name, ...privateDetails } = profile;
  // Omitting couple_id preserves any existing membership. Work details remain
  // in the account's own auth metadata, rather than the partner-readable table.
  const { error: nameError } = await client.from("profiles").upsert({
    id: userId, full_name, updated_at: new Date().toISOString(),
  }, { onConflict: "id" });
  if (nameError) throw new Error("Your profile could not be saved. Please try again.");
  const { error } = await client.auth.updateUser({ data: { full_name, account_profile: privateDetails } });
  if (error) throw new Error("Your account details could not be saved. Please try again.");
  return profile;
}

export async function saveCoupleProfile(client: SupabaseClient, userId: string, coupleId: string, input: CoupleProfileValues) {
  const value = coupleProfileSchema.parse(input);
  const { data, error } = await client.from("couples").update({
    anniversary_date: value.anniversary_date || null, couple_motto: value.couple_motto,
    couple_anthem: value.couple_anthem, updated_at: new Date().toISOString(),
  }).eq("id", coupleId).select("id").single();
  if (error || !data) throw new Error("Your shared details couldn’t be saved. Please refresh and try again.");
  const { error: preferenceError } = await client.from("profiles").upsert({
    id: userId, partner_nickname: value.partner_nickname, love_language: value.love_language,
    partner_love_language: value.partner_love_language, couple_anthem: value.couple_anthem, updated_at: new Date().toISOString(),
  }, { onConflict: "id" });
  if (preferenceError) throw new Error("Your relationship preferences couldn’t be saved. Please try again.");
  const { error: metadataError } = await client.auth.updateUser({ data: value });
  if (metadataError) throw new Error("Your relationship preferences couldn’t be synced. Please try again.");
  return value;
}
