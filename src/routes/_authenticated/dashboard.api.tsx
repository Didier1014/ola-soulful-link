import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Code2, Copy, Eye, EyeOff, Key, Webhook } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/dashboard/api")({ component: Page });

const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
const snippet = (key: string) => `curl -X POST ${baseUrl}/api/public/charge \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount_mzn": 500,
    "method": "mpesa",
    "customer_phone": "+258840000000",
    "reference": "ORDER-123"
  }'`;

function maskKey(key: string) {
  if (key.length <= 12) return key;
  return key.slice(0, 9) + "••••••••••••••••••••" + key.slice(-4);
}

function Page() {
  const [apiKey, setApiKey] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setLoading(false); return; }
      const { data: p } = await supabase.from("profiles").select("api_key").eq("id", u.user.id).single();
      if (p?.api_key) setApiKey(p.api_key);
      setLoading(false);
    })();
  }, []);

  const copy = (s: string) => { navigator.clipboard.writeText(s); toast.success("Copiado"); };
  const displayKey = revealed ? apiKey : maskKey(apiKey);

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h1 className="text-2xl font-bold tracking-tight">API</h1>
        <p className="text-sm text-muted-foreground">Integre Redox Pay no seu sistema</p>
      </div>

      <Card className="p-5 bg-white/5 border-white/10 rounded-2xl">
        <div className="flex items-center gap-2 mb-3"><Key className="h-4 w-4 text-primary-glow" /><h2 className="font-semibold">Chave de API</h2></div>
        {loading ? (
          <div className="h-10 rounded-xl bg-black/20 border border-white/5 animate-pulse" />
        ) : apiKey ? (
          <>
            <div className="flex gap-2">
              <code className="flex-1 px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs font-mono truncate">{displayKey}</code>
              <Button variant="outline" className="rounded-xl bg-white/5 border-white/10" onClick={() => setRevealed(!revealed)}>
                {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button variant="outline" className="rounded-xl bg-white/5 border-white/10" onClick={() => copy(apiKey)}><Copy className="h-4 w-4" /></Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Use no header <code className="text-primary-glow">Authorization: Bearer {apiKey}</code></p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">A sua chave de API será gerada automaticamente.</p>
        )}
      </Card>

      <Card className="p-5 bg-white/5 border-white/10 rounded-2xl">
        <div className="flex items-center gap-2 mb-3"><Code2 className="h-4 w-4 text-primary-glow" /><h2 className="font-semibold">Criar cobrança</h2></div>
        <pre className="text-xs bg-black/40 border border-white/10 rounded-xl p-4 overflow-x-auto font-mono leading-relaxed">{snippet(apiKey || "SEU_TOKEN")}</pre>
        <Button variant="outline" size="sm" className="mt-3 rounded-xl bg-white/5 border-white/10" onClick={() => copy(snippet(apiKey || "SEU_TOKEN"))}><Copy className="h-3.5 w-3.5 mr-1" /> Copiar</Button>
      </Card>

      <Card className="p-5 bg-white/5 border-white/10 rounded-2xl">
        <div className="flex items-center gap-2 mb-3"><Webhook className="h-4 w-4 text-primary-glow" /><h2 className="font-semibold">Webhooks</h2></div>
        <p className="text-sm text-muted-foreground mb-3">Receba notificações em tempo real quando um pagamento for confirmado.</p>
        <div className="space-y-2 text-xs">
          {["payment.confirmed", "payment.failed", "payment.refunded", "subscription.charged"].map(e => (
            <div key={e} className="px-3 py-2 rounded-lg bg-black/30 border border-white/5 font-mono">{e}</div>
          ))}
        </div>
      </Card>
    </div>
  );
}
