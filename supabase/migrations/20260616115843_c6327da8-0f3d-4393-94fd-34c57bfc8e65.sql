REVOKE EXECUTE ON FUNCTION public.gen_api_key() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gen_api_key() TO service_role;