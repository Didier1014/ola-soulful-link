import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, CircleCheck } from "lucide-react";

interface SaleData {
  id: string;
  amount: number;
  currency: string;
  customer_name?: string;
  product_name?: string;
}

const currencies: Record<string, { symbol: string; locale: string }> = {
  MZN: { symbol: "MT", locale: "pt-MZ" },
  BRL: { symbol: "R$", locale: "pt-BR" },
  USD: { symbol: "$", locale: "en-US" },
  ZAR: { symbol: "R", locale: "en-ZA" },
  EUR: { symbol: "€", locale: "de-DE" },
};

function formatMoney(amount: number, currency: string) {
  const c = currencies[currency] ?? currencies.MZN;
  try {
    return amount.toLocaleString(c.locale, { style: "currency", currency });
  } catch {
    return `${c.symbol} ${amount.toFixed(2)}`;
  }
}

export function FloatingSaleNotification() {
  const [queue, setQueue] = useState<SaleData[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const userIdRef = useRef<string | null>(null);

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setQueue((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const enqueue = useCallback((sale: SaleData) => {
    setQueue((prev) => {
      if (prev.some((s) => s.id === sale.id)) return prev;
      return [...prev, sale];
    });
    timers.current.set(
      sale.id,
      setTimeout(() => dismiss(sale.id), 6000),
    );
  }, [dismiss]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id ?? null;
      userIdRef.current = uid;
      if (!uid || cancelled) return;

      channel = supabase
        .channel(`user:${uid}:floating-sale`, { config: { private: true } })
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${uid}`,
          },
          (payload) => {
            const n = payload.new as Record<string, unknown>;
            if (n.type !== "sale") return;
            const d = (n.data ?? {}) as Record<string, unknown>;
            enqueue({
              id: n.id as string,
              amount: Number(d.amount_mzn ?? 0),
              currency: String(d.currency ?? "MZN"),
              customer_name: d.customer_name as string | undefined,
              product_name: d.product_name as string | undefined,
            });
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
      timers.current.forEach((t) => clearTimeout(t));
      timers.current.clear();
    };
  }, [enqueue]);

  if (queue.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {queue.map((sale) => (
        <div
          key={sale.id}
          className="pointer-events-auto animate-slide-in-right bg-gradient-to-br from-[#1a0a0a] to-[#2d1515] border-l-4 border-l-[#ff3333] rounded-xl p-4 shadow-2xl shadow-red-900/40 flex items-start gap-3"
        >
          <div className="h-9 w-9 rounded-full bg-red-600/20 flex items-center justify-center shrink-0">
            <CircleCheck className="h-5 w-5 text-[#ff3333]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-400">Nova venda aprovada!</p>
            <p className="text-sm text-white font-medium truncate">
              de {sale.customer_name || "Cliente"}
              {sale.product_name && <> · {sale.product_name}</>}
            </p>
            <p className="text-lg font-bold mt-0.5" style={{ color: "#ff5555" }}>
              {formatMoney(sale.amount, sale.currency)}
            </p>
          </div>
          <button
            onClick={() => dismiss(sale.id)}
            className="text-gray-500 hover:text-gray-300 shrink-0 mt-0.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
