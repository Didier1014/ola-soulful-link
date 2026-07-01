ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS support_phone text,
  ADD COLUMN IF NOT EXISTS support_phone2 text;