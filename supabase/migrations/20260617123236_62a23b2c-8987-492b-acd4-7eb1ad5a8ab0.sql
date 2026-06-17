CREATE TABLE public.integration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  transaction_id uuid,
  provider text NOT NULL,
  status_code int,
  ok boolean,
  request_payload jsonb,
  response_body text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_integration_logs_tx ON public.integration_logs(transaction_id);
CREATE INDEX idx_integration_logs_user_created ON public.integration_logs(user_id, created_at DESC);
GRANT SELECT ON public.integration_logs TO authenticated;
GRANT ALL ON public.integration_logs TO service_role;
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own integration logs" ON public.integration_logs FOR SELECT TO authenticated USING (user_id = auth.uid());