// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAdminOverview, listAllProfiles, listAllTransactions,
  listAllWithdrawals, listAllProducts, approveWithdrawal, rejectWithdrawal,
  listUserProducts, getDigitalSignedUrl, getProductHistory,
} from "@/lib/admin.functions";
import { sendTestSms } from "@/lib/integrations.functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Shield, Users, Receipt, Package, TrendingUp, AlertTriangle,
  ArrowUpDown, Wallet, DollarSign, CheckCircle2, XCircle, Search,
  Activity, Zap, Clock, ExternalLink, FileDown, ChevronRight, Send, MessageSquare, History, MousePointerClick,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/dashboard/admin")({ component: AdminPage });

const fmt = (n: number) => new Intl.NumberFormat("pt-MZ", { maximumFractionDigits: 0 }).format(n);
const fmtMT = (n: number) => `${fmt(n)} MT`;
const fmt2 = (n: number) => new Intl.NumberFormat("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const RUBY = "#e11d48";

type Tab = "overview" | "users" | "transactions" | "withdrawals" | "products";

function AdminPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [smsTest, setSmsTest] = useState({ sender_id: "RedoxPay", number: "", message: "Teste admin RedoxPay" });
  const fnTestSms = useServerFn(sendTestSms);
  const testSmsM = useMutation({
    mutationFn: () => fnTestSms({ data: { sender_id: smsTest.sender_id || "RedoxPay", number: `258${smsTest.number.replace(/\D/g, "")}`, message: smsTest.message } }),
    onSuccess: () => toast.success("SMS de teste enviado"),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const fnOverview = useServerFn(getAdminOverview);
  const fnProfiles = useServerFn(listAllProfiles);
  const fnTx = useServerFn(listAllTransactions);
  const fnWd = useServerFn(listAllWithdrawals);
  const fnProd = useServerFn(listAllProducts);
  const fnApprove = useServerFn(approveWithdrawal);
  const fnReject = useServerFn(rejectWithdrawal);
  const fnUserProds = useServerFn(listUserProducts);
  const fnSigned = useServerFn(getDigitalSignedUrl);

  const fnHistory = useServerFn(getProductHistory);
  const [historyProduct, setHistoryProduct] = useState<any | null>(null);

  const userProducts = useQuery({
    queryKey: ["admin_user_products", selectedUser?.id],
    queryFn: () => fnUserProds({ data: { user_id: selectedUser!.id } }),
    enabled: !!selectedUser,
  });

  const productHistory = useQuery({
    queryKey: ["admin_product_history", historyProduct?.id],
    queryFn: () => fnHistory({ data: { product_id: historyProduct!.id } }),
    enabled: !!historyProduct,
  });


  const openDigital = async (path: string) => {
    try {
      const r = await fnSigned({ data: { path } });
      if (r.url) window.open(r.url, "_blank");
      else toast.error("Não foi possível gerar link");
    } catch (e: any) { toast.error(e?.message || "Erro"); }
  };

  const overview = useQuery({ queryKey: ["admin_overview"], queryFn: () => fnOverview(), retry: false });
  const profiles = useQuery({ queryKey: ["admin_profiles"], queryFn: () => fnProfiles(), enabled: tab === "users" });
  const txs = useQuery({ queryKey: ["admin_tx"], queryFn: () => fnTx(), enabled: tab === "transactions" });
  const wds = useQuery({ queryKey: ["admin_wd"], queryFn: () => fnWd(), enabled: tab === "withdrawals" || tab === "overview" });
  const prods = useQuery({ queryKey: ["admin_prods"], queryFn: () => fnProd(), enabled: tab === "products" });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["admin_wd"] });
    qc.invalidateQueries({ queryKey: ["admin_overview"] });
    qc.invalidateQueries({ queryKey: ["admin_tx"] });
    qc.invalidateQueries({ queryKey: ["admin_profiles"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["notifications", "unread"] });
  };

  const approveM = useMutation({
    mutationFn: (id: string) => fnApprove({ data: { id } }),
    onSuccess: () => { toast.success("Saque aprovado"); invalidateAll(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const rejectM = useMutation({
    mutationFn: (id: string) => fnReject({ data: { id } }),
    onSuccess: () => { toast.success("Saque rejeitado"); invalidateAll(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  useEffect(() => {
    let cancelled = false;
    let channel: any = null;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid || cancelled) return;
      channel = supabase
        .channel(`admin:${uid}:live`, { config: { private: true } })
        .on("postgres_changes", { event: "*", schema: "public", table: "withdrawals" }, () => {
          qc.invalidateQueries({ queryKey: ["admin_wd"] });
          qc.invalidateQueries({ queryKey: ["admin_overview"] });
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => {
          qc.invalidateQueries({ queryKey: ["admin_tx"] });
          qc.invalidateQueries({ queryKey: ["admin_overview"] });
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
          qc.invalidateQueries({ queryKey: ["notifications"] });
          qc.invalidateQueries({ queryKey: ["notifications", "unread"] });
        })
        .subscribe();
    })();
    return () => { cancelled = true; if (channel) supabase.removeChannel(channel); };
  }, [qc]);

  const isAdmin = !overview.error;

  const pendingCount = (wds.data ?? []).filter((w: any) => w.status === "pending").length;

  const tabs: { id: Tab; label: string; icon: any; badge?: number }[] = [
    { id: "overview", label: "Visão Geral", icon: TrendingUp },
    { id: "users", label: "Utilizadores", icon: Users },
    { id: "transactions", label: "Transações", icon: Receipt },
    { id: "withdrawals", label: "Saques", icon: ArrowUpDown, badge: pendingCount },
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
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Sidebar de abas */}
      <aside className="lg:w-56 shrink-0">
        <div className="flex items-center gap-2 px-2 pb-3">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: `${RUBY}15`, border: `1px solid ${RUBY}40` }}>
            <Shield className="h-4 w-4" style={{ color: RUBY }} />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight">Admin Console</h1>
            <p className="text-[11px] text-muted-foreground">Redox Pay</p>
          </div>
        </div>
        <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-1">
          {tabs.map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2.5 shrink-0 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left lg:w-full ${active ? "bg-card border border-border shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-card/50"}`}
                style={active ? { color: RUBY, borderLeft: `3px solid ${RUBY}` } : {}}>
                <t.icon className="h-4 w-4" />
                <span className="flex-1">{t.label}</span>
                {t.badge ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: `${RUBY}20`, color: RUBY }}>{t.badge}</span>
                ) : null}
              </button>
            );
          })}
        </nav>
        <div className="hidden lg:block mt-4 p-3 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Gateway</span>
          </div>
          <p className="text-xs">Sistemas operacionais</p>
        </div>
      </aside>

      {/* Conteúdo */}
      <main className="flex-1 min-w-0 space-y-4">
        {tab === "overview" && d && (
          <>
            {pendingCount > 0 && (
              <div className="flex items-center justify-between p-4 rounded-2xl border" style={{ background: `${RUBY}08`, borderColor: `${RUBY}30` }}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: `${RUBY}15`, color: RUBY }}>
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{pendingCount} saque{pendingCount > 1 ? "s" : ""} pendente{pendingCount > 1 ? "s" : ""}</p>
                    <p className="text-xs text-muted-foreground">Total acumulado: {fmtMT(d.pending_withdrawals_mzn)}</p>
                  </div>
                </div>
                <Button onClick={() => setTab("withdrawals")} className="text-white" style={{ background: RUBY }}>Processar agora</Button>
              </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <Kpi label="Lucro hoje" value={fmtMT(d.profit_today_mzn)} icon={DollarSign} accent />
              <Kpi label="Volume pago" value={fmtMT(d.volume_mzn)} icon={TrendingUp} accent />
              <Kpi label="Lucro total" value={fmtMT(d.profit_mzn)} icon={DollarSign} accent />
              <Kpi label="Saldo utilizadores" value={fmtMT(d.user_balance_mzn)} icon={Wallet} />
              <Kpi label="Saques pendentes" value={fmtMT(d.pending_withdrawals_mzn)} icon={AlertTriangle} warn />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Kpi label="Utilizadores" value={fmt(d.profiles)} icon={Users} compact />
              <Kpi label="Transações" value={fmt(d.transactions)} icon={Receipt} compact />
              <Kpi label="Produtos" value={fmt(d.products)} icon={Package} compact />
              <Kpi label="Saques totais" value={fmt(d.withdrawals)} icon={ArrowUpDown} compact />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <Card className="lg:col-span-2 p-5 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold flex items-center gap-2"><Activity className="h-4 w-4" style={{ color: RUBY }} /> Crescimento (30 dias)</h2>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Novos utilizadores</span>
                </div>
                <AreaChart data={d.user_growth.map(u => ({ label: u.date.slice(5), value: u.count }))} height={180} />
              </Card>
              <Card className="p-5 rounded-2xl">
                <h2 className="font-semibold mb-3 flex items-center gap-2"><Zap className="h-4 w-4 text-emerald-500" /> Estado do Sistema</h2>
                <div className="space-y-3 text-sm">
                  <SysRow label="Gateway de pagamento" sub="Latência: 45ms" status="online" />
                  <SysRow label="Base de dados" sub="Carga: baixa" status="online" />
                  <SysRow label="Webhooks externos" sub="Operacional" status="online" />
                </div>
                <div className="mt-4 p-3 rounded-lg bg-secondary border border-border">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Webhook URL</p>
                  <p className="text-[11px] font-mono break-all">https://redoxpay.vercel.app/api/public/webhook-payment</p>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <Card className="p-5 rounded-2xl">
                <h2 className="font-semibold mb-3 flex items-center gap-2"><DollarSign className="h-4 w-4" style={{ color: RUBY }} /> Lucro diário</h2>
                <AreaChart data={d.revenue_growth.map(u => ({ label: u.date.slice(5), value: Math.round(u.value) }))} height={140} />
              </Card>
              <Card className="p-5 rounded-2xl">
                <h2 className="font-semibold mb-3 flex items-center gap-2"><Receipt className="h-4 w-4" style={{ color: RUBY }} /> Transações diárias</h2>
                <AreaChart data={d.tx_timeline.map(u => ({ label: u.date.slice(5), value: u.count }))} height={140} />
              </Card>
            </div>

            <Card className="p-5 rounded-2xl">
              <h2 className="font-semibold mb-3 flex items-center gap-2"><MessageSquare className="h-4 w-4 text-emerald-500" /> Teste de SMS (Hexmo)</h2>
              <p className="text-xs text-muted-foreground mb-3">Envia um SMS de teste via Hexmo para validar a integração.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Sender ID</Label>
                  <Input value={smsTest.sender_id} onChange={e => setSmsTest({ ...smsTest, sender_id: e.target.value })} maxLength={11} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Número (+258)</Label>
                  <Input value={smsTest.number} onChange={e => setSmsTest({ ...smsTest, number: e.target.value.replace(/\D/g, "") })} placeholder="84XXXXXXX" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Mensagem</Label>
                  <Input value={smsTest.message} onChange={e => setSmsTest({ ...smsTest, message: e.target.value })} maxLength={160} />
                </div>
              </div>
              <Button className="mt-3" disabled={testSmsM.isPending || !smsTest.number || !smsTest.message} onClick={() => testSmsM.mutate()}>
                <Send className="h-4 w-4 mr-2" /> {testSmsM.isPending ? "A enviar..." : "Enviar SMS de teste"}
              </Button>
            </Card>
          </>
        )}

        {tab === "users" && (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar por nome, telefone ou cidade…"
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-card border border-border text-sm" />
            </div>
            <Card className="rounded-2xl overflow-hidden">
              <div className="grid grid-cols-12 px-4 py-3 text-[10px] uppercase tracking-wider font-bold text-muted-foreground border-b border-border bg-secondary/40">
                <div className="col-span-5">Utilizador</div>
                <div className="col-span-3">Contacto</div>
                <div className="col-span-2 text-right">Saldo</div>
                <div className="col-span-2 text-right">Registo</div>
              </div>
              <div className="divide-y divide-border">
                {(profiles.data ?? [])
                  .filter((p: any) => {
                    if (!search) return true;
                    const q = search.toLowerCase();
                    return (p.full_name?.toLowerCase() ?? "").includes(q)
                      || (p.business_name?.toLowerCase() ?? "").includes(q)
                      || (p.phone ?? "").includes(q)
                      || (p.city?.toLowerCase() ?? "").includes(q);
                  })
                  .map((p: any) => (
                    <button key={p.id} onClick={() => setSelectedUser(p)}
                      className="w-full grid grid-cols-12 px-4 py-3 items-center text-sm hover:bg-secondary/30 transition-colors text-left">
                      <div className="col-span-5 flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0" style={{ background: `${RUBY}10`, color: RUBY }}>
                          {(p.full_name || p.business_name || "U").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{p.full_name || p.business_name || "Sem nome"}</p>
                          <p className="text-[11px] text-muted-foreground capitalize">{p.account_type || "person"}</p>
                        </div>
                      </div>
                      <div className="col-span-3 text-xs text-muted-foreground truncate">{p.phone || "—"}</div>
                      <div className="col-span-2 text-right font-mono font-semibold">{fmtMT(Number(p.balance_mzn ?? 0))}</div>
                      <div className="col-span-2 text-right text-xs text-muted-foreground flex items-center justify-end gap-1">
                        {new Date(p.created_at).toLocaleDateString("pt-MZ")}
                        <ChevronRight className="h-3 w-3" />
                      </div>
                    </button>
                  ))}
                {!profiles.data?.length && <p className="p-8 text-center text-sm text-muted-foreground">Nenhum utilizador.</p>}
              </div>
            </Card>
          </>
        )}

        {tab === "transactions" && (
          <Card className="rounded-2xl overflow-hidden">
            <div className="grid grid-cols-12 px-4 py-3 text-[10px] uppercase tracking-wider font-bold text-muted-foreground border-b border-border bg-secondary/40">
              <div className="col-span-4">Cliente</div>
              <div className="col-span-2">Método</div>
              <div className="col-span-2 text-right">Valor</div>
              <div className="col-span-2 text-right">Margem</div>
              <div className="col-span-2 text-right">Status</div>
            </div>
            <div className="divide-y divide-border">
              {(txs.data ?? []).map((t: any) => {
                const amt = Number(t.amount_mzn);
                const sFee = Math.round((amt * 0.15 + 15) * 100) / 100;
                const rCost = Math.round((amt * 0.10 + 10) * 100) / 100;
                const margin = sFee - rCost;
                const methodBg = t.method === 'mpesa' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                  : t.method === 'emola' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                  : 'bg-secondary text-muted-foreground border-border';
                return (
                  <div key={t.id} className="grid grid-cols-12 px-4 py-3 items-center text-sm hover:bg-secondary/30 transition-colors">
                    <div className="col-span-4 min-w-0">
                      <p className="font-medium truncate">{t.customer_name || "—"}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{t.customer_phone} · {new Date(t.created_at).toLocaleDateString("pt-MZ")}</p>
                    </div>
                    <div className="col-span-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${methodBg}`}>
                        {t.method || "—"}
                      </span>
                    </div>
                    <div className="col-span-2 text-right font-mono font-semibold">{fmtMT(amt)}</div>
                    <div className="col-span-2 text-right font-mono text-xs">
                      {t.status === 'paid' ? <span className="text-emerald-500">+{fmt2(margin)}</span> : <span className="text-muted-foreground">—</span>}
                    </div>
                    <div className="col-span-2 text-right">
                      {t.status === 'paid' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500">PAGO</span>}
                      {t.status === 'failed' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: `${RUBY}15`, color: RUBY }}>FALHOU</span>}
                      {t.status === 'pending' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500">PENDENTE</span>}
                    </div>
                  </div>
                );
              })}
              {!txs.data?.length && <p className="p-8 text-center text-sm text-muted-foreground">Nenhuma transação.</p>}
            </div>
          </Card>
        )}

        {tab === "withdrawals" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Kpi label="Pendentes" value={String(pendingCount)} icon={Clock} warn />
              <Kpi label="Total acumulado" value={fmtMT((wds.data ?? []).filter((w: any) => w.status === 'pending').reduce((a: number, w: any) => a + Number(w.amount_mzn || 0), 0))} icon={Wallet} />
              <Kpi label="Pagos hoje" value={String((wds.data ?? []).filter((w: any) => w.status === 'paid' && new Date(w.created_at).toDateString() === new Date().toDateString()).length)} icon={CheckCircle2} />
            </div>

            <Card className="rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-secondary/40 flex items-center justify-between">
                <h3 className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Pedidos de saque</h3>
                <span className="text-[11px] text-muted-foreground">{(wds.data ?? []).length} total</span>
              </div>
              <div className="divide-y divide-border">
                {(wds.data ?? []).map((w: any) => {
                  const isPending = w.status === 'pending';
                  return (
                    <div key={w.id} className={`p-4 ${isPending ? 'bg-rose-500/[0.03]' : ''}`}>
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-xl flex items-center justify-center text-[10px] font-bold shrink-0"
                          style={{ background: isPending ? `${RUBY}15` : 'var(--secondary)', color: isPending ? RUBY : 'inherit' }}>
                          {w.method === 'mpesa' ? 'MP' : w.method === 'emola' ? 'EM' : 'BN'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="font-medium text-sm truncate">{(w as any).profiles?.business_name || (w as any).profiles?.full_name || "—"}</p>
                            <p className="font-mono font-bold text-base shrink-0">{fmtMT(Number(w.amount_mzn))}</p>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{w.destination} · {new Date(w.created_at).toLocaleString("pt-MZ")}</p>
                          {isPending ? (
                            <div className="flex gap-2 mt-3">
                              <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => approveM.mutate(w.id)} disabled={approveM.isPending}>
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Aprovar
                              </Button>
                              <Button size="sm" variant="outline" className="h-8 text-xs"
                                onClick={() => rejectM.mutate(w.id)} disabled={rejectM.isPending}>
                                <XCircle className="h-3.5 w-3.5 mr-1" /> Rejeitar
                              </Button>
                            </div>
                          ) : (
                            <div className="mt-2">
                              {w.status === 'paid' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">● PAGO</span>}
                              {w.status === 'rejected' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${RUBY}15`, color: RUBY }}>● REJEITADO</span>}
                              {w.status === 'processing' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">● A PROCESSAR</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {!wds.data?.length && <p className="p-8 text-center text-sm text-muted-foreground">Nenhum saque.</p>}
              </div>
            </Card>
          </>
        )}

        {tab === "products" && (
          <Card className="rounded-2xl overflow-hidden">
            <div className="grid grid-cols-12 px-4 py-3 text-[10px] uppercase tracking-wider font-bold text-muted-foreground border-b border-border bg-secondary/40">
              <div className="col-span-3">Produto</div>
              <div className="col-span-2">Vendedor</div>
              <div className="col-span-1 text-right">Cliques</div>
              <div className="col-span-2 text-right">Vendas</div>
              <div className="col-span-2">Entrega</div>
              <div className="col-span-1 text-right">Preço</div>
              <div className="col-span-1 text-right">Acções</div>
            </div>
            <div className="divide-y divide-border">
              {(prods.data ?? []).map((p: any) => (
                <div key={p.id} className="grid grid-cols-12 px-4 py-3 items-center text-sm hover:bg-secondary/30 transition-colors">
                  <div className="col-span-3 flex items-center gap-3 min-w-0">
                    {p.cover_url ? (
                      <img src={p.cover_url} alt={p.name} className="h-10 w-10 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0" style={{ background: `${RUBY}10`, color: RUBY }}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium truncate flex items-center gap-1.5">
                        {p.active
                          ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                          : <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground shrink-0" />}
                        {p.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase">{p.product_type || "external"}</p>
                    </div>
                  </div>
                  <div className="col-span-2 text-xs text-muted-foreground truncate">
                    {(p as any).profiles?.business_name || (p as any).profiles?.full_name || "—"}
                  </div>
                  <div className="col-span-1 text-right">
                    <p className="font-mono font-bold text-sm inline-flex items-center gap-1 justify-end" style={{ color: p.clicks_count > 0 ? RUBY : undefined }}>
                      <MousePointerClick className="h-3 w-3 opacity-70" />
                      {fmt(Number(p.clicks_count ?? 0))}
                    </p>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="font-mono font-bold text-sm" style={{ color: p.sales_count > 0 ? RUBY : undefined }}>
                      {fmt(Number(p.sales_count ?? 0))}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono">{fmtMT(Number(p.sales_total_mzn ?? 0))}</p>
                  </div>
                  <div className="col-span-2 flex items-center gap-2 min-w-0">
                    {p.delivery_url && (
                      <a href={p.delivery_url} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-secondary hover:bg-secondary/70 truncate max-w-[180px]">
                        <ExternalLink className="h-3 w-3 shrink-0" /><span className="truncate">{p.delivery_url}</span>
                      </a>
                    )}
                    {p.digital_file_path && (
                      <button onClick={() => openDigital(p.digital_file_path)}
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">
                        <FileDown className="h-3 w-3" /> Ficheiro
                      </button>
                    )}
                    {!p.delivery_url && !p.digital_file_path && <span className="text-[11px] text-muted-foreground">—</span>}
                  </div>
                  <div className="col-span-1 text-right font-mono font-semibold">{fmtMT(Number(p.price_mzn))}</div>
                  <div className="col-span-1 text-right">
                    <button onClick={() => setHistoryProduct(p)}
                      className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-secondary hover:bg-secondary/70">
                      <History className="h-3 w-3" /> Histórico
                    </button>
                  </div>
                </div>
              ))}
              {!prods.data?.length && <p className="p-8 text-center text-sm text-muted-foreground">Nenhum produto.</p>}
            </div>
          </Card>
        )}

        <Dialog open={!!historyProduct} onOpenChange={(o) => !o && setHistoryProduct(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-4 w-4" /> Histórico · {historyProduct?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-3">
              {productHistory.isLoading && <p className="text-sm text-muted-foreground">A carregar…</p>}
              {!productHistory.isLoading && !productHistory.data?.length && (
                <p className="text-sm text-muted-foreground p-8 text-center border border-dashed border-border rounded-xl">
                  Nenhuma alteração registada ainda.
                </p>
              )}
              {(productHistory.data ?? []).map((h: any) => (
                <div key={h.id} className="p-3 rounded-xl border border-border bg-card">
                  <p className="text-[11px] text-muted-foreground mb-2 font-mono">
                    {new Date(h.changed_at).toLocaleString("pt-MZ")}
                  </p>
                  <div className="space-y-1.5">
                    {Object.entries(h.changes || {}).map(([field, diff]: any) => (
                      <div key={field} className="text-xs">
                        <span className="font-semibold uppercase text-[10px] text-muted-foreground">{field}</span>
                        <div className="grid grid-cols-2 gap-2 mt-0.5">
                          <div className="px-2 py-1 rounded bg-red-500/10 text-red-600 dark:text-red-400 truncate">
                            <span className="opacity-60 text-[10px]">antes: </span>
                            {String(diff?.old ?? "—")}
                          </div>
                          <div className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 truncate">
                            <span className="opacity-60 text-[10px]">depois: </span>
                            {String(diff?.new ?? "—")}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>


        <Sheet open={!!selectedUser} onOpenChange={(o) => !o && setSelectedUser(null)}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold" style={{ background: `${RUBY}10`, color: RUBY }}>
                  {(selectedUser?.full_name || selectedUser?.business_name || "U").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-base">{selectedUser?.full_name || selectedUser?.business_name || "Utilizador"}</div>
                  <div className="text-xs font-normal text-muted-foreground">{selectedUser?.phone || "—"} · Saldo: {fmtMT(Number(selectedUser?.balance_mzn ?? 0))}</div>
                </div>
              </SheetTitle>
              <SheetDescription>Produtos e ficheiros de entrega</SheetDescription>
            </SheetHeader>
            <div className="mt-5 space-y-2">
              {userProducts.isLoading && <p className="text-sm text-muted-foreground">A carregar…</p>}
              {!userProducts.isLoading && !userProducts.data?.length && (
                <p className="text-sm text-muted-foreground p-8 text-center border border-dashed border-border rounded-xl">Este utilizador ainda não tem produtos.</p>
              )}
              {(userProducts.data ?? []).map((p: any) => (
                <div key={p.id} className="p-3 rounded-xl border border-border bg-card">
                  <div className="flex items-start gap-3">
                    {p.cover_url ? (
                      <img src={p.cover_url} alt={p.name} className="h-12 w-12 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="h-12 w-12 rounded-lg flex items-center justify-center text-xs font-bold shrink-0" style={{ background: `${RUBY}10`, color: RUBY }}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="font-medium text-sm truncate">{p.name}</p>
                        <p className="font-mono font-bold text-sm shrink-0">{fmtMT(Number(p.price_mzn))}</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground uppercase">{p.product_type || "external"} · {p.active ? "Activo" : "Inactivo"}</p>
                      <p className="text-[11px] mt-1">
                        <span className="font-bold" style={{ color: p.sales_count > 0 ? RUBY : undefined }}>{fmt(Number(p.sales_count ?? 0))} venda{p.sales_count === 1 ? "" : "s"}</span>
                        {p.sales_count > 0 && <span className="text-muted-foreground"> · {fmtMT(Number(p.sales_total_mzn ?? 0))}</span>}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <a href={`/c/${p.slug}`} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-secondary hover:bg-secondary/70">
                          <ExternalLink className="h-3 w-3" /> Checkout
                        </a>
                        {p.delivery_url && (
                          <a href={p.delivery_url} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 max-w-full truncate">
                            <ExternalLink className="h-3 w-3 shrink-0" /><span className="truncate">{p.delivery_url}</span>
                          </a>
                        )}
                        {p.digital_file_path && (
                          <button onClick={() => openDigital(p.digital_file_path)}
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">
                            <FileDown className="h-3 w-3" /> Ver ficheiro
                          </button>
                        )}
                        {!p.delivery_url && !p.digital_file_path && (
                          <span className="text-[11px] text-muted-foreground">Sem entrega configurada</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </main>
    </div>
  );
}

function Kpi({ label, value, icon: Icon, accent, warn, compact }: { label: string; value: string; icon: any; accent?: boolean; warn?: boolean; compact?: boolean }) {
  const borderStyle = accent ? { borderLeft: `3px solid ${RUBY}` } : warn ? { borderLeft: `3px solid #f59e0b` } : {};
  return (
    <Card className={`${compact ? 'p-3' : 'p-4'} rounded-2xl`} style={borderStyle}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{label}</span>
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <p className={`${compact ? 'text-lg' : 'text-xl'} font-bold font-mono tracking-tight ${warn ? 'text-amber-500' : ''}`} style={accent ? { color: RUBY } : {}}>{value}</p>
    </Card>
  );
}

function SysRow({ label, sub, status }: { label: string; sub: string; status: 'online' | 'warn' | 'down' }) {
  const color = status === 'online' ? 'bg-emerald-500' : status === 'warn' ? 'bg-amber-500' : 'bg-rose-500';
  const txt = status === 'online' ? 'text-emerald-500' : status === 'warn' ? 'text-amber-500' : 'text-rose-500';
  const label2 = status === 'online' ? 'ONLINE' : status === 'warn' ? 'ATENÇÃO' : 'OFFLINE';
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className={`h-2 w-2 rounded-full ${color} shadow-[0_0_8px] shadow-current`} />
        <div>
          <p className="text-xs font-medium">{label}</p>
          <p className="text-[10px] text-muted-foreground">{sub}</p>
        </div>
      </div>
      <span className={`text-[10px] font-bold ${txt}`}>{label2}</span>
    </div>
  );
}

function AreaChart({ data, height }: { data: { label: string; value: number }[]; height: number }) {
  const max = Math.max(1, ...data.map(d => d.value));
  const w = 400;
  const h = height;
  const p = 12;
  const step = data.length > 1 ? (w - p * 2) / (data.length - 1) : w - p * 2;
  const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${p + i * step},${h - p - (d.value / max) * (h - p * 2)}`).join(' ');
  const area = `${path} L${p + (data.length - 1) * step},${h - p} L${p},${h - p} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="rubyFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={RUBY} stopOpacity="0.25" />
          <stop offset="100%" stopColor={RUBY} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((t, i) => (
        <line key={i} x1={p} x2={w - p} y1={h - p - t * (h - p * 2)} y2={h - p - t * (h - p * 2)} stroke="rgba(255,255,255,0.05)" />
      ))}
      <path d={area} fill="url(#rubyFill)" />
      <path d={path} stroke={RUBY} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
