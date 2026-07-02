ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending','approved','rejected')),
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Grandfather existing rows as approved
UPDATE public.products SET approval_status = 'approved' WHERE approval_status = 'pending' AND created_at < now();

CREATE INDEX IF NOT EXISTS products_approval_status_idx ON public.products(approval_status);