import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CouponEvent, CreatorTemplateItem, InvitationSlot, PollCustomSuggestion, PollOption, QuestionAnswerItem, QuestionItem, RevealQuestionItem, ScratchRevealToolConfig, TemplateReply, TemplateTool } from "@/lib/supabase/coupleTemplates";

type Row = Record<string, unknown>;
const object = (value: unknown): Row => value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
const text = (value: unknown) => typeof value === "string" ? value : "";
const optionalText = (value: unknown) => typeof value === "string" ? value : undefined;
const list = <T>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];

function mediaUrl(value: unknown, code: string): string {
  const url = text(value);
  if (!url.startsWith("/api/media/")) return url;
  const parsed = new URL(url, "https://media.invalid");
  parsed.searchParams.set("template", code);
  return `${parsed.pathname}${parsed.search}`;
}

// Each query is scoped to template IDs already authorized below. Never return
// receipt hashes, drafts, or the raw table rows to the browser.
const selections = {
  template_replies: "template_id,id,tool_id,author_name,message,reaction,media_items,created_at",
  template_invitations: "template_id,id,activity,invitation_message,status,duration_minutes,format,location,meeting_url,reservation_url,deadline,date_mode,sender_timezone,recipient_timezone,selected_slot,counterproposal_slot,recipient_note,recipient_response,recipient_activities,recipient_idea,available_slots,proposed_slots,revision,responded_at,updated_at",
  template_polls: "template_id,id,question,selection_mode,options,partner_votes,creator_votes,resolved_option_id,status,custom_suggestions,updated_at",
  template_question_cards: "template_id,id,tool_id,title,questions",
  template_question_submissions: "template_id,tool_id,answers,question_snapshot,is_draft,submitted_at,author_role",
  template_private_reveals: "template_id,id,prompt,questions,status,creator_locked_at,partner_locked_at,revealed_at,partner_answer",
  template_coupons: "template_id,id,title,description,status,expires_at,history,requested_at,accepted_at,fulfilled_at,request_note,preferred_date,cancelled_at,cancel_reason",
  template_scratch_reveals: "template_id,id,opened_at,method,config_snapshot",
  template_open_when_letters: "template_id,id,title,envelopes,opened_envelopes",
  template_our_story: "template_id,id,title,cards,partner_contribution",
  template_bucket_list: "template_id,id,title,items",
} as const;
type Table = keyof typeof selections;

async function readAll(readPage: (offset: number) => PromiseLike<{ data: unknown; error: unknown }>): Promise<Row[]> {
  const rows: Row[] = [];
  for (let offset = 0; ; offset += 500) {
    const result = await readPage(offset);
    if (result.error) throw new Error("Receiver responses unavailable");
    const page = list<Row>(result.data);
    rows.push(...page);
    if (page.length < 500) return rows;
  }
}

