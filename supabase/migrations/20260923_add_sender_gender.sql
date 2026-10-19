-- ============================================================
-- Migration: Add sender_gender to couple_templates
-- Run in Supabase SQL Editor if needed:
-- https://supabase.com/dashboard/project/_/sql
-- ============================================================

ALTER TABLE public.couple_templates
  ADD COLUMN IF NOT EXISTS sender_gender TEXT NOT NULL DEFAULT 'male';
