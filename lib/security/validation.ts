import { z } from "zod";

export const uuid = z.string().uuid();
export const templateCode = z.string().regex(/^[A-Za-z0-9]{6,24}$/);
export const mediaReference = z.string().regex(/^\/api\/media\/[0-9a-f-]{36}$/i);
const text = (max: number) => z.string().max(max);
const note = z.object({ id: text(100).optional(), title: text(200), duration: text(40).optional(), speaker: text(100), folder_id: text(100).optional() });
export const capsuleContentSchema = z.object({
  folders: z.array(z.object({ id: text(100), name: text(100), icon: text(20).optional(), description: text(500).optional(), created_at: text(50).optional() })).max(50).default([]),
  letter: z.object({ author: text(100), greeting: text(200), body: text(20000), signOff: text(200), paperTheme: z.enum(["parchment", "silk", "starlight", "vintage"]) }),
  polaroids: z.array(z.object({ id: text(100), image: text(1000), caption: text(500), date: text(100), location: text(200), noteOnBack: text(2000).optional(), rotation: z.number().finite().optional(), folder_id: text(100).optional() })).max(100),
  voice_note: note.extend({ duration: text(40), audioUrl: text(1000).optional(), audioDesc: text(2000).optional() }).nullable().optional(),
  voice_notes: z.array(note.extend({ duration: text(40), audioUrl: text(1000).optional(), audioDesc: text(2000).optional() })).max(100).default([]),
  video_note: note.extend({ videoUrl: text(1000), videoDesc: text(2000).optional() }).nullable().optional(),
  video_notes: z.array(note.extend({ videoUrl: text(1000), videoDesc: text(2000).optional() })).max(100).default([]),
  text_notes: z.array(z.object({ id: text(100), title: text(200), content: text(20000), author: text(100).optional(), date: text(100).optional(), folder_id: text(100).optional() })).max(100).default([]),
  predictions: z.array(z.object({ id: text(100).optional(), question: text(1000), partner1Answer: text(5000), partner2Answer: text(5000), status: z.enum(["pending", "came_true", "plot_twist"]).optional() })).max(100).default([]),
  secret_token: z.object({ type: z.enum(["song", "coupon", "vow"]), title: text(200), description: text(2000), badge: text(100) }).nullable().optional(),
});
export const capsuleMetadataSchema = z.object({
  id: uuid.optional(), title: z.string().trim().min(1).max(200),
  category: z.enum(["milestone", "anniversary", "open_when", "predictions", "memories"]),
  unlock_date: z.string().min(1).max(100), seal_mode: z.enum(["solo", "couple"]).default("solo"),
  seal_color: z.enum(["crimson", "gold", "velvet", "emerald", "rose"]), seal_stamp: text(20),
}).superRefine((value, ctx) => {
  if (value.category !== "open_when" && !Number.isFinite(Date.parse(value.unlock_date))) {
    ctx.addIssue({ code: "custom", path: ["unlock_date"], message: "Select a valid unlock date." });
  }
});
export const musicSchema = z.object({
  id: text(100), title: text(200), artist: text(200), thumbnailUrl: z.string().url().max(1000),
  mp3Url: z.union([z.literal(""), z.string().url().max(1000)]), duration: z.number().finite().min(0).max(86400),
  startAt: z.number().finite().min(0).max(86400), waveform: z.array(z.number().min(0).max(100)).max(300),
  type: z.enum(["freetouse", "youtube"]).optional(), youtubeId: z.string().regex(/^[\w-]{11}$/).optional(), youtubeUrl: z.string().url().max(1000).optional(),
});
export const replyToolSchema = z.object({
  id: z.literal("reply_t01"),
  type: z.literal("reply"),
  enabled: z.boolean().default(true),
  prompt: z.string().trim().max(300).default("Leave a love note or message for me..."),
  enabledFormats: z.object({
    text: z.boolean().default(true),
    photo: z.boolean().default(true),
    voice: z.boolean().default(true),
  }).default({ text: true, photo: true, voice: true }),
  maxChars: z.number().int().min(50).max(5000).default(2000),
  maxPhotos: z.number().int().min(0).max(5).default(3),
  maxVoiceSeconds: z.number().int().min(10).max(180).default(60),
  allowMultiple: z.boolean().default(false),
  quickReactions: z.array(z.string().max(20)).max(10).default(["❤️", "🥰", "🥺", "✨", "💋"]),
});

