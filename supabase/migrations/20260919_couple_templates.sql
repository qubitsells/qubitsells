-- ============================================================
-- Migration: Anime Couple Templates
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- ============================================================

-- 1. Create couple_templates table
CREATE TABLE IF NOT EXISTS public.couple_templates (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code   TEXT         UNIQUE NOT NULL,
  theme        TEXT         NOT NULL DEFAULT 'anime',
  scene_index  INT          NOT NULL DEFAULT 0,
  partner_name TEXT         NOT NULL DEFAULT 'My Love',
  partner_from TEXT         NOT NULL DEFAULT 'Your Love',
  message      TEXT         NOT NULL DEFAULT '',
  has_media    BOOLEAN      NOT NULL DEFAULT false,
  media_items  JSONB        NOT NULL DEFAULT '[]'::jsonb,
  expires_at   TIMESTAMPTZ  NOT NULL DEFAULT (NOW() + INTERVAL '1 day'),
  view_count   INT          NOT NULL DEFAULT 0,
  creator_hash TEXT,        -- SHA-256 of IP, never raw IP stored
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 2. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_couple_templates_short_code
  ON public.couple_templates (short_code);

CREATE INDEX IF NOT EXISTS idx_couple_templates_expires_at
  ON public.couple_templates (expires_at);

CREATE INDEX IF NOT EXISTS idx_couple_templates_creator_hash
  ON public.couple_templates (creator_hash, created_at);

-- 3. Enable Row Level Security
ALTER TABLE public.couple_templates ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if re-running
DROP POLICY IF EXISTS "Public read non-expired templates"   ON public.couple_templates;
DROP POLICY IF EXISTS "Anyone can create templates"         ON public.couple_templates;

-- 5. RLS Policies

-- Public can read any non-expired template (for the /t/[code] viewer page)
CREATE POLICY "Public read non-expired templates"
  ON public.couple_templates
  FOR SELECT
  USING (expires_at > NOW());

-- Anyone can create a template (rate-limiting is enforced at the API layer)
CREATE POLICY "Anyone can create templates"
  ON public.couple_templates
  FOR INSERT
  WITH CHECK (true);

-- No public UPDATE or DELETE (those go through server-side API with service key)

-- ============================================================
-- 6. Helper RPC Functions (SECURITY DEFINER — run as DB owner)
-- ============================================================

-- Safely increment view count for a non-expired template
CREATE OR REPLACE FUNCTION public.increment_template_views(code TEXT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.couple_templates
  SET view_count = view_count + 1
  WHERE short_code = code
    AND expires_at > NOW();
$$;

-- Return expired templates (for the cleanup API to process)
CREATE OR REPLACE FUNCTION public.get_expired_templates()
RETURNS TABLE(id UUID, short_code TEXT, media_items JSONB)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, short_code, media_items
  FROM public.couple_templates
  WHERE expires_at <= NOW();
$$;

-- Rate limit check: returns true if under limit (< 5 templates per hour per IP hash)
CREATE OR REPLACE FUNCTION public.check_template_rate_limit(ip_hash TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) < 5
  FROM public.couple_templates
  WHERE creator_hash = ip_hash
    AND created_at > NOW() - INTERVAL '1 hour';
$$;

-- Delete expired templates by IDs and return their media_items for Cloudinary cleanup
CREATE OR REPLACE FUNCTION public.delete_expired_templates()
RETURNS TABLE(id UUID, media_items JSONB)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.couple_templates
  WHERE expires_at <= NOW()
  RETURNING id, media_items;
$$;

-- ============================================================
-- 7. Enable Realtime (optional — skip if not needed)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'couple_templates'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_templates;
  END IF;
END $$;
