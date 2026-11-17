ALTER TABLE public.international_payments ADD COLUMN IF NOT EXISTS customer_phone text;
CREATE TABLE public.seller_meta_settings (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, scope_key text NOT NULL DEFAULT 'account', pixel_id text NOT NULL, token_ciphertext text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,scope_key));
GRANT ALL ON public.seller_meta_settings TO service_role;
ALTER TABLE public.seller_meta_settings ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.zar_withdrawal_requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, amount_minor bigint NOT NULL CHECK(amount_minor > 0), currency text NOT NULL DEFAULT 'ZAR' CHECK(currency='ZAR'), destination text NOT NULL, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','rejected')), transfer_reference text, note text, created_at timestamptz NOT NULL DEFAULT now(), decided_at timestamptz);
GRANT SELECT ON public.zar_withdrawal_requests TO authenticated;
GRANT ALL ON public.zar_withdrawal_requests TO service_role;
ALTER TABLE public.zar_withdrawal_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY zar_request_owner_read ON public.zar_withdrawal_requests FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE OR REPLACE FUNCTION public.request_zar_withdrawal(p_amount_minor bigint,p_destination text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid := auth.uid(); ceiling bigint; reserved bigint; result uuid;
BEGIN
IF uid IS NULL THEN RAISE EXCEPTION 'Autenticação necessária'; END IF;
IF p_amount_minor IS NULL OR p_amount_minor <= 0 OR length(trim(p_destination)) < 5 OR length(p_destination)>500 THEN RAISE EXCEPTION 'Pedido inválido'; END IF;
PERFORM pg_advisory_xact_lock(hashtextextended(uid::text, 19));
SELECT coalesce(sum(amount_minor-fee_minor),0) INTO ceiling FROM public.international_payments WHERE user_id=uid AND currency='ZAR' AND status='paid';
SELECT coalesce(sum(amount_minor),0) INTO reserved FROM public.zar_withdrawal_requests WHERE user_id=uid AND status IN ('pending','paid');
IF p_amount_minor > greatest(0,ceiling-reserved) THEN RAISE EXCEPTION 'O pedido excede as vendas líquidas ZAR ainda não solicitadas'; END IF;
INSERT INTO public.zar_withdrawal_requests(user_id,amount_minor,destination) VALUES(uid,p_amount_minor,trim(p_destination)) RETURNING id INTO result;
RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.request_zar_withdrawal(bigint,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.request_zar_withdrawal(bigint,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.decide_zar_withdrawal(p_id uuid,p_status text,p_reference text,p_note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso restrito'; END IF;
IF p_status NOT IN ('paid','rejected') OR p_status IS NULL THEN RAISE EXCEPTION 'Estado inválido'; END IF;
IF p_status='paid' AND (p_reference IS NULL OR length(trim(p_reference))<3 OR length(p_reference)>200) THEN RAISE EXCEPTION 'Indique a referência da transferência ZAR realizada'; END IF;
UPDATE public.zar_withdrawal_requests SET status=p_status,transfer_reference=CASE WHEN p_status='paid' THEN trim(p_reference) ELSE NULL END,note=left(p_note,500),decided_at=now() WHERE id=p_id AND status='pending';
IF NOT FOUND THEN RAISE EXCEPTION 'Pedido já decidido ou não encontrado'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.decide_zar_withdrawal(uuid,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.decide_zar_withdrawal(uuid,text,text,text) TO authenticated;