export const submitReplySchema = z.object({
  client_id: uuid,
  author_name: z.string().trim().max(100).default("My Love"),
  message: z.string().trim().max(2000).default(""),
  reaction: z.string().trim().max(20).optional().nullable(),
  media_items: z.array(z.object({
    url: mediaReference,
    public_id: text(200),
    type: z.enum(["image", "video"]),
    media_type: z.enum(["photo", "voice"]).optional(),
    duration: z.number().nonnegative().max(3600).optional(),
  })).max(4).default([]),
}).superRefine((val, ctx) => {
  if (!val.message && val.media_items.length === 0 && !val.reaction) {
    ctx.addIssue({ code: "custom", message: "A message, reaction, or attachment is required to reply." });
  }
});

export const invitationSlotSchema = z.object({
  id: z.string().trim().max(100),
  start_time: z.string().trim().max(100),
  end_time: z.string().trim().max(100).optional(),
  label: z.string().trim().max(200).optional(),
});

export const invitationToolSchema = z.object({
  id: z.literal("invitation_t02"),
  type: z.literal("invitation"),
  enabled: z.boolean().default(true),
  activity: z.string().trim().min(1).max(200),
  invitationMessage: z.string().trim().max(1000).default("Will you be my date?"),
  format: z.enum(["in_person", "online"]).default("in_person"),
  location: z.string().trim().max(300).optional(),
  meetingUrl: z.string().trim().url().max(1000).optional().or(z.literal("")),
  reservationUrl: z.string().trim().url().max(1000).optional().or(z.literal("")),
  deadline: z.string().trim().max(100).optional(),
  senderPrivateNotes: z.string().trim().max(2000).optional(),
  dateMode: z.enum(["fixed", "slots", "date_only"]).default("slots"),
  durationMinutes: z.number().int().min(15).max(1440).default(120),
  senderTimezone: z.string().trim().max(100).default("UTC"),
  proposedSlots: z.array(invitationSlotSchema).min(1).max(6).default([]),
  allowCounterproposal: z.boolean().default(true),
});

export const respondInvitationSchema = z.object({
  expected_revision: z.number().int().min(1),
  response_type: z.enum(["accepted", "counterproposed", "declined", "decide_later"]),
  chosen_slot: invitationSlotSchema.optional(),
  suggested_slot: invitationSlotSchema.optional(),
  partner_tz: z.string().trim().max(100).optional(),
  partner_note_text: z.string().trim().max(1000).optional(),
}).superRefine((val, ctx) => {
  if (val.response_type === "accepted" && !val.chosen_slot) {
    ctx.addIssue({ code: "custom", path: ["chosen_slot"], message: "Please select a date and time slot." });
  }
  if (val.response_type === "counterproposed" && !val.suggested_slot) {
    ctx.addIssue({ code: "custom", path: ["suggested_slot"], message: "Please propose an alternate date and time." });
  }
});

export const manageInvitationSchema = z.object({
  action_type: z.enum(["accept_counterproposal", "reschedule", "cancel", "update_notes"]),
  new_slots: z.array(invitationSlotSchema).min(1).max(6).optional(),
  new_private_notes: z.string().trim().max(2000).optional(),
});

export const pollOptionSchema = z.object({
  id: z.string().trim().max(100),
  text: z.string().trim().min(1).max(200),
  image_url: z.string().trim().max(1000).optional(),
  icon: z.string().trim().max(50).optional(),
});

