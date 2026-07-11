
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, business_name, whatsapp, city, account_type, phone, api_key, birth_date, province, neighborhood, support_phone, support_phone2)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    COALESCE(NEW.raw_user_meta_data->>'business_name',''),
    NEW.raw_user_meta_data->>'whatsapp',
    NEW.raw_user_meta_data->>'city',
    COALESCE(NEW.raw_user_meta_data->>'account_type','person'),
    NEW.raw_user_meta_data->>'whatsapp',
    public.gen_api_key(),
    NULLIF(NEW.raw_user_meta_data->>'birth_date','')::date,
    NEW.raw_user_meta_data->>'province',
    NEW.raw_user_meta_data->>'neighborhood',
    NULLIF(NEW.raw_user_meta_data->>'support_phone',''),
    NULLIF(NEW.raw_user_meta_data->>'support_phone2','')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;
