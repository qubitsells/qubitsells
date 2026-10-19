-- ============================================================
-- Migration: Add spotify_track to couple_templates
-- Run in Supabase SQL Editor if needed:
-- https://supabase.com/dashboard/project/_/sql
-- ============================================================

ALTER TABLE public.couple_templates
  ADD COLUMN IF NOT EXISTS spotify_track JSONB DEFAULT NULL;
