ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'premium';

CREATE OR REPLACE FUNCTION public.apply_premium_product_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.user_id AND role::text = 'premium') THEN
    NEW.approval_status := 'approved';
    NEW.rejection_reason := NULL;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.apply_premium_product_approval() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER products_premium_auto_approval BEFORE INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.apply_premium_product_approval();