import { useEffect, useState } from "react";
import { X, Copy, Check } from "lucide-react";

const CATEGORIES: { title: string; keywords: string[] }[] = [
  {
    title: "Principais",
    keywords: [
      "Redox Pay", "RedoxPay", "plataforma de pagamentos Moçambique", "gateway de pagamento Moçambique",
      "receber pagamentos online Moçambique", "checkout online Moçambique", "processador de pagamentos Moçambique",
      "sistema de pagamento online", "pagamentos digitais Moçambique", "solução de pagamento Moçambique",
      "gateway M-Pesa", "gateway e-Mola", "API de pagamentos Moçambique", "link de pagamento Moçambique",
      "QR Code pagamento Moçambique", "pagamento instantâneo Moçambique", "receber dinheiro online Moçambique",
      "fintech Moçambique", "carteira digital Moçambique", "pagamento por celular Moçambique",
    ],
  },
  {
    title: "M-Pesa & e-Mola",
    keywords: [
      "integrar M-Pesa", "API M-Pesa Moçambique", "integração M-Pesa loja", "aceitar M-Pesa online",
      "cobrança M-Pesa automática", "M-Pesa para negócios", "M-Pesa Vodacom Moçambique", "pagamento M-Pesa site",
      "integrar e-Mola", "API e-Mola Moçambique", "aceitar e-Mola online", "cobrança e-Mola automática",
      "e-Mola Movitel", "pagamento e-Mola site", "M-Pesa e e-Mola juntos", "gateway M-Pesa e-Mola",
      "checkout M-Pesa e-Mola", "notificação M-Pesa automática", "reconciliação M-Pesa", "conciliação e-Mola",
    ],
  },
  {
    title: "Infoprodutos & Digital",
    keywords: [
      "vender infoprodutos Moçambique", "plataforma para infoprodutores Moçambique", "vender ebook Moçambique",
      "vender curso online Moçambique", "vender mentoria Moçambique", "vender consultoria online Moçambique",
      "área de membros Moçambique", "checkout para infoproduto", "link de checkout infoproduto",
      "página de vendas Moçambique", "funil de vendas Moçambique", "upsell downsell Moçambique",
      "order bump Moçambique", "checkout otimizado Moçambique", "carrinho abandonado recuperação",
      "vender produto digital Moçambique", "monetizar conteúdo Moçambique", "criador de conteúdo Moçambique",
      "afiliados Moçambique", "programa de afiliados Moçambique",
    ],
  },
  {
    title: "Marketing Digital",
    keywords: [
      "marketing digital Moçambique", "tráfego pago Moçambique", "Facebook Ads Moçambique",
      "Instagram Ads Moçambique", "TikTok Ads Moçambique", "Google Ads Moçambique", "anúncios online Moçambique",
      "gestor de tráfego Moçambique", "copywriter Moçambique", "agência marketing Moçambique",
      "landing page Moçambique", "página de captura Moçambique", "lista de e-mail Moçambique",
      "e-mail marketing Moçambique", "automação de marketing Moçambique", "CRM Moçambique",
      "pixel Facebook Moçambique", "conversion API Moçambique", "UTM tracking Moçambique",
      "webhook pagamento Moçambique",
    ],
  },
  {
    title: "E-commerce",
    keywords: [
      "e-commerce Moçambique", "loja virtual Moçambique", "criar loja online Moçambique",
      "abrir loja online Moçambique", "vender online Moçambique", "loja online barata Moçambique",
      "Shopify Moçambique", "WooCommerce Moçambique", "integração loja Moçambique", "plugin pagamento Moçambique",
      "shopping cart Moçambique", "dropshipping Moçambique", "revenda Moçambique", "marketplace Moçambique",
      "pagar com celular loja", "pagamento móvel loja", "loja com M-Pesa", "loja com e-Mola",
      "checkout transparente Moçambique", "one-click checkout Moçambique",
    ],
  },
  {
    title: "SaaS & Subscrições",
    keywords: [
      "subscrição recorrente Moçambique", "assinatura mensal Moçambique", "SaaS Moçambique",
      "cobrança recorrente M-Pesa", "cobrança recorrente e-Mola", "billing Moçambique",
      "gestão de assinaturas Moçambique", "software as a service Moçambique", "app pagamento Moçambique",
      "startup Moçambique", "produto SaaS Maputo", "plano mensal recorrente Moçambique",
      "renovação automática Moçambique", "trial gratuito Moçambique", "freemium Moçambique",
      "downgrade upgrade plano", "gestão de clientes SaaS", "faturação recorrente Moçambique",
      "customer success Moçambique", "churn Moçambique",
    ],
  },
  {
    title: "Local & Long-tail",
    keywords: [
      "receber pagamentos em Maputo", "plataforma pagamento Beira", "gateway Nampula", "pagamentos Matola",
      "fintech Maputo", "sistema pagamento Quelimane", "checkout Tete", "pagar online Pemba",
      "como receber M-Pesa no meu site", "como integrar e-Mola no WordPress", "melhor gateway de pagamento em Moçambique",
      "como vender curso online em Moçambique", "como criar link de pagamento M-Pesa",
      "alternativa PayPal Moçambique", "alternativa Stripe Moçambique", "gateway barato Moçambique",
      "taxas de pagamento Moçambique", "melhor taxa M-Pesa Moçambique", "sem mensalidade gateway Moçambique",
      "cadastro grátis gateway Moçambique",
    ],
  },
  {
    title: "Segurança & Compliance",
    keywords: [
      "pagamento seguro Moçambique", "PCI DSS Moçambique", "antifraude Moçambique", "3D Secure Moçambique",
      "criptografia pagamento", "conformidade Banco de Moçambique", "KYC Moçambique", "AML Moçambique",
      "verificação de identidade Moçambique", "chargeback Moçambique", "disputa de pagamento",
      "risco transacional Moçambique", "SOC 2 fintech", "ISO 27001 pagamentos", "token de pagamento",
      "tokenização Moçambique", "webhook seguro", "assinatura HMAC", "OAuth pagamento", "proteção de dados Moçambique",
    ],
  },
  {
    title: "Desenvolvedores",
    keywords: [
      "API REST pagamento Moçambique", "SDK M-Pesa", "SDK e-Mola", "documentação API Moçambique",
      "webhook M-Pesa", "webhook e-Mola", "sandbox pagamento Moçambique", "ambiente de testes Moçambique",
      "integração backend Moçambique", "Node.js pagamento Moçambique", "PHP integração M-Pesa",
      "Python integração e-Mola", "Laravel gateway Moçambique", "WordPress plugin M-Pesa",
      "Shopify app Moçambique", "WooCommerce plugin e-Mola", "curl API Moçambique", "postman coleção Redox",
      "OpenAPI pagamento Moçambique", "swagger gateway Moçambique",
    ],
  },
  {
    title: "Cauda longa & dúvidas",
    keywords: [
      "como aceitar pagamentos por M-Pesa no meu site em Moçambique",
      "quanto custa integrar e-Mola numa loja online",
      "gateway de pagamento que aceita M-Pesa e cartão em Moçambique",
      "como criar link de pagamento para WhatsApp em Moçambique",
      "melhor forma de vender curso online em Maputo",
      "como receber dinheiro do estrangeiro em Moçambique via M-Pesa",
      "checkout com M-Pesa para Shopify em Moçambique",
      "receber pagamento recorrente em M-Pesa",
      "sistema de afiliados para infoprodutores em Moçambique",
      "plataforma para vender ebook em Maputo",
    ],
  },
];

