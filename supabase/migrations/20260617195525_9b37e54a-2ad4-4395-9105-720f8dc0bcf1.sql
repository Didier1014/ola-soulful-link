ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS invalidated_at timestamptz;

CREATE INDEX IF NOT EXISTS push_subscriptions_user_status_idx
  ON public.push_subscriptions(user_id, status);