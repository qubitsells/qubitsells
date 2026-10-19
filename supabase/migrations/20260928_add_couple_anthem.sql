-- Migration: Add couple_anthem to couples table
-- This stores the YouTube couple anthem track and timestamp chosen by the couple.

ALTER TABLE IF EXISTS couples
  ADD COLUMN IF NOT EXISTS couple_anthem JSONB DEFAULT NULL;

ALTER TABLE IF EXISTS profiles
  ADD COLUMN IF NOT EXISTS couple_anthem JSONB DEFAULT NULL;
