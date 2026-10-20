
/** Serialised FreeTouse track stored in the DB */
export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  thumbnailUrl: string;
  mp3Url: string;
  duration: number;
  /** Start offset in seconds chosen by the creator */
  startAt: number;
  /** 300-point waveform (0–100) for the visualizer */
  waveform: number[];
  type?: "freetouse" | "youtube";
  youtubeId?: string;
  youtubeUrl?: string;
}

export interface MediaItem {
  url: string;
  public_id: string;
  type: "image" | "video";
  thumbnail?: string;
}

export interface ReplyToolConfig {
  id: "reply_t01";
  type: "reply";
  enabled: boolean;
  prompt: string;
  enabledFormats: {
    text: boolean;
    photo: boolean;
    voice: boolean;
  };
  maxChars: number;
  maxPhotos: number;
  maxVoiceSeconds: number;
  allowMultiple: boolean;
  quickReactions: string[];
}

export interface InvitationSlot {
  id: string;
  start_time: string; // ISO 8601 or YYYY-MM-DD
  end_time?: string;
  label?: string;
}

export type InvitationFormat = "in_person" | "online";
export type InvitationDateMode = "fixed" | "slots" | "date_only";
export type InvitationStatus =
  | "proposed"
  | "counterproposed"
  | "confirmed"
  | "declined"
  | "deferred"
  | "cancelled";

export interface InvitationToolConfig {
  id: "invitation_t02";
  type: "invitation";
  enabled: boolean;
  activity: string;
  invitationMessage: string;
  format: InvitationFormat;
  location?: string;
  meetingUrl?: string;
  reservationUrl?: string;
  deadline?: string;
  senderPrivateNotes?: string;
  dateMode: InvitationDateMode;
  durationMinutes: number;
  senderTimezone: string;
  proposedSlots: InvitationSlot[];
  allowCounterproposal: boolean;
}

export interface PollOption {
  id: string;
  text: string;
  image_url?: string;
  icon?: string;
}

export interface PollCustomSuggestion {
  id: string;
  text: string;
  suggested_by: "creator" | "partner";
  created_at: string;
}

export type PollSelectionMode = "partner_chooses" | "both_vote";
export type PollStatus = "open" | "closed" | "resolved";

export interface PollToolConfig {
  id: "poll_t04";
  type: "poll";
  enabled: boolean;
  question: string;
  description?: string;
  selectionMode: PollSelectionMode;
  allowMultiple: boolean;
  allowCustomSuggestion: boolean;
  closingTime?: string;
  options: PollOption[];
}

export type QuestionType = "short" | "long" | "choice";

export interface QuestionItem {
  id: string;
  prompt: string;
  type: QuestionType;
  options?: string[];
  skippable: boolean;
  sender_answer?: string | null;
  reveal_mode?: "always" | "after_partner_answers" | "hidden";
}

export interface QuestionToolConfig {
  id: "question_t05";
  type: "question";
  enabled: boolean;
  title: string;
  description?: string;
  questions: QuestionItem[];
}

export interface QuestionAnswerItem {
  question_id: string;
  answer_text?: string;
  selected_choice?: string;
  skipped: boolean;
}

export interface QuestionSubmission {
  answers: Record<string, QuestionAnswerItem>;
  submitted_at?: string | null;
}

export interface TemplateQuestionCard {
  id: string;
  template_id: string;
  tool_id: string;
  title: string;
  description: string;
  questions: QuestionItem[];
  revision: number;
  status: "open" | "completed";
  has_partner_submitted?: boolean;
  created_at: string;
  updated_at: string;
}

export interface RevealQuestionItem {
  id: string;
  prompt: string;
}

export type RevealStatus = "open" | "waiting" | "eligible" | "revealed" | "cancelled";

export interface RevealToolConfig {
  id: "reveal_t06";
  type: "private_reveal";
  enabled: boolean;
  prompt: string;
  description?: string;
  questions?: RevealQuestionItem[];
  countdownSeconds?: number;
}

export interface TemplatePrivateReveal {
  id: string;
  template_id: string;
  tool_id: string;
  prompt: string;
  description: string;
  questions: RevealQuestionItem[];
  status: RevealStatus;
  revision: number;
  countdown_seconds: number;
  creator_locked: boolean;
  partner_locked: boolean;
  is_eligible: boolean;
  is_revealed: boolean;
  creator_ready?: boolean;
  partner_ready?: boolean;
  revealed_at?: string | null;
  my_draft?: Record<string, string> | null;
  my_answer?: Record<string, string> | null;
  partner_answer?: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}

export interface ScratchRevealToolConfig {
  id: "scratch_t07";
  type: "scratch_reveal";
  enabled: boolean;
  coverTitle: string;
  coverInstruction?: string;
  contentType: "message" | "photo" | "invitation";
  hiddenMessage?: string;
  hiddenPhotoUrl?: string;
  invitationRefId?: string;
}

