import { createFileRoute } from "@tanstack/react-router";

// Webhook PagAja — valida HMAC-SHA256 (x-pagaja-signature) sobre o corpo cru.
async function hmacHex(secret: string, body: string) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function safeEq(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export const Route = createFileRoute("/api/public/pagaja-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const secrets = [process.env.PAGAJA_WHSEC, process.env.PAGAJA_SIGNING_SECRET, process.env.PAGAJA_WEBHOOK_SECRET]
          .filter(Boolean) as string[];
        const header = (request.headers.get("x-pagaja-signature") || "").replace(/^sha256=/, "").trim().toLowerCase();
        if (!secrets.length || !header) return new Response("unauthorized", { status: 401 });
        let valid = false;
        for (const s of secrets) if (safeEq(header, await hmacHex(s, raw))) { valid = true; break; }
        if (!valid) return new Response("invalid signature", { status: 401 });

        try {
          const body: any = JSON.parse(raw || "{}");
          const d = body?.data ?? body;
          const ref = d?.reference || d?.id || d?.charge_id || d?.order_id;
          const status = String(d?.status || body?.event || body?.type || "").toLowerCase();
          if (!ref) return Response.json({ ok: true, ignored: "no_reference" });

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: tx } = await supabaseAdmin.from("transactions")
            .select("id,user_id,net_mzn,status,metadata").eq("external_ref", String(ref)).maybeSingle();
          if (!tx || tx.status !== "pending") return Response.json({ ok: true });

          if (/fail|cancel|expired|declin/.test(status)) {
            await supabaseAdmin.from("transactions").update({ status: "failed" }).eq("id", tx.id).eq("status", "pending");
            return Response.json({ ok: true });
          }
          if (!/paid|succeed|success|complete|approved/.test(status)) return Response.json({ ok: true, pending: true });

          const { data: changed } = await supabaseAdmin.from("transactions")
            .update({ status: "paid" }).eq("id", tx.id).eq("status", "pending").select("id").maybeSingle();
          if (!changed) return Response.json({ ok: true, already: true });
          const { data: prof } = await supabaseAdmin.from("profiles").select("balance_mzn").eq("id", tx.user_id).maybeSingle();
          await supabaseAdmin.from("profiles")
            .update({ balance_mzn: Number(prof?.balance_mzn ?? 0) + Number(tx.net_mzn) }).eq("id", tx.user_id);
          try {
            const { notifyNewSale } = await import("@/lib/sale-notify.server");
            await notifyNewSale(supabaseAdmin, tx.id);
          } catch (e) { console.log("[pagaja-webhook] notify failed", e); }
          return Response.json({ ok: true });
        } catch (e) {
          console.log("[pagaja-webhook] error", e);
          return Response.json({ ok: false });
        }
      },
    },
  },
});
