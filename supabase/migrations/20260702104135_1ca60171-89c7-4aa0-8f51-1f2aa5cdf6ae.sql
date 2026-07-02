
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS payout_mpesa_phone text,
  ADD COLUMN IF NOT EXISTS payout_emola_phone text;

UPDATE public.profiles
   SET payout_mpesa_phone = '876936061',
       payout_emola_phone = '845716035'
 WHERE id = 'b6afb77c-9fa9-4c3b-a2f5-ee6793abe4fd';

UPDATE public.profiles
   SET payout_mpesa_phone = '852062772',
       payout_emola_phone = '869388518'
 WHERE id = 'acde505a-6343-48cc-905a-e2dbf8eda21b';