export const pollToolSchema = z.object({
  id: z.literal("poll_t04"),
  type: z.literal("poll"),
  enabled: z.boolean().default(true),
  question: z.string().trim().min(1).max(250),
  description: z.string().trim().max(500).optional().default(""),
  selectionMode: z.enum(["partner_chooses", "both_vote"]).default("both_vote"),
  allowMultiple: z.boolean().default(false),
  allowCustomSuggestion: z.boolean().default(true),
  closingTime: z.string().trim().max(100).optional(),
  options: z.array(pollOptionSchema).min(2).max(6),
});

export const votePollSchema = z.object({
  expected_revision: z.number().int().min(1),
  selected_option_ids: z.array(z.string().trim().max(100)).max(6).default([]),
  custom_suggestion_text: z.string().trim().max(200).optional(),
  is_creator_vote: z.boolean().default(false),
}).superRefine((val, ctx) => {
  if (val.selected_option_ids.length === 0 && !val.custom_suggestion_text) {
    ctx.addIssue({ code: "custom", message: "Please select an option or suggest a new one." });
  }
});

export const resolvePollSchema = z.object({
  agreed_option_id: z.string().trim().min(1).max(100),
});

export const questionItemSchema = z.object({
  id: z.string().trim().min(1).max(50),
  prompt: z.string().trim().min(1).max(250),
  type: z.enum(["short", "long", "choice"]),
  options: z.array(z.string().trim().min(1).max(100)).min(2).max(6).optional(),
  skippable: z.boolean().default(true),
  sender_answer: z.string().trim().max(1000).optional().nullable(),
  reveal_mode: z.enum(["always", "after_partner_answers", "hidden"]).default("after_partner_answers"),
});

export const questionToolSchema = z.object({
  id: z.literal("question_t05"),
  type: z.literal("question"),
  enabled: z.boolean().default(true),
  title: z.string().trim().min(1).max(100).default("A few questions for you"),
  description: z.string().trim().max(500).optional().default(""),
  questions: z.array(questionItemSchema).min(1).max(5),
});

export const questionAnswerItemSchema = z.object({
  question_id: z.string().trim().min(1).max(50),
  answer_text: z.string().trim().max(2000).optional().nullable(),
  selected_choice: z.string().trim().max(200).optional().nullable(),
  skipped: z.boolean().default(false),
});

export const saveQuestionDraftSchema = z.object({
  expected_revision: z.number().int().min(1),
  answers: z.record(z.string(), questionAnswerItemSchema),
  is_creator: z.boolean().default(false),
});

export const submitQuestionAnswersSchema = z.object({
  expected_revision: z.number().int().min(1),
  answers: z.record(z.string(), questionAnswerItemSchema),
  is_creator: z.boolean().default(false),
});

export const revealQuestionItemSchema = z.object({
  id: z.string().trim().min(1).max(50),
  prompt: z.string().trim().min(1).max(250),
});

export const revealToolSchema = z.object({
  id: z.literal("reveal_t06"),
  type: z.literal("private_reveal"),
  enabled: z.boolean().default(true),
  prompt: z.string().trim().min(1).max(250),
  description: z.string().trim().max(500).optional().default(""),
  questions: z.array(revealQuestionItemSchema).max(5).optional().default([]),
  countdownSeconds: z.number().int().min(1).max(10).optional().default(3),
});

export const saveRevealDraftSchema = z.object({
  expected_revision: z.number().int().min(1),
  answers: z.record(z.string(), z.string().trim().max(2000)),
  is_creator: z.boolean().default(false),
});

export const lockRevealAnswerSchema = z.object({
  expected_revision: z.number().int().min(1),
  answers: z.record(z.string(), z.string().trim().min(1).max(2000)),
  is_creator: z.boolean().default(false),
});

export const withdrawRevealAnswerSchema = z.object({
  expected_revision: z.number().int().min(1),
  is_creator: z.boolean().default(false),
});

