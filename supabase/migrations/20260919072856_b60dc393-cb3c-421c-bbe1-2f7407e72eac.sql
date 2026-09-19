-- lovable-cron-fallback-reviewed: 144 runs/day; backstop reconciliation for NetShop charges when provider webhook does not arrive
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

  UPDATE public.transactions
     SET status = 'failed',
         metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
           'error_message', 'Auto-failed: sem confirmação do gateway em 24h',
           'failed_at', now()
         )
   WHERE status = 'pending'
     AND external_ref IS NOT NULL
     AND created_at < now() - interval '24 hours';

  RETURN affected;
END;
$$;

SELECT cron.schedule(
  'reconcile-pending-netshop',
  '*/10 * * * *',
  $$select net.http_post(
      url := 'https://project--9a15d051-688d-4d24-81ef-d3e2614ab6ca.lovable.app/api/public/reconcile-pending',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := '{}'::jsonb
    );$$
);