CREATE OR REPLACE FUNCTION public.settle_pagar_payment(p_transaction_id uuid, p_event_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE t public.transactions%ROWTYPE;
BEGIN
 SELECT * INTO t FROM public.transactions WHERE id = p_transaction_id FOR UPDATE;
 IF NOT FOUND OR t.status <> 'pending' OR COALESCE(t.metadata->>'gateway', '') NOT IN ('pagar', 'venduspay') OR COALESCE((t.metadata->>'test_mode')::boolean, true) THEN RETURN false; END IF;
 UPDATE public.transactions SET status = 'paid', metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('gateway_event_id', p_event_id) WHERE id = t.id;
 UPDATE public.profiles SET balance_mzn = COALESCE(balance_mzn, 0) + t.net_mzn WHERE id = t.user_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Seller profile missing'; END IF;
 RETURN true;
END;
$function$;