export const confirmRevealSchema = z.object({
  expected_revision: z.number().int().min(1),
  is_creator: z.boolean().default(false),
});

export const scratchRevealToolSchema = z.object({
  id: z.literal("scratch_t07"),
  type: z.literal("scratch_reveal"),
  enabled: z.boolean().default(true),
  coverTitle: z.string().trim().min(1).max(100).default("A secret surprise for you"),
  coverInstruction: z.string().trim().max(200).optional().default("Scratch with your finger or mouse to reveal"),
  contentType: z.enum(["message", "photo", "invitation"]).default("message"),
  hiddenMessage: z.string().trim().max(1000).optional(),
  hiddenPhotoUrl: z.string().trim().max(1000).optional(),
  invitationRefId: z.string().trim().max(100).optional(),
}).superRefine((val, ctx) => {
  if (val.contentType === "message" && (!val.hiddenMessage || val.hiddenMessage.trim().length === 0)) {
    ctx.addIssue({ code: "custom", path: ["hiddenMessage"], message: "Please provide a hidden message to reveal." });
  }
  if (val.contentType === "photo" && (!val.hiddenPhotoUrl || val.hiddenPhotoUrl.trim().length === 0)) {
    ctx.addIssue({ code: "custom", path: ["hiddenPhotoUrl"], message: "Please provide an image URL to reveal." });
  }
});

export const couponToolSchema = z.object({
  id: z.literal("coupon_t08"),
  type: z.literal("coupon"),
  enabled: z.boolean().default(true),
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).default(""),
  expiresAt: z.string().trim().max(100).nullable().optional(),
  enableScheduling: z.boolean().default(false),
});

export const requestCouponSchema = z.object({
  expected_revision: z.number().int().min(1),
  request_note: z.string().trim().max(500).optional(),
  preferred_date: z.string().trim().max(100).optional(),
});

export const manageCouponSchema = z.object({
  action: z.enum(["accept", "fulfill", "cancel", "decline_request"]),
  expected_revision: z.number().int().min(1),
  cancel_reason: z.string().trim().max(200).optional(),
});

export const openWhenEnvelopeSchema = z.object({
  id: z.string().trim().min(1).max(50),
  occasion: z.string().trim().min(1).max(100),
  message: z.string().trim().min(1).max(2000),
  mediaUrl: z.string().trim().max(1000).optional(),
  mediaType: z.enum(["image", "video"]).optional(),
});

export const openWhenToolSchema = z.object({
  id: z.literal("open_when_t09"),
  type: z.literal("open_when"),
  enabled: z.boolean().default(true),
  title: z.string().trim().min(1).max(100).default("Open When Letters"),
  description: z.string().trim().max(500).default("These envelopes open whenever you choose — for comfort, love, and sweet memories."),
  attachReply: z.boolean().default(true),
  envelopes: z.array(openWhenEnvelopeSchema).min(1).max(3),
});

export const openEnvelopeSchema = z.object({
  envelope_id: z.string().trim().min(1).max(50),
});

export const storyCardSchema = z.object({
  id: z.string().trim().min(1).max(50),
  photo_url: z.string().trim().min(1).max(1000),
  caption: z.string().trim().min(1).max(500),
  date: z.string().trim().max(100).optional().nullable(),
  order: z.number().int().min(0).max(10),
});

export const ourStoryToolSchema = z.object({
  id: z.literal("our_story_t10"),
  type: z.literal("our_story"),
  enabled: z.boolean().default(true),
  title: z.string().trim().min(1).max(100).default("Our Story Memories"),
  description: z.string().trim().max(500).default("A journey through our favorite moments together."),
  cards: z.array(storyCardSchema).min(3, "Please provide at least 3 story cards.").max(5, "You can add at most 5 story cards."),
});