export type CouponStatus =
  | "available"
  | "requested"
  | "accepted"
  | "fulfilled"
  | "cancelled"
  | "expired";

export interface CouponToolConfig {
  id: "coupon_t08";
  type: "coupon";
  enabled: boolean;
  title: string;
  description: string;
  expiresAt?: string | null;
  enableScheduling?: boolean;
}

export interface TemplateCoupon {
  id: string;
  template_id: string;
  tool_id: string;
  title: string;
  description: string;
  expires_at: string | null;
  enable_scheduling: boolean;
  status: CouponStatus;
  revision: number;
  requested_at: string | null;
  request_note: string | null;
  preferred_date: string | null;
  accepted_at: string | null;
  fulfilled_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpenWhenEnvelope {
  id: string;
  occasion: string;
  message: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
}

export interface OpenWhenToolConfig {
  id: "open_when_t09";
  type: "open_when";
  enabled: boolean;
  title: string;
  description: string;
  attachReply?: boolean;
  envelopes: OpenWhenEnvelope[];
}

export interface TemplateOpenWhenLetters {
  id: string;
  template_id: string;
  tool_id: string;
  title: string;
  description: string;
  attach_reply: boolean;
  envelopes: OpenWhenEnvelope[];
  opened_envelopes: Record<string, { opened_at: string }>;
  revision: number;
  created_at: string;
  updated_at: string;
}

export interface StoryCard {
  id: string;
  photo_url: string;
  caption: string;
  date?: string | null;
  order: number;
}

export interface StoryPartnerContribution {
  id: string;
  author_name: string;
  photo_url: string;
  caption: string;
  date?: string | null;
  created_at: string;
}

export interface OurStoryToolConfig {
  id: "our_story_t10";
  type: "our_story";
  enabled: boolean;
  title: string;
  description?: string;
  cards: StoryCard[];
}

export interface TemplateOurStory {
  id: string;
  template_id: string;
  tool_id: string;
  title: string;
  description: string;
  cards: StoryCard[];
  partner_contribution?: StoryPartnerContribution | null;
  revision: number;
  created_at: string;
  updated_at: string;
}

export type BucketItemStatus = "wished" | "planning" | "completed";

export interface BucketListItem {
  id: string;
  title: string;
  note?: string | null;
  status: BucketItemStatus;
  created_by: "creator" | "partner";
  created_at?: string;
  creator_interested?: boolean;
  partner_interested?: boolean;
  planning_started_at?: string | null;
  completed_at?: string | null;
  memory_photo_url?: string | null;
  memory_note?: string | null;
}

export interface BucketListToolConfig {
  id: "bucket_list_t11";
  type: "bucket_list";
  enabled: boolean;
  title: string;
  description?: string;
  items: BucketListItem[];
}

export interface TemplateBucketList {
  id: string;
  template_id: string;
  tool_id: string;
  title: string;
  description: string;
  items: BucketListItem[];
  revision: number;
  created_at: string;
  updated_at: string;
}

export type TemplateTool =
  | ReplyToolConfig
  | InvitationToolConfig
  | PollToolConfig
  | QuestionToolConfig
  | RevealToolConfig
  | ScratchRevealToolConfig
  | CouponToolConfig
  | OpenWhenToolConfig
  | OurStoryToolConfig
  | BucketListToolConfig;

export interface TemplatePoll {
  id: string;
  template_id: string;
  tool_id: string;
  question: string;
  description: string;
  selection_mode: PollSelectionMode;
  allow_multiple: boolean;
  allow_custom_suggestion: boolean;
  closing_time?: string | null;
  options: PollOption[];
  custom_suggestions: PollCustomSuggestion[];
  creator_voted?: boolean;
  partner_voted?: boolean;
  creator_votes: string[];
  partner_votes: string[];
  resolved_option_id?: string | null;
  status: PollStatus;
  revision: number;
  created_at: string;
  updated_at: string;
}

export interface TemplateInvitation {
  id: string;
  template_id: string;
  tool_id: string;
  activity: string;
  invitation_message: string;
  format: InvitationFormat;
  location?: string | null;
  meeting_url?: string | null;
  reservation_url?: string | null;
  deadline?: string | null;
  sender_private_notes?: string | null;
  date_mode: InvitationDateMode;
  duration_minutes: number;
  sender_timezone: string;
  proposed_slots: InvitationSlot[];
  allow_counterproposal: boolean;
  status: InvitationStatus;
  revision: number;
  selected_slot?: InvitationSlot | null;
  counterproposal_slot?: InvitationSlot | null;
  recipient_response?: string | null;
  recipient_timezone?: string | null;
  recipient_note?: string | null;
  agreed_revision?: number | null;
  responded_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateReply {
  id: string;
  tool_id: string;
  author_name: string;
  message: string;
  reaction?: string | null;
  media_items: Array<Omit<MediaItem, "type"> & { type: "image" | "video" | "audio"; duration?: number; format?: string }>;
  created_at: string;
}

export interface AnimeTemplate {
  id: string;
  short_code: string;
  theme: string;
  sender_gender?: "male" | "female" | string;
  music_track?: MusicTrack | null;
  scene_index: number;
  partner_name: string;
  partner_from: string;
  message: string;
  has_media: boolean;
  media_items: MediaItem[];
  expires_at: string;
  view_count: number;
  created_at: string;
  tools?: TemplateTool[];
}

export interface CreateTemplateInput {
  scene_index: number;
  partner_name: string;
  partner_from: string;
  sender_gender?: "male" | "female";
  theme?: string;
  music_track?: MusicTrack | null;
  message: string;
  has_media: boolean;
  media_items: MediaItem[];
  expiry_hours: number; // 24 | 72 | 168 | 720 | custom
  tools?: TemplateTool[];
}

/** Fetch through the guarded short-link API; browser database enumeration is disabled. */
export async function fetchTemplate(code: string): Promise<AnimeTemplate | null> {
  const response = await fetch("/api/templates/" + encodeURIComponent(code), { cache: "no-store" });
  if (response.status === 404 || response.status === 410) return null;
  if (!response.ok) throw new Error("This template is temporarily unavailable.");
  const data = await response.json();
  return data.template as AnimeTemplate;
}

/**
 * Human-readable time remaining until expiry.
 */
export function getTimeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";

