
CREATE TABLE public.product_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  ip_hash text,
  user_agent text,
  referrer text
);
CREATE INDEX product_clicks_product_id_idx ON public.product_clicks(product_id);
GRANT INSERT ON public.product_clicks TO anon, authenticated;
GRANT ALL ON public.product_clicks TO service_role;
ALTER TABLE public.product_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can insert clicks" ON public.product_clicks
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admins read clicks" ON public.product_clicks
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.product_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changes jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX product_history_product_id_idx ON public.product_history(product_id, changed_at DESC);
GRANT SELECT ON public.product_history TO service_role;
GRANT ALL ON public.product_history TO service_role;
ALTER TABLE public.product_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read history" ON public.product_history
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "owner reads own history" ON public.product_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.log_product_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  diff jsonb := '{}'::jsonb;
  cols text[] := ARRAY['name','description','price_mzn','cover_url','delivery_url','thank_you_url','product_type','digital_file_path','discount_no_balance','sms_sender_id','sms_template','pixel_id','utimify_id','lawtracker_id','support_phone','slug','active'];
  c text;
  old_v jsonb;
  new_v jsonb;
  old_row jsonb := to_jsonb(OLD);
  new_row jsonb := to_jsonb(NEW);
BEGIN
  FOREACH c IN ARRAY cols LOOP
    old_v := old_row -> c;
    new_v := new_row -> c;
    IF old_v IS DISTINCT FROM new_v THEN
      diff := diff || jsonb_build_object(c, jsonb_build_object('old', old_v, 'new', new_v));
    END IF;
  END LOOP;
  IF diff <> '{}'::jsonb THEN
    INSERT INTO public.product_history(product_id, user_id, changes)
    VALUES (NEW.id, NEW.user_id, diff);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER t_products_history
AFTER UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.log_product_changes();
