
-- Helper: gerar client_id e api_key
CREATE OR REPLACE FUNCTION public.gen_merchant_client_id()
RETURNS text LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT 'CLI_' || upper(substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 6))
$$;

CREATE OR REPLACE FUNCTION public.gen_merchant_api_key()
RETURNS text LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT 'mrc_live_' || encode(extensions.gen_random_bytes(24), 'hex')
$$;

-- 1. merchants
CREATE TABLE public.merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  payout_mpesa text,
  payout_emola text,
  client_id text NOT NULL UNIQUE DEFAULT public.gen_merchant_client_id(),
  api_key text NOT NULL UNIQUE DEFAULT public.gen_merchant_api_key(),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT merchants_at_least_one_phone CHECK (
    payout_mpesa IS NOT NULL OR payout_emola IS NOT NULL
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.merchants TO authenticated;
GRANT ALL ON public.merchants TO service_role;

ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their merchants"
  ON public.merchants FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER merchants_touch_updated_at
  BEFORE UPDATE ON public.merchants
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX merchants_owner_idx ON public.merchants(owner_id);

-- 2. merchant_transactions
CREATE TABLE public.merchant_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payer_phone text NOT NULL,
  method text NOT NULL CHECK (method IN ('mpesa','emola')),
  gross numeric(12,2) NOT NULL,
  platform_fee numeric(12,2) NOT NULL,
  rlx_cost numeric(12,2) NOT NULL,
  owner_profit numeric(12,2) NOT NULL,
  merchant_net numeric(12,2) NOT NULL,
  provider_phone text NOT NULL,
  merchant_phone text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed')),
  rlx_txid text,
  rlx_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.merchant_transactions TO authenticated;
GRANT ALL ON public.merchant_transactions TO service_role;

ALTER TABLE public.merchant_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view their merchant tx"
  ON public.merchant_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX merchant_tx_merchant_idx ON public.merchant_transactions(merchant_id, created_at DESC);
CREATE INDEX merchant_tx_owner_idx ON public.merchant_transactions(owner_id, created_at DESC);

-- 3. Seed: pré-carregar Gercio e Race para o primeiro admin existente
DO $$
DECLARE
  admin_uid uuid;
BEGIN
  SELECT user_id INTO admin_uid FROM public.user_roles WHERE role = 'admin' LIMIT 1;
  IF admin_uid IS NULL THEN
    SELECT id INTO admin_uid FROM auth.users ORDER BY created_at LIMIT 1;
  END IF;
  IF admin_uid IS NOT NULL THEN
    INSERT INTO public.merchants (owner_id, name, payout_mpesa, payout_emola, client_id)
    VALUES
      (admin_uid, 'Gercio Sitoe', '845716035', '876936061', 'CLI_GRC001'),
      (admin_uid, 'Race Armindo Felix', '858484777', '879009661', 'CLI_RAC002')
    ON CONFLICT (client_id) DO NOTHING;
  END IF;
END $$;
