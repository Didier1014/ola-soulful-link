ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS merchant_fee_percent numeric NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS merchant_fee_fixed numeric NOT NULL DEFAULT 15;