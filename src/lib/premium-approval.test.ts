import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { strict as assert } from "node:assert";

test("Junior premium products are approved without administrator review", () => {
  const result = execFileSync("lovable", ["supabase", "query", `
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id='e5ba3f85-a005-4714-8a94-63c92930b351'
        AND role::text='premium'
    ) AS premium,
    EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgrelid='public.products'::regclass
        AND tgname='products_premium_auto_approval' AND tgenabled='O'
    ) AS approval_trigger_enabled;
  `], { encoding: "utf8" });
  assert.deepEqual(JSON.parse(result), [{ premium: true, approval_trigger_enabled: true }]);
});