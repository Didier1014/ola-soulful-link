CREATE OR REPLACE FUNCTION public.guard_payment_sms_template_editing()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  previous_template text := '';
  next_template text;
BEGIN
  IF TG_OP = 'UPDATE' THEN previous_template := coalesce(OLD.mozesms->>'template', ''); END IF;
  next_template := coalesce(NEW.mozesms->>'template', '');
  IF next_template IS DISTINCT FROM previous_template AND next_template <> ''
     AND NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'premium'))
     AND auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Apenas administradores e utilizadores premium podem editar o SMS pós-pagamento.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_payment_sms_template_editing BEFORE INSERT OR UPDATE OF mozesms ON public.integration_settings FOR EACH ROW EXECUTE FUNCTION public.guard_payment_sms_template_editing();