import { z } from "zod";

export const LOVE_LANGUAGES = [
  ["words", "Words of affirmation"], ["time", "Quality time"], ["gifts", "Receiving gifts"],
  ["acts", "Acts of service"], ["touch", "Physical touch"],
] as const;
const language = z.enum(["", "words", "time", "gifts", "acts", "touch"]);
export const coupleProfileSchema = z.object({
  partner_nickname: z.string().trim().max(100),
  anniversary_date: z.string().refine(value => !value || (/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))), "Please enter a valid anniversary date."),
  couple_motto: z.string().trim().max(500, "Your shared message can have up to 500 characters."),
  love_language: language, partner_love_language: language,
  couple_anthem: z.object({
    url: z.string().max(2048), youtubeId: z.string().regex(/^[A-Za-z0-9_-]{11}$/, "Please load a valid YouTube song."),
    title: z.string().max(500), artist: z.string().max(500), thumbnail: z.string().max(2048),
    duration: z.number().min(0).max(86400), startAt: z.number().min(0).max(86400), autoplay: z.boolean(),
  }).refine(song => !song.duration || song.startAt < song.duration, "Choose a starting point before the end of the song.").nullable(),
});
export type CoupleProfileValues = z.infer<typeof coupleProfileSchema>;
