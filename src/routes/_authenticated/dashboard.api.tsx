import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Code2, Copy, Eye, EyeOff, Key, CheckCircle2, AlertCircle, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/dashboard/api")({ component: Page });

function maskKey(key: string) {
  if (key.length <= 12) return key;
  return key.slice(0, 9) + "••••••••••••••••••••" + key.slice(-4);
}

function Page() {
  const [apiKey, setApiKey] = useState("");
  const [isMerchant, setIsMerchant] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://redoxpay.lovable.app";

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setLoading(false); return; }
      const { data: p } = await supabase.from("profiles").select("api_key,is_merchant").eq("id", u.user.id).single();
      if (p?.api_key) setApiKey(p.api_key);
      setIsMerchant(Boolean((p as any)?.is_merchant));
      setLoading(false);
    })();
  }, []);

  const copy = (s: string) => { navigator.clipboard.writeText(s); toast.success("Copiado"); };
  const displayKey = revealed ? apiKey : maskKey(apiKey);
  const key = apiKey || "SUA_API_KEY";

  const curlCreate = useMemo(() => `curl -X POST ${baseUrl}/api/public/create-merchant-payment \\
  -H "x-merchant-api-key: ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "nome_cliente": "Joao Silva",
    "phone": "258840000000",
    "amount": 500,
    "webhook_url": "https://seusite.com/webhook"
  }'`, [key, baseUrl]);

  const curlStatus = useMemo(() => `curl -X GET "${baseUrl}/api/public/check-payment-status?txid=TXID_RECEBIDO" \\
  -H "x-merchant-api-key: ${key}"`, [key, baseUrl]);

  const jsExample = useMemo(() => `// Node.js / JavaScript
const res = await fetch("${baseUrl}/api/public/create-merchant-payment", {
  method: "POST",
  headers: {
    "x-merchant-api-key": "${key}",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    nome_cliente: "Joao Silva",
    phone: "258840000000",     // M-Pesa: 84/85 · e-Mola: 86/87
    amount: 500,                // MZN, mínimo 50
    webhook_url: "https://seusite.com/webhook", // opcional
  }),
});
const data = await res.json();
// { status: "success" | "pending" | "failed", partner_transaction_id: "..." }`, [key, baseUrl]);

  const phpExample = useMemo(() => `<?php
// PHP
$ch = curl_init("${baseUrl}/api/public/create-merchant-payment");
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
  "x-merchant-api-key: ${key}",
  "Content-Type: application/json",
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
  "nome_cliente" => "Joao Silva",
  "phone"        => "258840000000",
  "amount"       => 500,
]));
$resp = json_decode(curl_exec($ch), true);
// $resp["status"], $resp["partner_transaction_id"]`, [key, baseUrl]);

  const pyExample = useMemo(() => `# Python
import requests
r = requests.post(
  "${baseUrl}/api/public/create-merchant-payment",
  headers={"x-merchant-api-key": "${key}"},
  json={
    "nome_cliente": "Joao Silva",
    "phone": "258840000000",
    "amount": 500,
  },
)
print(r.json())  # {"status": "...", "partner_transaction_id": "..."}`, [key, baseUrl]);

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h1 className="text-2xl font-bold tracking-tight">API de Integração</h1>
        <p className="text-sm text-muted-foreground">Cobre M-Pesa e e-Mola diretamente do seu sistema</p>
      </div>

      {!loading && !isMerchant && (
        <Card className="p-4 bg-amber-500/10 border-amber-500/30 rounded-2xl flex gap-3">
          <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-amber-200">Conta não habilitada para Merchant API</p>
            <p className="text-amber-200/70 text-xs mt-1">A sua chave funciona, mas a criação de cobranças requer conta premium merchant. Contacte o suporte.</p>
          </div>
        </Card>
      )}

      {/* API KEY */}
      <Card className="p-5 bg-white/5 border-white/10 rounded-2xl">
        <div className="flex items-center gap-2 mb-3">
          <Key className="h-4 w-4 text-primary-glow" />
          <h2 className="font-semibold">Sua chave de API</h2>
        </div>
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
            <p className="mt-2 text-xs text-muted-foreground">Envie no header <code className="text-primary-glow">x-merchant-api-key</code>. Nunca exponha esta chave no frontend.</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">A sua chave de API será gerada automaticamente.</p>
        )}
      </Card>

      {/* ENDPOINT 1 */}
      <Card className="p-5 bg-white/5 border-white/10 rounded-2xl space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary-glow" />
          <h2 className="font-semibold">1. Criar cobrança</h2>
          <span className="text-[10px] px-2 py-0.5 rounded bg-green-500/20 text-green-300 font-mono">POST</span>
        </div>
        <code className="block text-xs bg-black/40 border border-white/10 rounded-lg px-3 py-2 font-mono break-all">
          {baseUrl}/api/public/create-merchant-payment
        </code>

        <div className="text-xs space-y-2">
          <p className="font-medium text-muted-foreground uppercase tracking-wider">Body (JSON)</p>
          <div className="grid gap-1.5">
            <Row name="nome_cliente" type="string" req>Nome do cliente</Row>
            <Row name="phone" type="string" req>Telefone 258XXXXXXXXX. M-Pesa: 84/85 · e-Mola: 86/87</Row>
            <Row name="amount" type="number" req>Valor em MZN. Mínimo 50</Row>
            <Row name="webhook_url" type="string">URL para receber a confirmação (opcional)</Row>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">cURL</p>
          <pre className="text-[11px] bg-black/40 border border-white/10 rounded-xl p-3 overflow-x-auto font-mono leading-relaxed">{curlCreate}</pre>
          <Button variant="outline" size="sm" className="mt-2 rounded-lg bg-white/5 border-white/10" onClick={() => copy(curlCreate)}><Copy className="h-3.5 w-3.5 mr-1" /> Copiar</Button>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Resposta</p>
          <pre className="text-[11px] bg-black/40 border border-white/10 rounded-xl p-3 overflow-x-auto font-mono leading-relaxed">{`{
  "status": "success",
  "partner_transaction_id": "abc123..."
}`}</pre>
        </div>
      </Card>

      {/* ENDPOINT 2 */}
      <Card className="p-5 bg-white/5 border-white/10 rounded-2xl space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary-glow" />
          <h2 className="font-semibold">2. Consultar status</h2>
          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">GET</span>
        </div>
        <code className="block text-xs bg-black/40 border border-white/10 rounded-lg px-3 py-2 font-mono break-all">
          {baseUrl}/api/public/check-payment-status?txid=...
        </code>
        <pre className="text-[11px] bg-black/40 border border-white/10 rounded-xl p-3 overflow-x-auto font-mono leading-relaxed">{curlStatus}</pre>
        <Button variant="outline" size="sm" className="rounded-lg bg-white/5 border-white/10" onClick={() => copy(curlStatus)}><Copy className="h-3.5 w-3.5 mr-1" /> Copiar</Button>
        <p className="text-xs text-muted-foreground">Retorna <code className="text-primary-glow">{`{ status, partner_transaction_id }`}</code>. Status possíveis: <code>pending</code>, <code>success</code>, <code>failed</code>.</p>
      </Card>

      {/* CODE SAMPLES */}
      <Card className="p-5 bg-white/5 border-white/10 rounded-2xl space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Code2 className="h-4 w-4 text-primary-glow" />
          <h2 className="font-semibold">Exemplos de código</h2>
        </div>

        <Sample title="JavaScript / Node.js" code={jsExample} onCopy={copy} />
        <Sample title="PHP" code={phpExample} onCopy={copy} />
        <Sample title="Python" code={pyExample} onCopy={copy} />
      </Card>

      {/* NOTES */}
      <Card className="p-5 bg-white/5 border-white/10 rounded-2xl">
        <h2 className="font-semibold mb-3">Notas importantes</h2>
        <ul className="text-xs text-muted-foreground space-y-2 list-disc pl-4">
          <li>O canal é detectado automaticamente pelo prefixo do <code className="text-primary-glow">phone</code>.</li>
          <li>Valor mínimo por cobrança: <strong className="text-white">50 MZN</strong>.</li>
          <li>Configure os telefones de payout M-Pesa e e-Mola no seu perfil antes de cobrar.</li>
          <li>Nunca exponha a sua <code className="text-primary-glow">x-merchant-api-key</code> em código do lado do cliente (browser/app).</li>
          <li>Use HTTPS sempre nas suas chamadas.</li>
        </ul>
      </Card>
    </div>
  );
}

function Row({ name, type, req, children }: { name: string; type: string; req?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-black/30 border border-white/5">
      <code className="text-primary-glow font-mono text-xs shrink-0">{name}</code>
      <span className="text-[10px] text-muted-foreground uppercase mt-0.5">{type}</span>
      {req && <span className="text-[10px] text-red-400 uppercase mt-0.5">req</span>}
      <span className="text-xs text-muted-foreground ml-auto text-right">{children}</span>
    </div>
  );
}

function Sample({ title, code, onCopy }: { title: string; code: string; onCopy: (s: string) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
        <Button variant="ghost" size="sm" className="h-7 rounded-lg" onClick={() => onCopy(code)}><Copy className="h-3 w-3 mr-1" /> Copiar</Button>
      </div>
      <pre className="text-[11px] bg-black/40 border border-white/10 rounded-xl p-3 overflow-x-auto font-mono leading-relaxed">{code}</pre>
    </div>
  );
}
