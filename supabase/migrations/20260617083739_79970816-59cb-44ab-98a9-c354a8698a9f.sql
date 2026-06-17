-- Restrict Realtime topic subscriptions to the owning user (or admins).
-- Convention: user-scoped topics are named "user:<auth.uid()>:..."
-- Admin-scoped topics are named "admin:<auth.uid()>:..." and require the admin role.

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only access their own topics" ON realtime.messages;

CREATE POLICY "Users can only access their own topics"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    (realtime.topic() LIKE 'user:' || auth.uid()::text || ':%')
    OR (
      realtime.topic() LIKE 'admin:' || auth.uid()::text || ':%'
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "Users can only publish to their own topics" ON realtime.messages;

CREATE POLICY "Users can only publish to their own topics"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (realtime.topic() LIKE 'user:' || auth.uid()::text || ':%')
    OR (
      realtime.topic() LIKE 'admin:' || auth.uid()::text || ':%'
      AND public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );
