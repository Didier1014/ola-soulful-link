
-- 1) Backfill: marcar como failed transações pending sem external_ref há mais de 30 min
UPDATE public.transactions
   SET status = 'failed',
       metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
         'error_message', 'Auto-failed: pending sem external_ref > 30min',
         'failed_at', now()
       )
 WHERE status = 'pending'
   AND external_ref IS NULL
   AND created_at < now() - interval '30 minutes';

-- 2) Função que será chamada periodicamente
CREATE OR REPLACE FUNCTION public.expire_stuck_pending_transactions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.transactions
     SET status = 'failed',
         metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
           'error_message', 'Auto-failed: pending sem external_ref > 30min',
           'failed_at', now()
         )
   WHERE status = 'pending'
     AND external_ref IS NULL
     AND created_at < now() - interval '30 minutes';
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- 3) Cron a cada 10 minutos
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule('expire-stuck-pending-transactions');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'expire-stuck-pending-transactions',
  '*/10 * * * *',
  $$ SELECT public.expire_stuck_pending_transactions(); $$
);
