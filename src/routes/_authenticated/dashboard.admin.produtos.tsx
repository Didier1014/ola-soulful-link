// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listAllProducts } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import { Package, Search, ExternalLink, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/admin/produtos")({
  component: AdminProdutosPage,
});

const fmt = (n: number) => new Intl.NumberFormat("pt-MZ", { maximumFractionDigits: 0 }).format(n);
const fmtMT = (n: number) => `${fmt(n)} MT`;
const RUBY = "#e11d48";

function AdminProdutosPage() {
  const fnProd = useServerFn(listAllProducts);
  const prods = useQuery({ queryKey: ["admin_prods_all"], queryFn: () => fnProd(), retry: false });
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const list = (prods.data as any[]) ?? [];
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter((p: any) =>
      (p.name ?? "").toLowerCase().includes(s) ||
      (p.slug ?? "").toLowerCase().includes(s) ||
      (p.profiles?.business_name ?? "").toLowerCase().includes(s) ||
      (p.profiles?.full_name ?? "").toLowerCase().includes(s)
    );
  }, [prods.data, q]);

  if (prods.isError) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <p className="text-sm text-destructive">Acesso negado — apenas administradores.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link to="/dashboard/admin" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Admin
          </Link>
        </div>
        <div className="text-xs text-muted-foreground">{filtered.length} produto(s)</div>
      </div>

      <div className="flex items-center gap-2">
        <Package className="h-5 w-5" style={{ color: RUBY }} />
        <h1 className="text-xl font-semibold">Todos os produtos</h1>
      </div>

      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, slug ou vendedor…" className="pl-9" />
      </div>

      {prods.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <div className="grid gap-2">
          {filtered.map((p: any) => (
            <Card key={p.id} className="p-3 flex items-center gap-3">
              {p.cover_url ? (
                <img src={p.cover_url} alt="" className="h-14 w-14 rounded object-cover shrink-0" />
              ) : (
                <div className="h-14 w-14 rounded bg-muted shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="font-medium truncate">{p.name}</p>
                  <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-muted">{p.product_type || "external"}</span>
                  {!p.active && <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">inactivo</span>}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  /{p.slug} · {p.profiles?.business_name || p.profiles?.full_name || "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Criado: {new Date(p.created_at).toLocaleString("pt-MZ")}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold" style={{ color: RUBY }}>{fmtMT(Number(p.price_mzn ?? 0))}</p>
                <p className="text-[11px] text-muted-foreground">{fmt(Number(p.sales_count ?? 0))} vendas · {fmt(Number(p.clicks_count ?? 0))} clicks</p>
              </div>
              <a href={`/c/${p.slug}`} target="_blank" rel="noreferrer" className="p-2 rounded hover:bg-muted" title="Abrir checkout">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Card>
          ))}
          {filtered.length === 0 && <p className="text-sm text-muted-foreground">Nenhum produto.</p>}
        </div>
      )}
    </div>
  );
}
