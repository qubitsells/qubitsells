import { z } from "zod";

export const ACCOUNT_PURPOSES = [
  { value: "personal", label: "Personal", description: "Friends, family, and everyday occasions" },
  { value: "work", label: "Work & business", description: "Your business, clients, or professional projects" },
  { value: "both", label: "A bit of both", description: "One account for whatever you create" },
] as const;

export const accountProfileSchema = z.object({
  full_name: z.string().trim().min(1, "Please enter your name.").max(100, "Please use 100 characters or fewer for your name."),
  organization: z.string().trim().max(120, "Organization names can have up to 120 characters."),
  job_title: z.string().trim().max(100, "Job titles can have up to 100 characters."),
  website: z.string().trim().max(2048).refine(value => {
    if (!value) return true;
    try { return ["https:", "http:"].includes(new URL(value).protocol); } catch { return false; }
  }, "Please enter a full website address starting with https:// or http://."),
  bio: z.string().trim().max(300, "Your introduction can have up to 300 characters."),
  purpose: z.enum(["personal", "work", "both"]),
});
export type AccountProfile = z.infer<typeof accountProfileSchema>;

export function accountProfileFromMetadata(metadata: Record<string, unknown>, fallbackName = ""): AccountProfile {
  const stored = metadata.account_profile && typeof metadata.account_profile === "object" ? metadata.account_profile as Record<string, unknown> : {};
  const value = (key: string) => typeof stored[key] === "string" ? stored[key] as string : "";
  return {
    full_name: typeof metadata.full_name === "string" ? metadata.full_name : typeof metadata.name === "string" ? metadata.name : fallbackName,
    organization: value("organization"), job_title: value("job_title"), website: value("website"), bio: value("bio"),
    purpose: stored.purpose === "work" || stored.purpose === "both" ? stored.purpose : "personal",
  };
}
