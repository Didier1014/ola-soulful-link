ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_merchant boolean NOT NULL DEFAULT false;

-- Marcar os 3 merchants premium (ajustar emails se necessário)
UPDATE public.profiles p
   SET is_merchant = true
  FROM auth.users u
 WHERE p.id = u.id
   AND (
     lower(u.email) LIKE 'vingaso%'
     OR lower(u.email) LIKE 'gercio%'
     OR lower(u.email) LIKE 'vanute%'
   );