export const submitPartnerSideSchema = z.object({
  author_name: z.string().trim().max(50).optional(),
  caption: z.string().trim().min(1, "Please enter a caption for your photo.").max(500),
  photo_url: z.string().trim().min(1, "Please provide a photo for your side of the story.").max(1000),
  date: z.string().trim().max(100).optional().nullable(),
  asset_id: uuid.optional().nullable(),
});

export const bucketListItemSchema = z.object({
  id: z.string().trim().min(1).max(50),
  title: z.string().trim().min(1, "Idea title is required").max(120, "Title cannot exceed 120 characters"),
  note: z.string().trim().max(500).optional().nullable(),
  status: z.enum(["wished", "planning", "completed"]).default("wished"),
  created_by: z.enum(["creator", "partner"]).default("creator"),
  created_at: z.string().optional(),
  creator_interested: z.boolean().optional().default(false),
  partner_interested: z.boolean().optional().default(false),
  planning_started_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
  memory_photo_url: z.string().trim().max(1000).optional().nullable(),
  memory_note: z.string().trim().max(500).optional().nullable(),
});

export const bucketListToolSchema = z.object({
  id: z.literal("bucket_list_t11"),
  type: z.literal("bucket_list"),
  enabled: z.boolean().default(true),
  title: z.string().trim().min(1).max(100).default("Mini Couple Bucket List"),
  description: z.string().trim().max(500).default("Adventures and dreams we want to experience together."),
  items: z.array(bucketListItemSchema).min(1, "Please provide at least 1 bucket list idea.").max(5, "You can start with up to 5 bucket list ideas."),
});

export const mutateBucketListSchema = z.object({
  action: z.enum(["add_item", "toggle_interest", "plan_item", "complete_item", "attach_memory", "revert_status"]),
  item_id: z.string().trim().min(1).max(50).optional().nullable(),
  payload: z.object({
    title: z.string().trim().min(1).max(120).optional(),
    note: z.string().trim().max(500).optional().nullable(),
    status: z.enum(["wished", "planning", "completed"]).optional(),
    memory_photo_url: z.string().trim().max(1000).optional().nullable(),
    memory_note: z.string().trim().max(500).optional().nullable(),
    asset_id: uuid.optional().nullable(),
  }).optional().default({}),
});

export const templateInputSchema = z.object({
  order_id: z.uuid().nullable().optional(),
  scene_index: z.number().int().min(0).max(10), partner_name: z.string().trim().min(1).max(50),
  partner_from: z.string().trim().min(1).max(50), message: z.string().trim().min(1).max(1000),
  sender_gender: z.enum(["male", "female"]).default("male"), music_track: musicSchema.nullable().optional(),
  theme: z.string().trim().max(50).optional(),
  has_media: z.boolean(), media_items: z.array(z.object({ url: mediaReference, public_id: text(200), type: z.enum(["image", "video"]) })).max(11),
  expiry_hours: z.number().int().min(1).max(720),
  tools: z.array(z.record(z.string(), z.unknown())).max(15).optional().default([]),
}).superRefine((value, ctx) => {
  if (value.media_items.filter(m => m.type === "video").length > 1 || value.media_items.filter(m => m.type === "image").length > 10) {
    ctx.addIssue({ code: "custom", path: ["media_items"], message: "Use at most ten photos and one video." });
  }
});

export function safeRedirect(value: string | null | undefined, fallback = "/") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f]/.test(value)) return fallback;
  return value;
}

export function mediaIds(value: unknown): string[] {
  const found = new Set<string>();
  function visit(item: unknown) {
    if (typeof item === "string") {
      const match = item.match(/^\/api\/media\/([0-9a-f-]{36})$/i);
      if (match && uuid.safeParse(match[1]).success) found.add(match[1]);
    } else if (Array.isArray(item)) item.forEach(visit);
    else if (item && typeof item === "object") Object.values(item).forEach(visit);
  }
  visit(value);
  return [...found];
}
