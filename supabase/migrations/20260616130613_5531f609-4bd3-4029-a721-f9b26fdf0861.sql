
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'external'
    CHECK (product_type IN ('external','digital','physical','lead')),
  ADD COLUMN IF NOT EXISTS thank_you_url text,
  ADD COLUMN IF NOT EXISTS discount_no_balance numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS digital_file_path text,
  ADD COLUMN IF NOT EXISTS sms_sender_id text,
  ADD COLUMN IF NOT EXISTS sms_template text,
  ADD COLUMN IF NOT EXISTS config jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.integration_settings
  ADD COLUMN IF NOT EXISTS push_custom jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS pushcut jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS utmify jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS mozesms jsonb NOT NULL DEFAULT '{}'::jsonb;
