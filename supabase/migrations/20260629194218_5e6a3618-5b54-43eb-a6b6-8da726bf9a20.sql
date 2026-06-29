
CREATE TABLE IF NOT EXISTS public.platform_config (
  id text PRIMARY KEY DEFAULT 'config',
  gateway_mode text NOT NULL DEFAULT 'rlx',
  profit_payout_mpesa text,
  profit_payout_emola text,
  test_mode text NOT NULL DEFAULT 'merchant' CHECK (test_mode IN ('merchant','general')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_config_singleton CHECK (id = 'config')
);

GRANT SELECT, INSERT, UPDATE ON public.platform_config TO authenticated;
GRANT ALL ON public.platform_config TO service_role;

ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read platform_config" ON public.platform_config
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update platform_config" ON public.platform_config
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert platform_config" ON public.platform_config
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.platform_config (id, gateway_mode, profit_payout_mpesa, profit_payout_emola, test_mode)
VALUES ('config', 'rlx', '847389419', '875844372', 'merchant')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
ALTER TABLE public.merchant_transactions ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS transactions_is_test_idx ON public.transactions(is_test) WHERE is_test = false;
CREATE INDEX IF NOT EXISTS merchant_transactions_is_test_idx ON public.merchant_transactions(is_test) WHERE is_test = false;
