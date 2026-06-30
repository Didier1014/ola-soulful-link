-- Limpar resíduos de merchants e dados antigos de pagamentos
DROP TABLE IF EXISTS public.merchant_transactions CASCADE;
DROP TABLE IF EXISTS public.merchants CASCADE;
DROP FUNCTION IF EXISTS public.gen_merchant_client_id() CASCADE;
DROP FUNCTION IF EXISTS public.gen_merchant_api_key() CASCADE;

-- Limpar dados antigos de transacções e links (mantém estrutura)
TRUNCATE TABLE public.transactions RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.payment_links RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.withdrawals RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.integration_logs RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.sale_processing_locks RESTART IDENTITY CASCADE;

-- Reset saldo de todos os utilizadores
UPDATE public.profiles SET balance_mzn = 0;