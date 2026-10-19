-- Migration: Add music_track to couple_templates
-- This stores the FreeTouse background music track chosen by the template creator.

ALTER TABLE couple_templates
  ADD COLUMN IF NOT EXISTS music_track JSONB DEFAULT NULL;
