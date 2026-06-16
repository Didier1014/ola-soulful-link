// @ts-nocheck
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getProductBySlug } from "@/lib/products.functions";
import { createCheckout, checkTransactionStatus } from "@/lib/transactions.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, Heart, ShieldCheck, AlertTriangle, Smartphone } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/c/$slug")({
  component: CheckoutPage,
});

const fmt = (n: number) => new Intl.NumberFormat("pt-MZ", { style: "currency", currency: "MZN" }).format(n);

function Countdown() {
  const [timeLeft, setTimeLeft] = useState(20 * 60);
  useEffect(() => {
    if (timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);
  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  return (
    <span className="tabular-nums">{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}</span>
  );
}

function PurchaseCounter() {
  const [count, setCount] = useState(() => Math.floor(Math.random() * 30) + 15);
  useEffect(() => {
    const t = setInterval(() => setCount((p) => p + Math.floor(Math.random() * 3)), 8000);
    return () => clearInterval(t);
  }, []);
  return <span>{count}</span>;
}

function CheckoutPage() {
  const { slug } = useParams({ from: "/c/$slug" });
  const fetchProduct = useServerFn(getProductBySlug);
  const checkout = useServerFn(createCheckout);
  const cardRef = useRef<HTMLDivElement>(null);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => fetchProduct({ data: { slug } }),
    retry: false,
  });

  const [form, setForm] = useState({ customer_name: "", customer_phone: "" });
  const [method, setMethod] = useState<"mpesa" | "emola">("mpesa");
  const [modal, setModal] = useState<{ status: "processing" | "paid" | "failed" | "pending"; id?: string; delivery_url?: string | null } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);
  const checkingRef = useRef(false);

  useEffect(() => {
    if (cardRef.current) {
      cardRef.current.style.opacity = "0";
      cardRef.current.style.transform = "translateY(12px)";
      requestAnimationFrame(() => {
        cardRef.current!.style.transition = "opacity 0.4s ease, transform 0.4s ease";
        cardRef.current!.style.opacity = "1";
        cardRef.current!.style.transform = "translateY(0)";
      });
    }
  }, [product]);

  const pollStatus = useMutation({
    mutationFn: (txId: string) => checkTransactionStatus({ data: { transaction_id: txId } }),
  });

  const m = useMutation({
    mutationFn: () => checkout({
      data: {
        product_id: product!.id, method, ...form, customer_email: "",
      },
    }),
    onMutate: () => {
      setModal({ status: "processing", id: undefined });
    },
    onSuccess: (r) => {
      setModal({ status: "pending", id: r.id, delivery_url: undefined });
      toast("Pagamento enviado — confirme no seu telefone");
    },
    onError: (e) => {
      setModal({ status: "failed", id: undefined });
      toast.error(e instanceof Error ? e.message : "Erro");
    },
  });

  useEffect(() => {
    if (modal?.status !== "pending" || !modal.id) return;
    pollCountRef.current = 0;
    let timer: ReturnType<typeof setInterval>;
    let stopped = false;

    async function check() {
      if (checkingRef.current || stopped) return;
      checkingRef.current = true;
      try {
        const result = await checkTransactionStatus({ data: { transaction_id: modal.id! } });
        if (stopped) return;
        if (result.status === "paid") {
          cleanup();
          toast.success("Pagamento confirmado!");
          setModal({ status: "paid", id: modal.id, delivery_url: result.delivery_url ?? null });
        } else if (result.status === "failed") {
          cleanup();
          setModal({ status: "failed", id: modal.id });
          toast.error("Pagamento falhou");
        }
      } catch { /* retry */ }
      checkingRef.current = false;
    }

    function onVisible() {
      if (document.visibilityState === "visible") check();
    }

    function cleanup() {
      stopped = true;
      clearInterval(timer);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", onVisible);
    }

    timer = setInterval(() => {
      pollCountRef.current++;
      if (pollCountRef.current > 60) {
        cleanup();
        toast.info("O pagamento ainda está a ser processado. Receberá uma notificação quando for confirmado.");
        return;
      }
      check();
    }, 3000);

    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", onVisible);

    return cleanup;
  }, [modal?.status, modal?.id, slug]);

  if (isLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6" style={{ background: "linear-gradient(135deg, #f9fafc 0%, #f1f5f9 100%)" }}>
      <div className="flex gap-3">
        {[0, 0.16, 0.32].map((d, i) => (
          <div key={i} className="w-3 h-3 rounded-full"
            style={{
              background: "linear-gradient(135deg, #3b82f6, #2563eb)",
              animation: `bounce 1.4s ease-in-out ${d}s infinite both`,
            }}
          />
        ))}
      </div>
      <p className="text-sm font-medium text-gray-400">A preparar o seu checkout...</p>
      <style>{`@keyframes bounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}`}</style>
    </div>
  );

  if (error || !product) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4" style={{ background: "linear-gradient(135deg, #f9fafc 0%, #f1f5f9 100%)" }}>
      <AlertTriangle className="h-12 w-12 text-gray-300" />
      <h1 className="text-xl font-bold text-gray-900">Produto não encontrado</h1>
      <p className="text-sm text-gray-400">O link pode estar incorreto ou o produto foi desactivado.</p>
    </div>
  );

  const price = Number(product.price_mzn);
  const methodColor = method === "mpesa" ? "#ef4444" : "#FF6600";
  const methodGradient = method === "mpesa" ? "linear-gradient(135deg, #ef4444, #dc2626)" : "linear-gradient(135deg, #FF6600, #e65500)";
  const mpesaSelected = method === "mpesa";
  const emolaSelected = method === "emola";

  return (
    <div className="min-h-screen app-light" style={{ background: "linear-gradient(135deg, #f9fafc 0%, #f1f5f9 100%)" }}>
      <style>{`
        @keyframes fadeSlideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes urgencySpin{0%,100%{transform:rotate(0deg)}25%{transform:rotate(12deg)}75%{transform:rotate(-12deg)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .checkout-card{animation:fadeSlideUp 0.4s ease forwards}
        .urgency-banner{animation:urgencySpin 1.5s ease-in-out infinite}
        .spinner-red{width:40px;height:40px;border:3px solid rgba(255,51,51,0.2);border-top-color:#ff3333;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto}
      `}</style>

      {modal && (modal.status === "processing" || modal.status === "failed") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(8px)", animation: "fadeIn 0.2s ease" }}
          onClick={() => modal.status !== "processing" && setModal(null)}>
          <div className="bg-white rounded-3xl p-10 max-w-sm w-full text-center relative overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.15)]"
            style={{ animation: "slideUp 0.3s cubic-bezier(0.25,0.46,0.45,0.94)" }}>
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(59,130,246,0.06), transparent 70%)" }} />
            {modal.status === "processing" ? (
              <div className="relative space-y-4">
                <div className="mx-auto w-[56px] h-[56px] rounded-full flex items-center justify-center"
                  style={{ background: "rgba(255,51,51,0.12)" }}>
                  <Loader2 className="h-7 w-7" style={{ color: "#ff3333", animation: "spin 0.7s linear infinite" }} />
                </div>
                <h2 className="text-xl font-bold text-gray-900">A processar pagamento</h2>
                <p className="text-sm text-gray-400">Aguardando confirmação do pagamento...</p>
              </div>
            ) : (
              <div className="relative space-y-4">
                <AlertTriangle className="h-14 w-14 text-red-400 mx-auto" />
                <h2 className="text-xl font-bold text-gray-900">Pagamento falhou</h2>
                <p className="text-sm text-gray-400">Tente novamente ou use outro método de pagamento.</p>
                <Button className="w-full mt-4 rounded-xl" onClick={() => setModal(null)}>Tentar novamente</Button>
              </div>
            )}
          </div>
        </div>
      )}


      <div className="sticky top-0 z-40 w-full py-2.5 px-4 flex items-center justify-center gap-2.5 text-sm font-medium"
        style={{ background: "linear-gradient(135deg, #8b0000, #a00000)", color: "#fff", boxShadow: "0 2px 16px rgba(139,0,0,0.3)" }}>
        <span className="urgency-banner" style={{ display: "inline-block" }}>⚡</span>
        <span>Oferta por tempo limitado — expira em <Countdown /></span>
      </div>

      <div className="max-w-md mx-auto px-4 py-4" ref={cardRef} style={{ minHeight: "calc(100vh - 48px)" }}>
        <div className="bg-white rounded-2xl overflow-hidden border" style={{ borderColor: "rgba(148,163,184,0.15)", boxShadow: "0 2px 20px rgba(0,0,0,0.04)" }}>
          <div className="p-4 space-y-3">
            {product.cover_url && (
              <div className="flex items-center gap-3 pb-2">
                <img src={product.cover_url} alt={product.name} className="h-20 w-20 rounded-xl object-cover border border-gray-100" />
                <div className="min-w-0 flex-1">
                  <h1 className="text-base font-extrabold tracking-tight leading-tight text-gray-900 truncate">{product.name}</h1>
                  {product.description && <p className="text-xs text-gray-400 truncate">{product.description}</p>}
                  <div className="flex items-center gap-1 mt-0.5 text-[11px] font-medium" style={{ color: "#3b82f6" }}>
                    <Heart className="h-3 w-3" fill="#3b82f6" />
                    <span><PurchaseCounter /> compras</span>
                  </div>
                </div>
              </div>
            )}
            {!product.cover_url && (
              <div>
                <h1 className="text-base font-extrabold tracking-tight text-gray-900">{product.name}</h1>
                {product.description && <p className="text-xs text-gray-400 mt-0.5">{product.description}</p>}
                <div className="flex items-center gap-1 mt-1 text-[11px] font-medium" style={{ color: "#3b82f6" }}>
                  <Heart className="h-3 w-3" fill="#3b82f6" />
                  <span><PurchaseCounter /> compras</span>
                </div>
              </div>
            )}

            <div className="rounded-lg px-3.5 py-2.5 flex items-center justify-between" style={{ background: "linear-gradient(135deg, rgba(34,197,94,0.04), rgba(34,197,94,0.08))" }}>
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total a pagar</span>
              <span className="text-xl font-black tracking-tight text-gray-900">{fmt(price)}</span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Nome completo *</Label>
              <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                maxLength={120} placeholder="Seu nome"
                className="border-[1.5px] border-gray-200 rounded-xl py-2.5 px-3 text-sm font-medium placeholder:text-gray-300 focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/10 transition-all" />
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Deseja pagar com:</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setMethod("mpesa")} type="button"
                  className="relative py-4 px-3 rounded-xl border-[1.5px] font-semibold text-base transition-all flex items-center justify-center gap-2"
                  style={mpesaSelected
                    ? { borderColor: "#ef4444", background: "#fef2f2", color: "#dc2626", boxShadow: "0 0 0 3px rgba(220,38,38,0.08)" }
                    : { borderColor: "rgba(148,163,184,0.3)", background: "#fff", color: "#9ca3af" }}>
                  {mpesaSelected && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "#ef4444" }}>
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </span>
                  )}
                  <img src="/brands/mpesa.png" alt="M-Pesa" className="w-8 h-8 shrink-0" />
                  M-Pesa
                </button>
                <button onClick={() => setMethod("emola")} type="button"
                  className="relative py-4 px-3 rounded-xl border-[1.5px] font-semibold text-base transition-all flex items-center justify-center gap-2"
                  style={emolaSelected
                    ? { borderColor: "#FF6600", background: "#fff7ed", color: "#e65500", boxShadow: "0 0 0 3px rgba(255,102,0,0.08)" }
                    : { borderColor: "rgba(148,163,184,0.3)", background: "#fff", color: "#9ca3af" }}>
                  {emolaSelected && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "#FF6600" }}>
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </span>
                  )}
                  <img src="/brands/emola.png" alt="e-Mola" className="w-8 h-8 shrink-0" />
                  e-Mola
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Número de {method === "mpesa" ? "M-Pesa" : "e-Mola"} *</Label>
              <div className="flex rounded-xl overflow-hidden border-[1.5px] border-gray-200 focus-within:border-blue-500 focus-within:ring-[3px] focus-within:ring-blue-500/10 transition-all">
                <div className="flex items-center px-3 text-sm font-medium text-gray-500 bg-gray-50 border-r border-gray-200">+258</div>
                <input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                  placeholder="84 000 0000" maxLength={15}
                  className="flex-1 px-3 py-2.5 text-sm font-medium outline-none placeholder:text-gray-300 bg-white" />
              </div>
            </div>

            {modal?.status === "pending" && (
              <div className="rounded-xl border-[1.5px] p-4 flex items-start gap-3"
                style={{ borderColor: `${methodColor}33`, background: `${methodColor}0d`, animation: "fadeIn 0.3s ease" }}>
                <div className="shrink-0 mt-0.5">
                  <div className="w-6 h-6 rounded-full border-2" style={{ borderColor: `${methodColor}40`, borderTopColor: methodColor, animation: "spin 0.8s linear infinite" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900">A aguardar confirmação...</p>
                  <p className="text-xs text-gray-500 mt-0.5">Confirme o pagamento no seu telefone ({form.customer_phone}) introduzindo o PIN do {method === "mpesa" ? "M-Pesa" : "e-Mola"}.</p>
                  {modal.id && <p className="text-[10px] text-gray-300 mt-1">Ref: {modal.id}</p>}
                </div>
              </div>
            )}

            {modal?.status === "paid" ? (
              <div className="space-y-3" style={{ animation: "slideUp 0.4s cubic-bezier(0.25,0.46,0.45,0.94)" }}>
                <div className="rounded-xl border-[1.5px] p-4 flex items-start gap-3"
                  style={{ borderColor: "rgba(34,197,94,0.35)", background: "linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.14))" }}>
                  <div className="shrink-0 mt-0.5 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "#22c55e" }}>
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-green-700">Pagamento confirmado!</p>
                    <p className="text-xs text-gray-600 mt-0.5">Obrigado pela sua compra. Já pode aceder ao seu produto.</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (modal.delivery_url) window.open(modal.delivery_url, "_blank", "noopener,noreferrer");
                    else window.location.href = `/obrigado?tx_id=${modal.id}&slug=${slug}`;
                  }}
                  className="w-full py-5 rounded-xl text-base font-bold text-white transition-all"
                  style={{ background: "linear-gradient(135deg, #16a34a, #15803d)", boxShadow: "0 8px 24px rgba(34,197,94,0.35)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}>
                  Acesse o produto
                </button>
              </div>
            ) : (
              <button onClick={() => m.mutate()} disabled={m.isPending || modal?.status === "pending" || !form.customer_name || !form.customer_phone}
                className="w-full py-5 rounded-xl text-base font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: methodGradient,
                  boxShadow: m.isPending ? "none" : `0 8px 24px ${methodColor}33`,
                }}
                onMouseEnter={(e) => !m.isPending && form.customer_name && form.customer_phone && (e.currentTarget.style.transform = "translateY(-2px)")}
                onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
                {m.isPending || modal?.status === "pending" ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-[18px] h-[18px] rounded-full border-2 border-white/25 border-t-white" style={{ animation: "spin 0.8s linear infinite" }} />
                    {modal?.status === "pending" ? "A aguardar confirmação..." : "A processar..."}
                  </div>
                ) : (
                  `Pagar ${fmt(price)}`
                )}
              </button>
            )}

            <div className="flex items-center justify-center gap-2 text-[11px] font-medium text-green-600">
              <ShieldCheck className="h-3.5 w-3.5" />
              Garantia incondicional 7 dias
            </div>

            <div className="flex items-center justify-center gap-4 text-[10px] font-medium text-gray-400">
              <span className="flex items-center gap-1"><Lock className="h-2.5 w-2.5" /> Pagamento seguro</span>
              <span className="flex items-center gap-1"><ShieldCheck className="h-2.5 w-2.5" /> Dados protegidos</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}