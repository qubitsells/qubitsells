-- ============================================================
-- Migration: Creator Center & Ephemeral Reply Retention
-- ============================================================

-- 0. Ensure all tool tables exist
CREATE TABLE IF NOT EXISTS public.template_open_when_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.couple_templates(id) ON DELETE CASCADE,
  tool_id TEXT NOT NULL DEFAULT 'open_when_t09',
  title TEXT NOT NULL DEFAULT 'Open When Letters',
  description TEXT NOT NULL DEFAULT '',
  attach_reply BOOLEAN NOT NULL DEFAULT true,
  envelopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  opened_envelopes JSONB NOT NULL DEFAULT '{}'::jsonb,
  revision INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, tool_id)
);
ALTER TABLE public.template_open_when_letters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.template_open_when_letters FROM PUBLIC, anon, authenticated;

-- 1. Performance Indexes for Creator Lookup
CREATE INDEX IF NOT EXISTS idx_couple_templates_owner_id
  ON public.couple_templates(owner_id)
  WHERE owner_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_couple_templates_deletion_hash
  ON public.couple_templates(deletion_hash)
  WHERE deletion_hash IS NOT NULL;

-- 2. Master RPC to fetch creator center templates and received partner replies
-- Ephemeral rule strictly enforced: If a template is expired (expires_at <= now() OR deleting),
-- all replies and partner response data are wiped/omitted from the returned payload.
CREATE OR REPLACE FUNCTION public.bonded_get_creator_center_data(
  p_actor_id UUID DEFAULT NULL,
  p_manage_token_hashes TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_short_codes TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  v_templates JSONB;
BEGIN
  -- Mark any overdue templates as deleting immediately if expired
  UPDATE public.couple_templates
  SET deleting = true
  WHERE expires_at <= now() AND NOT deleting;

  SELECT coalesce(jsonb_agg(row_data ORDER BY (row_data->>'created_at') DESC), '[]'::jsonb)
  INTO v_templates
  FROM (
    SELECT
      jsonb_build_object(
        'id', t.id,
        'short_code', t.short_code,
        'partner_name', t.partner_name,
        'partner_from', t.partner_from,
        'theme', t.theme,
        'scene_index', t.scene_index,
        'created_at', t.created_at,
        'expires_at', t.expires_at,
        'view_count', t.view_count,
        'tools', coalesce(t.tools, '[]'::jsonb),
        'is_expired', (t.expires_at <= now() OR t.deleting),
        'replies_purged', (t.expires_at <= now() OR t.deleting),
        -- Only populate responses if template is active:
        'replies', CASE
          WHEN (t.expires_at <= now() OR t.deleting) THEN '[]'::jsonb
          ELSE (
            SELECT coalesce(jsonb_agg(jsonb_build_object(
              'id', r.id,
              'tool_id', r.tool_id,
              'author_name', r.author_name,
              'message', r.message,
              'reaction', r.reaction,
              'media_items', r.media_items,
              'created_at', r.created_at
            ) ORDER BY r.created_at DESC), '[]'::jsonb)
            FROM public.template_replies r
            WHERE r.template_id = t.id
          )
        END,
        'invitation', CASE
          WHEN (t.expires_at <= now() OR t.deleting) THEN NULL
          ELSE (
            SELECT jsonb_build_object(
              'id', inv.id,
              'status', inv.status,
              'activity', inv.activity,
              'invitation_message', inv.invitation_message,
              'duration_minutes', inv.duration_minutes,
              'format', inv.format,
              'location', inv.location,
              'deadline', inv.deadline,
              'selected_slot', inv.selected_slot,
              'counterproposal_slot', inv.counterproposal_slot,
              'recipient_note', inv.recipient_note,
              'recipient_response', inv.recipient_response,
              'responded_at', inv.responded_at,
              'updated_at', inv.updated_at
            )
            FROM public.template_invitations inv
            WHERE inv.template_id = t.id
            LIMIT 1
          )
        END,
        'poll', CASE
          WHEN (t.expires_at <= now() OR t.deleting) THEN NULL
          ELSE (
            SELECT jsonb_build_object(
              'id', p.id,
              'question', p.question,
              'selection_mode', p.selection_mode,
              'options', p.options,
              'partner_votes', p.partner_votes,
              'creator_votes', p.creator_votes,
              'resolved_option_id', p.resolved_option_id,
              'status', p.status,
              'custom_suggestions', p.custom_suggestions,
              'updated_at', p.updated_at
            )
            FROM public.template_polls p
            WHERE p.template_id = t.id
            LIMIT 1
          )
        END,
        'questions', CASE
          WHEN (t.expires_at <= now() OR t.deleting) THEN NULL
          ELSE (
            SELECT jsonb_build_object(
              'id', qc.id,
              'title', qc.title,
              'questions', qc.questions,
              'partner_submission', (
                SELECT jsonb_build_object(
                  'answers', qs.answers,
                  'is_draft', qs.is_draft,
                  'submitted_at', qs.submitted_at
                )
                FROM public.template_question_submissions qs
                WHERE qs.template_id = t.id
                  AND qs.author_role = 'partner'
                  AND qs.is_draft = false
                ORDER BY qs.submitted_at DESC
                LIMIT 1
              )
            )
            FROM public.template_question_cards qc
            WHERE qc.template_id = t.id
            LIMIT 1
          )
        END,
        'reveal', CASE
          WHEN (t.expires_at <= now() OR t.deleting) THEN NULL
          ELSE (
            SELECT jsonb_build_object(
              'id', rev.id,
              'prompt', rev.prompt,
              'status', rev.status,
              'creator_locked_at', rev.creator_locked_at,
              'partner_locked_at', rev.partner_locked_at,
              'revealed_at', rev.revealed_at,
              'partner_answer', CASE WHEN rev.status = 'revealed' THEN rev.partner_answer ELSE NULL END
            )
            FROM public.template_private_reveals rev
            WHERE rev.template_id = t.id
            LIMIT 1
          )
        END,
        'coupon', CASE
          WHEN (t.expires_at <= now() OR t.deleting) THEN NULL
          ELSE (
            SELECT jsonb_build_object(
              'id', cp.id,
              'title', cp.title,
              'description', cp.description,
              'status', cp.status,
              'requested_at', cp.requested_at,
              'accepted_at', cp.accepted_at,
              'fulfilled_at', cp.fulfilled_at,
              'partner_request_note', cp.request_note
            )
            FROM public.template_coupons cp
            WHERE cp.template_id = t.id
            LIMIT 1
          )
        END,
        'open_when', CASE
          WHEN (t.expires_at <= now() OR t.deleting) THEN NULL
          ELSE (
            SELECT jsonb_build_object(
              'id', ow.id,
              'title', ow.title,
              'envelopes', ow.envelopes,
              'opened_envelopes', ow.opened_envelopes
            )
            FROM public.template_open_when_letters ow
            WHERE ow.template_id = t.id
            LIMIT 1
          )
        END,
        'our_story', CASE
          WHEN (t.expires_at <= now() OR t.deleting) THEN NULL
          ELSE (
            SELECT jsonb_build_object(
              'id', os.id,
              'title', os.title,
              'cards_count', jsonb_array_length(os.cards),
              'partner_photo_url', os.partner_contribution->>'photo_url',
              'partner_caption', os.partner_contribution->>'caption',
              'partner_contributed_at', os.partner_contribution->>'contributed_at'
            )
            FROM public.template_our_story os
            WHERE os.template_id = t.id
            LIMIT 1
          )
        END,
        'bucket_list', CASE
          WHEN (t.expires_at <= now() OR t.deleting) THEN NULL
          ELSE (
            SELECT jsonb_build_object(
              'id', bl.id,
              'title', bl.title,
              'items', bl.items
            )
            FROM public.template_bucket_list bl
            WHERE bl.template_id = t.id
            LIMIT 1
          )
        END
      ) AS row_data
    FROM public.couple_templates t
    WHERE
      (
        (p_actor_id IS NOT NULL AND t.owner_id = p_actor_id)
        OR (
          cardinality(p_manage_token_hashes) > 0
          AND t.deletion_hash IS NOT NULL
          AND t.deletion_hash = ANY(p_manage_token_hashes)
        )
        OR (
          cardinality(p_short_codes) > 0
          AND t.short_code = ANY(p_short_codes)
          AND cardinality(p_manage_token_hashes) > 0
          AND t.deletion_hash IS NOT NULL
          AND t.deletion_hash = ANY(p_manage_token_hashes)
        )
      )
  ) sub;

  RETURN jsonb_build_object(
    'success', true,
    'templates', v_templates
  );
END $$;