  const hours = Math.floor(diff / 1000 / 60 / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h remaining`;
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

export interface CreatorTemplateItem {
  id: string;
  short_code: string;
  partner_name: string;
  partner_from: string;
  theme: string;
  scene_index: number;
  created_at: string;
  expires_at: string;
  view_count: number;
  tools: TemplateTool[];
  is_expired: boolean;
  replies_purged: boolean;
  replies: TemplateReply[];
  manage_token?: string | null;
  invitation?: {
    id: string;
    status: InvitationStatus;
    activity_title: string;
    sender_message: string;
    duration_minutes: number;
    location_type: "in_person" | "online";
    location_detail?: string;
    response_deadline?: string;
    fixed_start_time?: string;
    confirmed_slot?: InvitationSlot | null;
    counter_proposal_slot?: InvitationSlot | null;
    date_mode?: InvitationDateMode;
    sender_timezone?: string | null;
    recipient_timezone?: string | null;
    responded_at?: string | null;
    partner_counter_note?: string;
    partner_counter_proposed_at?: string;
    partner_response_status?: string;
    updated_at: string;
  } | null;
  poll?: {
    id: string;
    question: string;
    selection_mode: "partner_chooses" | "both_vote";
    options: PollOption[];
    partner_votes: string[];
    creator_votes: string[];
    resolved_option_id?: string;
    status: "open" | "closed" | "resolved";
    custom_suggestions?: PollCustomSuggestion[];
    updated_at: string;
  } | null;
  questions?: {
    id: string;
    title: string;
    questions: QuestionItem[];
    partner_submission?: {
      answers: Record<string, QuestionAnswerItem>;
      is_draft: boolean;
      submitted_at?: string;
    };
  } | null;
  reveal?: {
    id: string;
    prompt: string;
    status: "open" | "waiting" | "eligible" | "revealed" | "cancelled";
    creator_locked_at?: string;
    partner_locked_at?: string;
    revealed_at?: string;
    questions?: RevealQuestionItem[];
    partner_answer?: Record<string, string> | null;
  } | null;
  coupon?: {
    id: string;
    title: string;
    description: string;
    status: "available" | "requested" | "accepted" | "fulfilled" | "cancelled" | "expired";
    requested_at?: string;
    accepted_at?: string;
    fulfilled_at?: string;
    partner_request_note?: string;
    preferred_date?: string | null;
    cancelled_at?: string | null;
    cancel_reason?: string | null;
  } | null;
  open_when?: {
    id: string;
    title: string;
    envelopes: Array<{
      id: string;
      label: string;
      opened_at?: string | null;
    }>;
  } | null;
  our_story?: {
    id: string;
    title: string;
    cards_count: number;
    partner_photo_url?: string | null;
    partner_caption?: string | null;
    partner_contributed_at?: string | null;
    partner_author_name?: string | null;
    partner_memory_date?: string | null;
  } | null;
  bucket_list?: {
    id: string;
    title: string;
    items: Array<{
      id: string;
      title: string;
      note?: string | null;
      status: "wished" | "planning" | "completed";
      created_by: "creator" | "partner";
      created_at?: string;
      creator_interested?: boolean;
      partner_interested?: boolean;
      planning_started_at?: string | null;
      completed_at?: string | null;
      memory_photo_url?: string | null;
      memory_note?: string | null;
    }>;
  } | null;
}