const ALL = CATEGORIES.flatMap((c) => c.keywords);

export function SeoKeywordsButton() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(ALL.join(", "));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <>
      <button
        type="button"
        aria-label="SEO"
        onClick={() => setOpen(true)}
        className="fixed bottom-2 left-2 z-40 rounded px-2 py-1 text-[10px] tracking-wide text-neutral-500 border border-white/5 bg-transparent opacity-15 hover:opacity-80 hover:bg-white/5 transition-opacity duration-300"
      >
        SEO
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-4xl max-h-[85vh] flex flex-col rounded-xl border border-white/10 bg-neutral-950 text-neutral-100 shadow-2xl overflow-hidden">
            <div className="flex items-start justify-between gap-4 p-5 border-b border-white/10">
              <div>
                <h2 className="text-base font-semibold">
                  Palavras-chave SEO — Redox Pay ({ALL.length}+ keywords otimizadas)
                </h2>
                <p className="mt-1 text-xs text-neutral-400">
                  Cobertura semântica: M-Pesa, e-Mola, infoprodutos, marketing digital, local & long-tail.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="rounded-md p-1.5 text-neutral-400 hover:text-white hover:bg-white/5 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {CATEGORIES.map((cat) => (
                <section key={cat.title}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                    {cat.title} <span className="text-neutral-600">· {cat.keywords.length}</span>
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.keywords.map((k) => (
                      <span
                        key={k}
                        className="text-[11px] px-2 py-1 rounded border border-white/5 bg-white/[0.03] text-neutral-300"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="p-4 border-t border-white/10 bg-neutral-950">
              <button
                onClick={copyAll}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-white text-black text-sm font-semibold py-3 hover:bg-neutral-200 transition"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copiado!" : "Copiar todas as palavras-chave"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default SeoKeywordsButton;
