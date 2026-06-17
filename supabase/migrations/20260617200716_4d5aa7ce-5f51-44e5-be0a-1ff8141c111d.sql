
-- 1) Unique partial index: at most ONE successful integration log per (transaction, provider)
CREATE UNIQUE INDEX IF NOT EXISTS integration_logs_unique_success
  ON public.integration_logs (transaction_id, provider)
  WHERE ok = true;

-- 2) Per-sale processing lock table: first webhook for a sale claims it,
-- concurrent duplicates fail the insert and skip processing.
CREATE TABLE IF NOT EXISTS public.sale_processing_locks (
  transaction_id uuid PRIMARY KEY,
  locked_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.sale_processing_locks TO service_role;

ALTER TABLE public.sale_processing_locks ENABLE ROW LEVEL SECURITY;

-- No public policies: only service_role (which bypasses RLS) touches this table.
