-- Migration: Re-create or upgrade time_capsules table for Bonded couple sanctuary
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- Never drop saved memories when applying or re-running schema setup.

-- 2. Create time_capsules table with full schema & foreign keys matching your couples table
CREATE TABLE IF NOT EXISTS public.time_capsules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'milestone',
  sealed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  unlock_date TEXT NOT NULL,
  is_locked BOOLEAN NOT NULL DEFAULT true,
  seal_color TEXT NOT NULL DEFAULT 'rose',
  seal_stamp TEXT NOT NULL DEFAULT '💌',
  folders JSONB DEFAULT '[]'::jsonb,
  text_notes JSONB DEFAULT '[]'::jsonb,
  voice_notes JSONB DEFAULT '[]'::jsonb,
  video_notes JSONB DEFAULT '[]'::jsonb,
  letter JSONB NOT NULL DEFAULT '{}'::jsonb,
  voice_note JSONB,
  video_note JSONB,
  polaroids JSONB NOT NULL DEFAULT '[]'::jsonb,
  predictions JSONB DEFAULT '[]'::jsonb,
  secret_token JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.time_capsules ENABLE ROW LEVEL SECURITY;

-- 4. Clean up any existing policies
DROP POLICY IF EXISTS "Users can read their couple time capsules" ON public.time_capsules;
DROP POLICY IF EXISTS "Users can insert time capsules" ON public.time_capsules;
DROP POLICY IF EXISTS "Users can update their time capsules" ON public.time_capsules;
DROP POLICY IF EXISTS "Users can delete their time capsules" ON public.time_capsules;

-- 5. Create RLS Policies
CREATE POLICY "Users can read their couple time capsules"
ON public.time_capsules
FOR SELECT
USING (
  auth.uid() = creator_id
  OR couple_id IN (
    SELECT id FROM public.couples
    WHERE partner_1_id = auth.uid() OR partner_2_id = auth.uid()
  )
  OR couple_id IS NULL
);

CREATE POLICY "Users can insert time capsules"
ON public.time_capsules
FOR INSERT
WITH CHECK (
  auth.uid() = creator_id OR auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update their time capsules"
ON public.time_capsules
FOR UPDATE
USING (
  auth.uid() = creator_id
  OR couple_id IN (
    SELECT id FROM public.couples
    WHERE partner_1_id = auth.uid() OR partner_2_id = auth.uid()
  )
  OR couple_id IS NULL
);

CREATE POLICY "Users can delete their time capsules"
ON public.time_capsules
FOR DELETE
USING (
  auth.uid() = creator_id
  OR couple_id IN (
    SELECT id FROM public.couples
    WHERE partner_1_id = auth.uid() OR partner_2_id = auth.uid()
  )
);

-- 6. Enable Realtime publication safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'time_capsules'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.time_capsules;
  END IF;
END $$;
