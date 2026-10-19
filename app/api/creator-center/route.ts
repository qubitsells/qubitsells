import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { adminClient, apiError, currentUser, HttpError, rateLimit } from "@/lib/server/security";
import { templateCode } from "@/lib/security/validation";
import { runOpportunisticCleanup } from "@/lib/cloudinaryCleanup";
import type { CreatorTemplateItem, MediaItem } from "@/lib/supabase/coupleTemplates";

export async function GET(request: Request) {
  try {
    await rateLimit(request, "creator-center-read", 60);

    const jar = await cookies();
    const user = await currentUser();

    const manageHashes = new Set<string>();
    const clientCodes = new Set<string>();

    // 1. Collect tokens from HTTP-only manage / delete cookies
    const allCookies = jar.getAll();
    for (const c of allCookies) {
      if (
        c.name.startsWith("bonded_template_manage_") ||
        c.name.startsWith("bonded_template_delete_")
      ) {
        if (/^[a-f0-9]{64}$/.test(c.value)) {
          manageHashes.add(createHash("sha256").update(c.value).digest("hex"));
        }
        const codePart = c.name.replace(/^bonded_template_(?:manage|delete)_/, "");
        if (templateCode.safeParse(codePart).success) {
          clientCodes.add(codePart);
        }
      }
    }

    // 2. Client query params (synced from localStorage if cookies expired or cross-browser)
    const url = new URL(request.url);
    const queryTokens = url.searchParams.get("tokens");
    const queryCodes = url.searchParams.get("codes");

    if (queryTokens) {
      const tokensList = queryTokens.split(",").slice(0, 50);
      for (const t of tokensList) {
        const trimmed = t.trim();
        if (/^[a-f0-9]{64}$/.test(trimmed)) {
          manageHashes.add(createHash("sha256").update(trimmed).digest("hex"));
        }
      }
    }

    if (queryCodes) {
      const codesList = queryCodes.split(",").slice(0, 50);
      for (const c of codesList) {
        const trimmed = c.trim();
        if (templateCode.safeParse(trimmed).success) {
          clientCodes.add(trimmed);
        }
      }
    }

    let rawTemplates: CreatorTemplateItem[] = [];

    // 3. Query the unified creator center RPC
    const { data, error } = await adminClient().rpc("bonded_get_creator_center_data", {
      p_actor_id: user?.id || null,
      p_manage_token_hashes: Array.from(manageHashes),
      p_short_codes: Array.from(clientCodes),
    });

    if (!error && data && Array.isArray(data.templates)) {
      rawTemplates = data.templates;
    } else {
      // Graceful fallback to table-level queries if RPC encounters missing schema cache
      const db = adminClient();
      let query = db
        .from("couple_templates")
        .select(
          "id, short_code, partner_name, partner_from, scene_index, theme, created_at, expires_at, view_count, tools, deletion_hash, owner_id"
        )
        .eq("deleting", false)
        .order("created_at", { ascending: false })
        .limit(50);

      const orConditions: string[] = [];
      if (user?.id) {
        orConditions.push(`owner_id.eq.${user.id}`);
      }
      if (manageHashes.size > 0) {
        orConditions.push(`deletion_hash.in.(${Array.from(manageHashes).join(",")})`);
      }
      if (clientCodes.size > 0) {
        orConditions.push(`short_code.in.(${Array.from(clientCodes).join(",")})`);
      }

      if (orConditions.length > 0) {
        query = query.or(orConditions.join(","));
        const { data: rows } = await query;

        const now = Date.now();
        rawTemplates = await Promise.all(
          (rows || []).map(async (t) => {
            const isExpired = new Date(t.expires_at).getTime() <= now;

            if (isExpired) {
              return {
                id: t.id,
                short_code: t.short_code,
                partner_name: t.partner_name,
                partner_from: t.partner_from,
                theme: t.theme,
                scene_index: t.scene_index,
                created_at: t.created_at,
                expires_at: t.expires_at,
                view_count: t.view_count,
                tools: Array.isArray(t.tools) ? t.tools : [],
                is_expired: true,
                replies_purged: true,
                replies: [],
                invitation: null,
                poll: null,
                questions: null,
                reveal: null,
                coupon: null,
                open_when: null,
                our_story: null,
                bucket_list: null,
              };
            }

            // Fetch active replies (ephemeral rule: only active templates get replies)
            const { data: repliesData } = await db
              .from("template_replies")
              .select("id, tool_id, author_name, message, reaction, media_items, created_at")
              .eq("template_id", t.id)
              .order("created_at", { ascending: false });

            // Fetch other tool interactions safely without failing if table is absent
            const [invRes, pollRes, qRes, revRes, cpRes, owRes, storyRes, bucketRes] =
              await Promise.allSettled([
                db.from("template_invitations").select("*").eq("template_id", t.id).maybeSingle(),
                db.from("template_polls").select("*").eq("template_id", t.id).maybeSingle(),
                db.from("template_question_cards").select("id, title, questions").eq("template_id", t.id).maybeSingle(),
                db.from("template_private_reveals").select("id, prompt, status, creator_locked_at, partner_locked_at, revealed_at, partner_answer").eq("template_id", t.id).maybeSingle(),
                db.from("template_coupons").select("*").eq("template_id", t.id).maybeSingle(),
                db.from("template_open_when_letters").select("id, title, envelopes").eq("template_id", t.id).maybeSingle(),
                db.from("template_our_story").select("id, title, cards, partner_contribution").eq("template_id", t.id).maybeSingle(),
                db.from("template_bucket_list").select("id, title, items").eq("template_id", t.id).maybeSingle(),
              ]);

            const inv = invRes.status === "fulfilled" ? invRes.value.data : null;
            const poll = pollRes.status === "fulfilled" ? pollRes.value.data : null;
            const qc = qRes.status === "fulfilled" ? qRes.value.data : null;
            const rev = revRes.status === "fulfilled" ? revRes.value.data : null;
            const cp = cpRes.status === "fulfilled" ? cpRes.value.data : null;
            const ow = owRes.status === "fulfilled" ? owRes.value.data : null;
            const story = storyRes.status === "fulfilled" ? storyRes.value.data : null;
            const bl = bucketRes.status === "fulfilled" ? bucketRes.value.data : null;

            return {
              id: t.id,
              short_code: t.short_code,
              partner_name: t.partner_name,
              partner_from: t.partner_from,
              theme: t.theme,
              scene_index: t.scene_index,
              created_at: t.created_at,
              expires_at: t.expires_at,
              view_count: t.view_count,
              tools: Array.isArray(t.tools) ? t.tools : [],
              is_expired: false,
              replies_purged: false,
              replies: Array.isArray(repliesData) ? repliesData : [],
              invitation: inv
                ? {
                    id: inv.id,
                    status: inv.status,
                    activity_title: inv.activity,
                    sender_message: inv.invitation_message,
                    duration_minutes: inv.duration_minutes,
                    location_type: inv.format,
                    location_detail: inv.location,
                    response_deadline: inv.deadline,
                    partner_counter_note: inv.recipient_note,
                    partner_response_status: inv.recipient_response,
                    updated_at: inv.updated_at,
                  }
                : null,
              poll: poll
                ? {
                    id: poll.id,
                    question: poll.question,
                    selection_mode: poll.selection_mode,
                    options: poll.options,
                    partner_votes: poll.partner_votes,
                    creator_votes: poll.creator_votes,
                    resolved_option_id: poll.resolved_option_id,
                    status: poll.status,
                    custom_suggestions: poll.custom_suggestions,
                    updated_at: poll.updated_at,
                  }
                : null,
              questions: qc
                ? {
                    id: qc.id,
                    title: qc.title,
                    questions: qc.questions,
                  }
                : null,
              reveal: rev
                ? {
                    id: rev.id,
                    prompt: rev.prompt,
                    status: rev.status,
                    creator_locked_at: rev.creator_locked_at,
                    partner_locked_at: rev.partner_locked_at,
                    revealed_at: rev.revealed_at,
                    partner_answer: rev.status === "revealed" ? rev.partner_answer : null,
                  }
                : null,
              coupon: cp
                ? {
                    id: cp.id,
                    title: cp.title,
                    description: cp.description,
                    status: cp.status,
                    requested_at: cp.requested_at,
                    accepted_at: cp.accepted_at,
                    fulfilled_at: cp.fulfilled_at,
                    partner_request_note: cp.request_note,
                  }
                : null,
              open_when: ow
                ? {
                    id: ow.id,
                    title: ow.title,
                    envelopes: ow.envelopes,
                  }
                : null,
              our_story: story
                ? {
                    id: story.id,
                    title: story.title,
                    cards_count: Array.isArray(story.cards) ? story.cards.length : 0,
                    partner_photo_url: story.partner_contribution?.photo_url || null,
                    partner_caption: story.partner_contribution?.caption || null,
                    partner_contributed_at: story.partner_contribution?.contributed_at || null,
                  }
                : null,
              bucket_list: bl
                ? {
                    id: bl.id,
                    title: bl.title,
                    items: bl.items,
                  }
                : null,
            };
          })
        );
      }
    }

    // Opportunistically clean up any expired templates & queued media
    runOpportunisticCleanup();

      // Ensure proxy URLs for any media attachments in replies
      const formattedTemplates = rawTemplates.map((item) => {
        // Find matching manage token cookie if present
        const cookieManage = jar.get(`bonded_template_manage_${item.short_code}`)?.value || null;

        const formattedReplies = (item.replies || []).map((r) => {
          const media = Array.isArray(r.media_items) ? r.media_items : [];
          const formattedMedia: MediaItem[] = media.map((m: MediaItem) => {
            let mediaUrl = typeof m.url === "string" ? m.url : "";
            if (mediaUrl.startsWith("/api/media/") && !mediaUrl.includes("template=")) {
              const sep = mediaUrl.includes("?") ? "&" : "?";
              mediaUrl = `${mediaUrl}${sep}template=${encodeURIComponent(item.short_code)}`;
            }
            return {
              ...m,
              url: mediaUrl,
            };
          });
          return {
            ...r,
            media_items: formattedMedia,
          };
        });

        // Ensure partner_photo_url has template code query param if needed
        let formattedOurStory = item.our_story;
        if (formattedOurStory?.partner_photo_url && typeof formattedOurStory.partner_photo_url === "string") {
          const pUrl = formattedOurStory.partner_photo_url;
          if (pUrl.startsWith("/api/media/") && !pUrl.includes("template=")) {
            const sep = pUrl.includes("?") ? "&" : "?";
            formattedOurStory = {
              ...formattedOurStory,
              partner_photo_url: `${pUrl}${sep}template=${encodeURIComponent(item.short_code)}`,
            };
          }
        }

        return {
          ...item,
          manage_token: cookieManage,
          replies: formattedReplies,
          our_story: formattedOurStory,
        };
      });

    return NextResponse.json(
      {
        success: true,
        user_id: user?.id || null,
        templates: formattedTemplates,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
          "Referrer-Policy": "no-referrer",
        },
      }
    );
  } catch (error) {
    return apiError(error);
  }
}
