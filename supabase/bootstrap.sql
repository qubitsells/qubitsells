-- Fresh installations only: prerequisite tables omitted by the historical migrations.
-- Existing projects receive these additive definitions in the security migration too.
CREATE TABLE IF NOT EXISTS public.couples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_code TEXT UNIQUE NOT NULL,
  partner_1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_2_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  anniversary_date DATE,
  couple_motto TEXT,
  couple_anthem JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (partner_1_id IS DISTINCT FROM partner_2_id)
);
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES public.couples(id) ON DELETE SET NULL,
  full_name TEXT, partner_nickname TEXT,
  love_language TEXT, partner_love_language TEXT,
  email_reminders BOOLEAN DEFAULT true, vibe_reminders BOOLEAN DEFAULT true,
  couple_anthem JSONB, updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES public.couples(id) ON DELETE SET NULL,
  title TEXT NOT NULL, price_estimate NUMERIC, is_purchased BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
