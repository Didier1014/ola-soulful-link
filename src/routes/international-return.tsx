import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkInternationalCheckout } from "@/lib/international-checkout.functions";

export const Route = createFileRoute("/international-return")({
  head: () => ({ meta: [
    { title: "Confirmação internacional | Redox Pay" }, { name: "description", content: "Confirmação segura do seu pagamento internacional Redox Pay." },
    { property: "og:title", content: "Confirmação internacional | Redox Pay" }, { property: "og:description", content: "Verifique o resultado do seu pagamento internacional." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: InternationalReturn,
});

function InternationalReturn() {
  const verify = useServerFn(checkInternationalCheckout);
  const [status, setStatus] = useState("checking");
  const [error, setError] = useState("");
  const [delivery, setDelivery] = useState<string | null>(null);
  const checking = useRef(false);
  async function check() {
    if (checking.current) return;
    checking.current = true;
    try {
      setError("");
      const reference = new URLSearchParams(window.location.search).get("reference") ?? "";
      const capability = sessionStorage.getItem(`rdx-paystack:${reference}`);
      if (!capability) throw new Error("Abra a confirmação no mesmo navegador onde iniciou a compra.");
      const result = await verify({ data: { reference, capability } });
      setStatus(result.status); setDelivery(result.delivery_url);
    } catch (e) { setStatus("error"); setError(e instanceof Error ? e.message : "Não foi possível confirmar o pagamento"); }
    finally { checking.current = false; }
  }
  useEffect(() => { void check(); }, []);
  return <main className="international-checkout min-h-screen bg-background text-foreground flex items-center justify-center p-6">
    <div className="max-w-lg text-center space-y-5">
      {status === "checking" ? <Loader2 className="size-12 animate-spin mx-auto text-primary" /> : status === "paid" ? <CheckCircle2 className="size-12 mx-auto text-success" /> : <ShieldCheck className="size-12 mx-auto text-primary" />}
      <h1 className="text-2xl font-bold">{status === "paid" ? "Pagamento confirmado" : status === "test_paid" ? "Teste concluído" : status === "failed" ? "Pagamento não concluído" : "Confirmação do pagamento"}</h1>
      <p className="text-muted-foreground">{error || (status === "test_paid" ? "Pagamento de teste, sem cobrança real ou crédito de saldo." : status === "paid" ? "A sua compra foi confirmada pela Paystack." : status === "checking" ? "A verificar com a Paystack…" : "O pagamento ainda não foi confirmado.")}</p>
      {delivery && <Button onClick={() => window.location.assign(delivery)}>Aceder à compra</Button>}
      {status !== "paid" && status !== "test_paid" && <Button disabled={status === "checking"} onClick={() => void check()}>Verificar novamente</Button>}
    </div>
  </main>;
}