import { execFileSync } from "node:child_process";
import { expect, test } from "vitest";

test("Junior premium products are approved without administrator review", () => {
  const result = execFileSync("lovable", ["supabase", "query", `
    BEGIN;
    INSERT INTO public.products (user_id, slug, name, price_mzn, approval_status)
    VALUES ('e5ba3f85-a005-4714-8a94-63c92930b351',
      'premium-approval-test-' || gen_random_uuid()::text,
      'Premium approval verification', 300, 'pending')
    RETURNING approval_status;
    ROLLBACK;
  `], { encoding: "utf8" });
  expect(JSON.parse(result)).toEqual([{ approval_status: "approved" }]);
});