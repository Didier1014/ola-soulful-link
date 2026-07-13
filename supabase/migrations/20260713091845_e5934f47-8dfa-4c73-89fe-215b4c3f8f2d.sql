
CREATE TABLE public.merchant_api_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  api_key_prefix text,
  endpoint text NOT NULL,
  method text NOT NULL,
  origin text,
  referer text,
  origin_host text,
  user_agent text,
  ip text,
  status_code int,
  duration_ms int,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.merchant_api_calls TO authenticated;
GRANT ALL ON public.merchant_api_calls TO service_role;
ALTER TABLE public.merchant_api_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read api calls" ON public.merchant_api_calls
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX merchant_api_calls_user_created_idx ON public.merchant_api_calls (user_id, created_at DESC);
CREATE INDEX merchant_api_calls_host_idx ON public.merchant_api_calls (origin_host);
