-- Migration: Add couple seal mode support to time capsules
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- 1. Add seal_mode column to time_capsules (solo = only creator, couple = dual consent)
ALTER TABLE public.time_capsules
  ADD COLUMN IF NOT EXISTS seal_mode TEXT NOT NULL DEFAULT 'solo'
    CHECK (seal_mode IN ('solo', 'couple'));

-- 2. Create capsule_seal_requests table (tracks dual-consent sealing + unlock voting)
CREATE TABLE IF NOT EXISTS public.capsule_seal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capsule_id UUID NOT NULL REFERENCES public.time_capsules(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  unlock_vote_requester BOOLEAN NOT NULL DEFAULT false,
  unlock_vote_partner BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.capsule_seal_requests ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if re-running
DROP POLICY IF EXISTS "Couple members can read their seal requests" ON public.capsule_seal_requests;
DROP POLICY IF EXISTS "Requester can insert seal requests" ON public.capsule_seal_requests;
DROP POLICY IF EXISTS "Couple members can update their seal requests" ON public.capsule_seal_requests;
DROP POLICY IF EXISTS "Requester can delete their seal requests" ON public.capsule_seal_requests;

-- 5. RLS Policies
CREATE POLICY "Couple members can read their seal requests"
ON public.capsule_seal_requests
FOR SELECT
USING (
  auth.uid() = requester_id OR auth.uid() = partner_id
);

CREATE POLICY "Requester can insert seal requests"
ON public.capsule_seal_requests
FOR INSERT
WITH CHECK (
  auth.uid() = requester_id
);

CREATE POLICY "Couple members can update their seal requests"
ON public.capsule_seal_requests
FOR UPDATE
USING (
  auth.uid() = requester_id OR auth.uid() = partner_id
);

CREATE POLICY "Requester can delete their seal requests"
ON public.capsule_seal_requests
FOR DELETE
USING (
  auth.uid() = requester_id
);

-- 6. Enable Realtime for capsule_seal_requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'capsule_seal_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.capsule_seal_requests;
  END IF;
END $$;
