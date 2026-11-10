CREATE TABLE public.checkout_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.profiles(id),
 product_id uuid REFERENCES public.products(id),
 payment_link_id uuid REFERENCES public.payment_links(id),
 token_hash text NOT NULL,
 request_hash text NOT NULL,
 source text NOT NULL DEFAULT 'Direto',
 campaign text NOT NULL DEFAULT '',
 device text NOT NULL DEFAULT 'desktop' CHECK (device IN ('mobile','desktop','tablet')),
 created_at timestamptz NOT NULL DEFAULT now(),
 last_seen_at timestamptz NOT NULL DEFAULT now(),
 started_at timestamptz,
 completed_at timestamptz,
 attempted_at timestamptz,
 error_at timestamptz,
 CHECK ((product_id IS NOT NULL)::integer + (payment_link_id IS NOT NULL)::integer = 1)
);
GRANT SELECT ON public.checkout_sessions TO authenticated;
GRANT ALL ON public.checkout_sessions TO service_role;
ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY seller_reads_own_checkout_sessions ON public.checkout_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE INDEX checkout_sessions_owner_time ON public.checkout_sessions(user_id, created_at DESC);
CREATE INDEX checkout_sessions_request_time ON public.checkout_sessions(request_hash, created_at DESC);
CREATE OR REPLACE FUNCTION public.get_checkout_operation(p_hours integer DEFAULT 24, p_resource uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
WITH base AS (
 SELECT s.id,s.created_at,s.last_seen_at,s.started_at,s.completed_at,s.attempted_at,s.error_at,s.source,s.campaign,s.device,
 COALESCE(s.product_id,s.payment_link_id) resource_id,COALESCE(p.name,l.title,'Checkout') resource_name,
 EXISTS(SELECT 1 FROM public.transactions t WHERE t.user_id=auth.uid() AND t.metadata->'tracking'->>'operation_session_id'=s.id::text AND NOT t.is_test AND t.status='paid') paid,
 EXISTS(SELECT 1 FROM public.transactions t WHERE t.user_id=auth.uid() AND t.metadata->'tracking'->>'operation_session_id'=s.id::text AND NOT t.is_test AND t.status='failed') failed,
 EXISTS(SELECT 1 FROM public.transactions t WHERE t.user_id=auth.uid() AND t.metadata->'tracking'->>'operation_session_id'=s.id::text AND NOT t.is_test AND t.status='pending') pending
 FROM public.checkout_sessions s LEFT JOIN public.products p ON p.id=s.product_id LEFT JOIN public.payment_links l ON l.id=s.payment_link_id
 WHERE s.user_id=auth.uid() AND s.created_at >= now()-make_interval(hours=>LEAST(GREATEST(p_hours,1),720))
 AND (p_resource IS NULL OR COALESCE(s.product_id,s.payment_link_id)=p_resource)
), totals AS (
 SELECT count(*) visits,count(*) FILTER(WHERE started_at IS NOT NULL) started,count(*) FILTER(WHERE completed_at IS NOT NULL) completed,
 count(*) FILTER(WHERE attempted_at IS NOT NULL) attempted,count(*) FILTER(WHERE paid) paid,
 count(*) FILTER(WHERE failed AND NOT paid) failed,count(*) FILTER(WHERE pending AND NOT paid) pending,
 count(*) FILTER(WHERE error_at IS NOT NULL) errors,
 count(*) FILTER(WHERE started_at IS NOT NULL AND attempted_at IS NULL AND last_seen_at < now()-interval '30 minutes') abandoned,
 count(*) FILTER(WHERE last_seen_at >= now()-interval '5 minutes') active FROM base
), hours AS (
 SELECT h.ts,count(b.id) leads,count(b.id) FILTER(WHERE b.completed_at IS NOT NULL) completed,count(b.id) FILTER(WHERE b.paid) paid
 FROM generate_series(date_trunc('hour',now())-interval '23 hours',date_trunc('hour',now()),interval '1 hour') h(ts)
 LEFT JOIN base b ON b.created_at>=h.ts AND b.created_at<h.ts+interval '1 hour' GROUP BY h.ts ORDER BY h.ts
), sources AS (
 SELECT source,count(*) leads,count(*) FILTER(WHERE paid) paid FROM base GROUP BY source ORDER BY count(*) DESC LIMIT 12
), resources AS (
 SELECT resource_id,resource_name,count(*) leads,count(*) FILTER(WHERE paid) paid FROM base GROUP BY resource_id,resource_name ORDER BY count(*) DESC
), recent AS (
 SELECT id,resource_name,source,campaign,device,created_at,last_seen_at,
 CASE WHEN paid THEN 'paid' WHEN pending THEN 'pending' WHEN failed THEN 'failed' WHEN error_at IS NOT NULL THEN 'error' WHEN attempted_at IS NOT NULL THEN 'attempted' WHEN completed_at IS NOT NULL THEN 'completed' WHEN started_at IS NOT NULL THEN 'started' ELSE 'visited' END stage
 FROM base ORDER BY last_seen_at DESC LIMIT 30
)
SELECT jsonb_build_object('totals',(SELECT to_jsonb(totals) FROM totals),'hourly',COALESCE((SELECT jsonb_agg(hours) FROM hours),'[]'::jsonb),'sources',COALESCE((SELECT jsonb_agg(sources) FROM sources),'[]'::jsonb),'resources',COALESCE((SELECT jsonb_agg(resources) FROM resources),'[]'::jsonb),'recent',COALESCE((SELECT jsonb_agg(recent) FROM recent),'[]'::jsonb),'updated_at',now());
$$;
REVOKE ALL ON FUNCTION public.get_checkout_operation(integer,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_checkout_operation(integer,uuid) TO authenticated;
CREATE INDEX transactions_operation_session ON public.transactions ((metadata->'tracking'->>'operation_session_id')) WHERE metadata->'tracking'->>'operation_session_id' IS NOT NULL;