export async function loadCreatorCenter(db: SupabaseClient, actorId: string | null, manageHashes: string[], now = Date.now()): Promise<CreatorTemplateItem[]> {
  const hashes = manageHashes.filter(hash => /^[a-f0-9]{64}$/.test(hash));
  if (!actorId && !hashes.length) return [];
  const access = [actorId ? `owner_id.eq.${actorId}` : "", hashes.length ? `deletion_hash.in.(${hashes.join(",")})` : ""].filter(Boolean);
  const data = await readAll(offset => db.from("couple_templates")
    .select("id,short_code,partner_name,partner_from,theme,scene_index,created_at,expires_at,view_count,tools,deleting,owner_id,deletion_hash")
    .or(access.join(",")).order("created_at", { ascending: false }).order("id").range(offset, offset + 499));
  // A public short code is never proof of creator access.
  const rows = list<Row>(data).filter(row => (actorId && row.owner_id === actorId) || hashes.includes(text(row.deletion_hash)));
  const activeIds = rows.filter(row => !row.deleting && Date.parse(text(row.expires_at)) > now).map(row => text(row.id));
  const records = {} as Record<Table, Row[]>;
  if (activeIds.length) {
    await Promise.all((Object.keys(selections) as Table[]).map(async table => {
      const found: Row[] = [];
      // Bound URL length and page through replies rather than silently accepting
      // the provider's default row limit.
      for (let start = 0; start < activeIds.length; start += 100) {
        const ids = activeIds.slice(start, start + 100);
        found.push(...await readAll(offset => {
          let query = db.from(table).select(selections[table]).in("template_id", ids);
          if (table === "template_question_submissions") query = query.eq("author_role", "partner").eq("is_draft", false);
          return query.order("id").range(offset, offset + 499);
        }));
      }
      records[table] = found;
    }));
  }
  const forTemplate = (table: Table, id: string) => (records[table] || []).filter(row => row.template_id === id);
  return rows.map(row => {
    const id = text(row.id);
    const code = text(row.short_code);
    const expired = Boolean(row.deleting) || !(Date.parse(text(row.expires_at)) > Math.max(now, Date.now()));
    const base: CreatorTemplateItem = {
      id, short_code: code, partner_name: text(row.partner_name), partner_from: text(row.partner_from), theme: text(row.theme),
      scene_index: Number(row.scene_index) || 0, created_at: text(row.created_at), expires_at: text(row.expires_at),
      view_count: Number(row.view_count) || 0, tools: list<TemplateTool>(row.tools), is_expired: expired, replies_purged: expired,
      replies: [], invitation: null, poll: null, questions: null, reveal: null, coupon: null, open_when: null, scratch: null, our_story: null, bucket_list: null,
    };
    if (expired) return base;
    const first = (table: Table) => forTemplate(table, id)[0];
    const inv = first("template_invitations"), poll = first("template_polls"), questions = first("template_question_cards");
    const reveal = first("template_private_reveals"), coupon = first("template_coupons"), letters = first("template_open_when_letters");
    const story = first("template_our_story"), bucket = first("template_bucket_list");
    const scratch = first("template_scratch_reveals");
    const scratchConfig = (scratch?.config_snapshot || base.tools?.find(tool => tool.type === "scratch_reveal" && tool.enabled)) as ScratchRevealToolConfig | undefined;
    const submission = forTemplate("template_question_submissions", id)
      .filter(value => value.author_role === "partner" && value.is_draft === false && value.tool_id === questions?.tool_id)
      .sort((a, b) => text(b.submitted_at).localeCompare(text(a.submitted_at)))[0];
    const contribution = object(story?.partner_contribution);
    return {
      ...base,
      replies: forTemplate("template_replies", id).sort((a, b) => text(b.created_at).localeCompare(text(a.created_at))).map(reply => ({
        id: text(reply.id), tool_id: text(reply.tool_id), author_name: text(reply.author_name), message: text(reply.message),
        reaction: optionalText(reply.reaction), created_at: text(reply.created_at),
        media_items: list<TemplateReply["media_items"][number]>(reply.media_items).map(media => ({ ...media, url: mediaUrl(media.url, code) })),
      })),
      invitation: inv ? {
        id: text(inv.id), activity_title: text(inv.activity), sender_message: text(inv.invitation_message), status: inv.status as NonNullable<CreatorTemplateItem["invitation"]>["status"],
        duration_minutes: Number(inv.duration_minutes), location_type: inv.format as "in_person" | "online", location_detail: optionalText(inv.location),
        response_deadline: optionalText(inv.deadline), confirmed_slot: inv.selected_slot ? object(inv.selected_slot) as unknown as InvitationSlot : null,
        counter_proposal_slot: inv.counterproposal_slot ? object(inv.counterproposal_slot) as unknown as InvitationSlot : null,
        date_mode: inv.date_mode as NonNullable<CreatorTemplateItem["invitation"]>["date_mode"], sender_timezone: optionalText(inv.sender_timezone),
        recipient_timezone: optionalText(inv.recipient_timezone), partner_counter_note: optionalText(inv.recipient_note),
        recipient_activities: list<string>(inv.recipient_activities), recipient_idea: optionalText(inv.recipient_idea), available_slots: list<InvitationSlot>(inv.available_slots),
        proposed_slots: list<InvitationSlot>(inv.proposed_slots), meeting_url: optionalText(inv.meeting_url), reservation_url: optionalText(inv.reservation_url), revision: Number(inv.revision) || 1,
        partner_response_status: optionalText(inv.recipient_response), responded_at: optionalText(inv.responded_at), updated_at: text(inv.updated_at),
      } : null,
      poll: poll ? {
        id: text(poll.id), question: text(poll.question), selection_mode: poll.selection_mode as "partner_chooses" | "both_vote",
        options: list<PollOption>(poll.options).map(option => ({ ...option, image_url: option.image_url ? mediaUrl(option.image_url, code) : undefined })),
        partner_votes: list<string>(poll.partner_votes), creator_votes: list<string>(poll.creator_votes), resolved_option_id: optionalText(poll.resolved_option_id),
        status: poll.status as NonNullable<CreatorTemplateItem["poll"]>["status"], custom_suggestions: list<PollCustomSuggestion>(poll.custom_suggestions), updated_at: text(poll.updated_at),
      } : null,
      questions: questions ? {
        id: text(questions.id), title: text(questions.title), questions: list<QuestionItem>(submission?.question_snapshot || questions.questions),
        ...(submission ? { partner_submission: { answers: object(submission.answers) as Record<string, QuestionAnswerItem>, is_draft: false, submitted_at: optionalText(submission.submitted_at) } } : {}),
      } : null,
      reveal: reveal ? {
        id: text(reveal.id), prompt: text(reveal.prompt), questions: list<RevealQuestionItem>(reveal.questions),
        status: reveal.status as NonNullable<CreatorTemplateItem["reveal"]>["status"], creator_locked_at: optionalText(reveal.creator_locked_at),
        partner_locked_at: optionalText(reveal.partner_locked_at), revealed_at: optionalText(reveal.revealed_at),
        partner_answer: reveal.status === "revealed" ? object(reveal.partner_answer) as Record<string, string> : null,
      } : null,
      coupon: coupon ? {
        id: text(coupon.id), title: text(coupon.title), description: text(coupon.description), status: (['available','requested'].includes(text(coupon.status)) && coupon.expires_at && Date.parse(text(coupon.expires_at)) <= now ? 'expired' : coupon.status) as NonNullable<CreatorTemplateItem["coupon"]>["status"],
        expires_at: optionalText(coupon.expires_at), history: list<CouponEvent>(coupon.history),
        requested_at: optionalText(coupon.requested_at), accepted_at: optionalText(coupon.accepted_at), fulfilled_at: optionalText(coupon.fulfilled_at),
        partner_request_note: optionalText(coupon.request_note), preferred_date: optionalText(coupon.preferred_date),
        cancelled_at: optionalText(coupon.cancelled_at), cancel_reason: optionalText(coupon.cancel_reason),
      } : null,
      open_when: letters ? {
        id: text(letters.id), title: text(letters.title), envelopes: [...list<Row>(letters.envelopes), ...Object.entries(object(letters.opened_envelopes)).filter(([key, value]) => object(value).envelope && !list<Row>(letters.envelopes).some(envelope => envelope.id === key)).map(([,value]) => object(object(value).envelope))].map(envelope => {
          const opened = object(object(letters.opened_envelopes)[text(envelope.id)]), original = opened.envelope ? object(opened.envelope) : envelope;
          return {id: text(envelope.id), label: text(original.occasion) || text(original.label), opened_at: optionalText(opened.opened_at),
            message: optionalText(original.message), media_url: mediaUrl(original.mediaUrl, code) || undefined, media_type: original.mediaType as "image" | "video" | undefined};
        }),
      } : null,
      scratch: scratchConfig ? {config: scratchConfig, opened_at: optionalText(scratch?.opened_at), method: scratch?.method as "scratch" | "button" | "keyboard" | undefined} : null,
      our_story: story ? {
        id: text(story.id), title: text(story.title), cards_count: list(story.cards).length,
        partner_photo_url: mediaUrl(contribution.photo_url, code) || null, partner_caption: optionalText(contribution.caption),
        partner_author_name: optionalText(contribution.author_name), partner_memory_date: optionalText(contribution.date),
        partner_contributed_at: optionalText(contribution.created_at) || optionalText(contribution.contributed_at),
      } : null,
      bucket_list: bucket ? {
        id: text(bucket.id), title: text(bucket.title), items: list<NonNullable<CreatorTemplateItem["bucket_list"]>["items"][number]>(bucket.items)
          .map(entry => ({ ...entry, memory_photo_url: mediaUrl(entry.memory_photo_url, code) || null, history: entry.history?.map(event => ({...event,photo_url:mediaUrl(event.photo_url,code)||null})) })),
      } : null,
    };
  });
}
