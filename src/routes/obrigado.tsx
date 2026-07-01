import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { checkTransactionStatus } from "@/lib/transactions.functions";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink, Loader2, X, Users, Download } from "lucide-react";
import { z } from "zod";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/obrigado")({
  validateSearch: z.object({ tx_id: z.string().optional(), slug: z.string().optional() }),
  component: ThankYouPage,
});

const WHATSAPP_GROUP_URL = "https://chat.whatsapp.com/EXAMPLE"; // TODO: replace
const LS_KEY = "redoxpay_whatsapp_popup_seen";

function WhatsappPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(LS_KEY);
    if (!seen) {
      const t = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(LS_KEY, "1");
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", animation: "fadeIn 0.3s ease" }}>
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center relative overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.2)]"
        style={{ animation: "slideUp 0.35s cubic-bezier(0.25,0.46,0.45,0.94)" }}>
        <button onClick={dismiss} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
          <X className="h-5 w-5" />
        </button>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}>
          <Users className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Junte-se à nossa comunidade!</h2>
        <p className="text-sm text-gray-500 mt-2">
          Entre no grupo exclusivo de WhatsApp para receber novidades, ofertas especiais e suporte.
        </p>
        <div className="space-y-2 mt-6">
          <a href={WHATSAPP_GROUP_URL} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110"
            style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}>
            Entrar no Grupo
          </a>
          <button onClick={dismiss}
            className="w-full text-sm text-gray-400 hover:text-gray-600 underline">
            Agora não
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}
      `}</style>
    </div>
  );
}

function ThankYouPage() {
  const { tx_id, slug } = useSearch({ from: "/obrigado" });
  const navigate = useNavigate();
  const check = useServerFn(checkTransactionStatus);

  const { data: result, isLoading } = useQuery({
    queryKey: ["tx-status", tx_id],
    queryFn: () => tx_id ? check({ data: { transaction_id: tx_id } }) : null,
    refetchInterval: (q) => q.state.data?.status === "paid" ? false : 3000,
    enabled: !!tx_id,
  });

  if (isLoading || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #f9fafc 0%, #f1f5f9 100%)" }}>
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 mx-auto animate-spin" style={{ color: "#ff3333" }} />
          <p className="text-sm text-gray-400">A verificar o pagamento...</p>
        </div>
      </div>
    );
  }

  const isDigital = (result as any)?.product_type === "digital";
  const downloadUrl: string | undefined = (result as any)?.download_url;

  if (result.status === "paid" && !isDigital) {
    const deliveryUrl = result.delivery_url;
    if (deliveryUrl) {
      window.location.href = deliveryUrl;
      return null;
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #f9fafc 0%, #f1f5f9 100%)" }}>
      <div className="bg-white rounded-3xl p-10 max-w-md w-full text-center shadow-[0_25px_60px_rgba(0,0,0,0.1)] space-y-4">
        {result.status === "paid" ? (
          <>
            <CheckCircle2 className="h-16 w-16 mx-auto" style={{ color: "#ff3333" }} />
            <h1 className="text-2xl font-bold text-gray-900">Obrigado!</h1>
            <p className="text-gray-500">
              {isDigital ? "Pagamento confirmado. O seu produto está pronto para download." : "Pagamento confirmado com sucesso."}
            </p>
            {isDigital && downloadUrl && (
              <>
                <a href={downloadUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110"
                  style={{ background: "linear-gradient(135deg, #ff3333, #cc0000)" }}>
                  <Download className="h-4 w-4" />
                  Acessar Produto (Download)
                </a>
                <p className="text-xs text-gray-400">Link válido por 7 dias. Guarde o ficheiro após descarregar.</p>
              </>
            )}
            {isDigital && !downloadUrl && (
              <p className="text-sm text-gray-400">Produto será enviado para o seu email em instantes.</p>
            )}
            {!isDigital && result.delivery_url && (
              <a href={result.delivery_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110"
                style={{ background: "linear-gradient(135deg, #ff3333, #cc0000)" }}>
                <ExternalLink className="h-4 w-4" />
                Acessar Produto
              </a>
            )}
            {!isDigital && !result.delivery_url && (
              <p className="text-sm text-gray-400">Produto disponível em breve, verifique seu email.</p>
            )}
            <WhatsappPopup />
            <button onClick={() => navigate({ to: "/" })}
              className="text-sm text-gray-400 hover:text-gray-600 underline">
              Voltar ao início
            </button>
          </>
        ) : result.status === "failed" ? (
          <>
            <h1 className="text-2xl font-bold text-gray-900">Pagamento falhou</h1>
            <p className="text-gray-500">Tente novamente mais tarde.</p>
            {slug && (
              <a href={`/c/${slug}`}
                className="inline-block w-full py-3 rounded-xl text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg, #ff3333, #cc0000)" }}>
                Tentar novamente
              </a>
            )}
          </>
        ) : (
          <>
            <Loader2 className="h-10 w-10 mx-auto animate-spin" style={{ color: "#ff3333" }} />
            <h1 className="text-xl font-bold text-gray-900">A processar pagamento</h1>
            <p className="text-sm text-gray-400">Aguardando confirmação...</p>
          </>
        )}
      </div>
    </div>
  );
}
