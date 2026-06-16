// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAdminOverview, listAllProfiles, listAllTransactions,
  listAllWithdrawals, listAllProducts, approveWithdrawal, rejectWithdrawal,
} from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import {
  Shield, Users, Receipt, Package, TrendingUp, AlertTriangle,
  ArrowUpDown, Wallet, DollarSign, CheckCircle2, XCircle, Search,
  BarChart3, UserPlus,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/admin")({ component: AdminPage });

const fmt = (n: number) => new Intl.NumberFormat("pt-MZ", { maximumFractionDigits: 0 }).format(n);
const fmtMT = (n: number) => `${fmt(n)} MT`;
const fmt2 = (n: number) => new Intl.NumberFormat("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

type Tab = "overview" | "users" | "transactions" | "withdrawals" | "products";

function AdminPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");

  const fnOverview = useServerFn(getAdminOverview);
  const fnProfiles = useServerFn(listAllProfiles);
  const fnTx = useServerFn(listAllTransactions);
  const fnWd = useServerFn(listAllWithdrawals);
  const fnProd = useServerFn(listAllProducts);
  const fnApprove = useServerFn(approveWithdrawal);
  const fnReject = useServerFn(rejectWithdrawal);

  const overview = useQuery({ queryKey: ["admin_overview"], queryFn: () => fnOverview(), retry: false });
  const profiles = useQuery({ queryKey: ["admin_profiles"], queryFn: () => fnProfiles(), enabled: tab === "users" });
  const txs = useQuery({ queryKey: ["admin_tx"], queryFn: () => fnTx(), enabled: tab === "transactions" });
  const wds = useQuery({ queryKey: ["admin_wd"], queryFn: () => fnWd(), enabled: tab === "withdrawals" });
  const prods = useQuery({ queryKey: ["admin_prods"], queryFn: () => fnProd(), enabled: tab === "products" });

  const approveM = useMutation({
    mutationFn: (id: string) => fnApprove({ data: { id } }),
    onSuccess: () => { toast.success("Saque aprovado!"); qc.invalidateQueries({ queryKey: ["admin_wd"] }); qc.invalidateQueries({ queryKey: ["admin_overview"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const rejectM = useMutation({
    mutationFn: (id: string) => fnReject({ data: { id } }),
    onSuccess: () => { toast.success("Saque rejeitado"); qc.invalidateQueries({ queryKey: ["admin_wd"] }); qc.invalidateQueries({ queryKey: ["admin_overview"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const isAdmin = !overview.error;

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "overview", label: "Visão Geral", icon: TrendingUp },
    { id: "users", label: "Utilizadores", icon: Users },
    { id: "transactions", label: "Transações", icon: Receipt },
    { id: "withdrawals", label: "Saques", icon: ArrowUpDown },
    { id: "products", label: "Produtos", icon: Package },
  ];

  if (!isAdmin) {
    return (
      <Card className="p-8 bg-white/5 border-white/10 rounded-2xl text-center">
        <Shield className="h-12 w-12 mx-auto text-amber-400 mb-3" />
        <h2 className="text-xl font-semibold">Acesso restrito</h2>
        <p className="text-sm text-muted-foreground mt-1">Esta área requer permissões de administrador.</p>
      </Card>
    );
  }

  const d = overview.data;

  return (
    <div className="space-y-4">
      <div className="px-1 flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary-glow" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
          <p className="text-sm text-muted-foreground">Gestão completa da plataforma Redox Pay</p>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1 bg-secondary rounded-xl p-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? "bg-foreground text-background" : "text-foreground/70 hover:text-foreground"}`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && d && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Utilizadores" value={fmt(d.profiles)} icon={Users} />
            <Stat label="Transações" value={fmt(d.transactions)} icon={Receipt} />
            <Stat label="Produtos" value={fmt(d.products)} icon={Package} />
            <Stat label="Saques" value={fmt(d.withdrawals)} icon={ArrowUpDown} />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Volume pago" value={fmtMT(d.volume_mzn)} icon={TrendingUp} highlight />
            <Stat label="Lucro plataforma" value={fmtMT(d.profit_mzn)} icon={DollarSign} highlight />
            <Stat label="Saldo utilizadores" value={fmtMT(d.user_balance_mzn)} icon={Wallet} />
            <Stat label="Saques pendentes" value={fmtMT(d.pending_withdrawals_mzn)} icon={AlertTriangle} warn />
          </div>

          <Card className="p-5 bg-card/40 border border-white/5 rounded-2xl">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><UserPlus className="h-4 w-4" /> Novos utilizadores (30 dias)</h2>
            <BarChart data={d.user_growth.map(u => ({ label: u.date.slice(5), value: u.count }))} height={120} />
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Card className="p-5 bg-card/40 border border-white/5 rounded-2xl">
              <h2 className="font-semibold mb-3 flex items-center gap-2"><DollarSign className="h-4 w-4" /> Lucro diário</h2>
              <BarChart data={d.revenue_growth.map(u => ({ label: u.date.slice(5), value: Math.round(u.value) }))} height={100} />
            </Card>
            <Card className="p-5 bg-card/40 border border-white/5 rounded-2xl">
              <h2 className="font-semibold mb-3 flex items-center gap-2"><Receipt className="h-4 w-4" /> Transações diárias</h2>
              <BarChart data={d.tx_timeline.map(u => ({ label: u.date.slice(5), value: u.count }))} height={100} />
            </Card>
          </div>

          <Card className="p-5 bg-card/40 border border-white/5 rounded-2xl">
            <h2 className="font-semibold mb-3">Sistema</h2>
            <div className="space-y-2 text-sm">
              <Row label="Gateway" value="Online" color="text-emerald-400" />
              <Row label="Base de dados" value="Operacional" color="text-emerald-400" />
              <Row label="Webhook" value="https://redoxpay.vercel.app/api/public/webhook-payment" color="text-muted-foreground" mono />
            </div>
          </Card>
        </>
      )}

      {tab === "users" && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar por nome, email ou telefone..."
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-card border border-border text-sm" />
          </div>
          <Card className="rounded-2xl shadow-sm divide-y divide-border">
            {(profiles.data ?? [])
              .filter((p: any) => {
                if (!search) return true;
                const q = search.toLowerCase();
                return (p.full_name?.toLowerCase() ?? "").includes(q)
                  || (p.business_name?.toLowerCase() ?? "").includes(q)
                  || (p.phone ?? "").includes(q)
                  || (p.email ?? "").includes(q);
              })
              .map((p: any) => (
                <div key={p.id} className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-xs font-bold">
                    {(p.full_name || p.business_name || "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{p.full_name || p.business_name || "Sem nome"}</p>
                    <p className="text-xs text-muted-foreground">{p.email || p.phone || "—"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{fmtMT(Number(p.balance_mzn ?? 0))}</p>
                    <p className="text-xs text-muted-foreground">{p.city || "—"}</p>
                  </div>
                </div>
              ))}
            {!profiles.data?.length && <p className="p-8 text-center text-sm text-muted-foreground">Nenhum utilizador.</p>}
          </Card>
        </div>
      )}

      {tab === "transactions" && (
        <Card className="rounded-2xl shadow-sm divide-y divide-border">
          {(txs.data ?? []).map((t: any) => {
            const amt = Number(t.amount_mzn);
            const sFee = Math.round((amt * 0.15 + 15) * 100) / 100;
            const rCost = Math.round((amt * 0.12 + 12) * 100) / 100;
            const margin = sFee - rCost;
            return (
            <div key={t.id} className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-xs font-bold ${t.method === 'mpesa' ? 'bg-rose-50 text-[#e11d48]' : t.method === 'emola' ? 'bg-amber-50 text-[#f59e0b]' : 'bg-secondary'}`}>
                {t.method === 'mpesa' ? 'MP' : t.method === 'emola' ? 'EM' : 'CC'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{t.customer_name || "—"}</p>
                <p className="text-xs text-muted-foreground">{t.customer_phone} · {new Date(t.created_at).toLocaleDateString("pt-MZ")}</p>
                {t.status === 'paid' && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    <span className="text-rose-500">Tx vendedor: -{fmt2(sFee)}</span> ·
                    <span className="text-amber-500"> Custo proc.: -{fmt2(rCost)}</span>
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="font-semibold">{fmtMT(amt)}</p>
                {t.status === 'paid' && (
                  <p className="text-xs text-emerald-600">● Sucesso · margem: +{fmt2(margin)}</p>
                )}
                {t.status === 'failed' && <p className="text-xs text-[#e11d48]">● Falhou</p>}
                {t.status === 'pending' && <p className="text-xs text-amber-600">● Pendente</p>}
              </div>
            </div>
          )})}
          {!txs.data?.length && <p className="p-8 text-center text-sm text-muted-foreground">Nenhuma transação.</p>}
        </Card>
      )}

      {tab === "withdrawals" && (
        <div className="space-y-2">
          <Card className="rounded-2xl shadow-sm divide-y divide-border">
            {(wds.data ?? []).map((w: any) => (
              <div key={w.id} className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-xs font-bold">
                  {w.method === 'mpesa' ? 'MP' : w.method === 'emola' ? 'EM' : 'BN'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{w.destination}</p>
                  <p className="text-xs text-muted-foreground">
                    {(w as any).profiles?.full_name || (w as any).profiles?.business_name || "—"}
                    {" · "}{new Date(w.created_at).toLocaleDateString("pt-MZ")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{fmtMT(Number(w.amount_mzn))}</p>
                  {w.status === 'paid' && <p className="text-xs text-emerald-600">● Pago</p>}
                  {w.status === 'pending' && (
                    <div className="flex gap-1 mt-1">
                      <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => approveM.mutate(w.id)} disabled={approveM.isPending}>
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Aprovar
                      </Button>
                      <Button size="sm" className="h-7 text-xs bg-rose-600 hover:bg-rose-700 text-white"
                        onClick={() => rejectM.mutate(w.id)} disabled={rejectM.isPending}>
                        <XCircle className="h-3 w-3 mr-1" /> Rejeitar
                      </Button>
                    </div>
                  )}
                  {w.status === 'failed' && <p className="text-xs text-[#e11d48]">● Rejeitado</p>}
                </div>
              </div>
            ))}
            {!wds.data?.length && <p className="p-8 text-center text-sm text-muted-foreground">Nenhum saque.</p>}
          </Card>
        </div>
      )}

      {tab === "products" && (
        <Card className="rounded-2xl shadow-sm divide-y divide-border">
          {(prods.data ?? []).map((p: any) => (
            <div key={p.id} className="p-4 flex items-center gap-3">
              {p.cover_url ? (
                <img src={p.cover_url} alt={p.name} className="h-10 w-10 rounded-xl object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-xs font-bold">
                  {p.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {(p as any).profiles?.full_name || (p as any).profiles?.business_name || "—"}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{fmtMT(Number(p.price_mzn))}</p>
                <p className={`text-xs ${p.active ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                  {p.active ? '● Activo' : 'Inactivo'}
                </p>
              </div>
            </div>
          ))}
          {!prods.data?.length && <p className="p-8 text-center text-sm text-muted-foreground">Nenhum produto.</p>}
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, icon: Icon, highlight, warn }: { label: string; value: string; icon: any; highlight?: boolean; warn?: boolean }) {
  return (
    <Card className={`p-4 rounded-2xl ${highlight ? 'bg-primary/10 border-primary/30' : warn ? 'bg-amber-500/10 border-amber-500/30' : 'bg-card border-border'}`}>
      <Icon className={`h-5 w-5 mb-2 ${highlight ? 'text-primary-glow' : warn ? 'text-amber-400' : 'text-muted-foreground'}`} />
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold mt-1 ${highlight ? 'text-primary-glow' : warn ? 'text-amber-400' : ''}`}>{value}</p>
    </Card>
  );
}

function Row({ label, value, color, mono }: { label: string; value: string; color: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${color} ${mono ? 'text-xs font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function BarChart({ data, height }: { data: { label: string; value: number }[]; height: number }) {
  const max = Math.max(1, ...data.map(d => d.value));
  const w = 400;
  const h = height;
  const p = 16;
  const step = data.length > 1 ? (w - p * 2) / (data.length - 1) : w - p * 2;
  const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${p + i * step},${h - p - (d.value / max) * (h - p * 2)}`).join(' ');
  const area = `${path} L${p + (data.length - 1) * step},${h - p} L${p},${h - p} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      {[0.25, 0.5, 0.75, 1].map((t, i) => (
        <line key={i} x1={p} x2={w - p} y1={h - p - t * (h - p * 2)} y2={h - p - t * (h - p * 2)} stroke="rgba(255,255,255,0.06)" />
      ))}
      <path d={area} fill="rgba(99,102,241,0.08)" />
      <path d={path} stroke="rgb(99,102,241)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}