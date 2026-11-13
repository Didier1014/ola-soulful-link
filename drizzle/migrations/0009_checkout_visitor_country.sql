ALTER TABLE public.checkout_sessions ADD COLUMN country_code text;
ALTER TABLE public.checkout_sessions ADD CONSTRAINT checkout_country_code_valid CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$');
COMMENT ON COLUMN public.checkout_sessions.country_code IS 'Approximate visitor country from trusted edge geolocation; no raw IP retained.';