// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listAllProfiles, getUserDetails } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMemo, useState } from "react";
import { Users, Search, ArrowLeft, ExternalLink, Mail, Phone, MapPin, Wallet, Package, Receipt, ArrowUpDown, Bell, Shield, Key, Calendar, Home } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/admin/usuarios")({
  component: AdminUsuariosPage,
});

const fmt = (n: number) => new Intl.NumberFormat("pt-MZ", { maximumFractionDigits: 0 }).format(n);
const fmtMT = (n: number) => `${fmt(Number(n ?? 0))} MT`;
const RUBY = "#e11d48";

function AdminUsuariosPage() {
  const fnList = useServerFn(listAllProfiles);
  const fnDetails = useServerFn(getUserDetails);
  const list = useQuery({ queryKey: ["admin_users_all"], queryFn: () => fnList(), retry: false });
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const details = useQuery({
    queryKey: ["admin_user_details", selectedId],
    queryFn: () => fnDetails({ data: { user_id: selectedId! } }),
    enabled: !!selectedId,
  });

  const filtered = useMemo(() => {
    const arr = (list.data as any[]) ?? [];
    const s = q.trim().toLowerCase();
    if (!s) return arr;
    return arr.filter((p: any) =>
      (p.full_name ?? "").toLowerCase().includes(s) ||
      (p.business_name ?? "").toLowerCase().includes(s) ||
      (p.phone ?? "").includes(s) ||
      (p.city ?? "").toLowerCase().includes(s) ||
      (p.id ?? "").toLowerCase().includes(s)
    );
  }, [list.data, q]);

  if (list.isError) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <p className="text-sm text-destructive">Acesso negado — apenas administradores.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Link to="/dashboard/admin" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Admin
        </Link>
        <div className="text-xs text-muted-foreground">{filtered.length} utilizador(es)</div>
      </div>

      <div className="flex items-center gap-2">
        <Users className="h-5 w-5" style={{ color: RUBY }} />
        <h1 className="text-xl font-semibold">Todos os utilizadores</h1>
      </div>

      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, negócio, telefone, cidade ou ID…" className="pl-9" />
      </div>

      {list.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <div className="grid gap-2">
          {filtered.map((p: any) => (
            <Card key={p.id} className="p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/40 transition" onClick={() => setSelectedId(p.id)}>
              <div className="h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: `${RUBY}15`, color: RUBY }}>
                {(p.full_name ?? p.business_name ?? "?").slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="font-medium truncate">{p.full_name || p.business_name || "Sem nome"}</p>
                  <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-muted">{p.account_type}</span>
                  {p.is_merchant && <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary">merchant</span>}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {p.phone || "—"} · {p.city || "—"} · Registo: {new Date(p.created_at).toLocaleDateString("pt-MZ")}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold" style={{ color: RUBY }}>{fmtMT(p.balance_mzn)}</p>
                <p className="text-[11px] text-muted-foreground">saldo</p>
              </div>
            </Card>
          ))}
          {filtered.length === 0 && <p className="text-sm text-muted-foreground">Nenhum utilizador.</p>}
        </div>
      )}

      <Sheet open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalhes do utilizador</SheetTitle>
          </SheetHeader>
          {details.isLoading && <p className="text-sm text-muted-foreground mt-4">Carregando…</p>}
          {details.data && (
            <div className="mt-4 space-y-4">
              <Card className="p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full flex items-center justify-center font-bold" style={{ background: `${RUBY}15`, color: RUBY }}>
                    {(details.data.profile?.full_name ?? "?").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold">{details.data.profile?.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{details.data.profile?.business_name || "—"}</p>
                  </div>
                  {details.data.roles?.length > 0 && (
                    <span className="ml-auto text-[10px] uppercase px-2 py-1 rounded bg-primary/10 text-primary inline-flex items-center gap-1">
                      <Shield className="h-3 w-3" /> {details.data.roles.join(", ")}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                  <InfoRow icon={Mail} label="Email" value={details.data.email || "—"} />
                  <InfoRow icon={Phone} label="Telefone" value={details.data.profile?.phone || "—"} />
                  <InfoRow icon={Phone} label="WhatsApp" value={details.data.profile?.whatsapp || "—"} />
                  <InfoRow icon={MapPin} label="Cidade" value={details.data.profile?.city || "—"} />
                  <InfoRow icon={Calendar} label="Data nasc." value={details.data.profile?.birth_date ? new Date(details.data.profile.birth_date).toLocaleDateString("pt-MZ") : "—"} />
                  <InfoRow icon={MapPin} label="Província" value={details.data.profile?.province || "—"} />
                  <InfoRow icon={Home} label="Bairro" value={details.data.profile?.neighborhood || "—"} />
                  <InfoRow icon={Wallet} label="M-Pesa payout" value={details.data.profile?.payout_mpesa_phone || "—"} />
                  <InfoRow icon={Wallet} label="e-Mola payout" value={details.data.profile?.payout_emola_phone || "—"} />
                  <InfoRow icon={Key} label="API key" value={details.data.profile?.api_key_active ? "activa" : "inactiva"} />
                  <InfoRow icon={Shield} label="Último login" value={details.data.last_sign_in_at ? new Date(details.data.last_sign_in_at).toLocaleString("pt-MZ") : "—"} />
                </div>
                <p className="text-[10px] text-muted-foreground pt-2 font-mono break-all">ID: {details.data.profile?.id}</p>
              </Card>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Stat label="Saldo" value={fmtMT(details.data.profile?.balance_mzn)} />
                <Stat label="Receita" value={fmtMT(details.data.stats.total_revenue_mzn)} />
                <Stat label="Volume" value={fmtMT(details.data.stats.total_volume_mzn)} />
                <Stat label="Taxas" value={fmtMT(details.data.stats.total_fees_mzn)} />
                <Stat label="Produtos" value={fmt(details.data.stats.products_count)} icon={Package} />
                <Stat label="Transações" value={fmt(details.data.stats.transactions_count)} icon={Receipt} />
                <Stat label="Saques pagos" value={fmtMT(details.data.stats.withdrawals_paid_mzn)} icon={ArrowUpDown} />
                <Stat label="Saques pendentes" value={fmtMT(details.data.stats.withdrawals_pending_mzn)} />
              </div>

              <Section title="Produtos" icon={Package} count={details.data.products.length}>
                {details.data.products.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">/{p.slug} · {p.product_type} · {p.active ? "activo" : "inactivo"}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold" style={{ color: RUBY }}>{fmtMT(p.price_mzn)}</span>
                      <a href={`/c/${p.slug}`} target="_blank" rel="noreferrer" className="p-1.5 rounded hover:bg-muted"><ExternalLink className="h-3.5 w-3.5" /></a>
                    </div>
                  </div>
                ))}
                {details.data.products.length === 0 && <p className="text-xs text-muted-foreground py-2">Sem produtos.</p>}
              </Section>

              <Section title="Transações recentes" icon={Receipt} count={details.data.transactions.length}>
                {details.data.transactions.slice(0, 20).map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 text-sm">
                    <div className="min-w-0">
                      <p className="text-xs font-mono truncate">{t.external_ref || t.id.slice(0, 8)}</p>
                      <p className="text-[11px] text-muted-foreground">{new Date(t.created_at).toLocaleString("pt-MZ")}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{fmtMT(t.amount_mzn)}</p>
                      <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${t.status === "paid" ? "bg-emerald-500/10 text-emerald-500" : t.status === "pending" ? "bg-amber-500/10 text-amber-500" : "bg-destructive/10 text-destructive"}`}>{t.status}</span>
                    </div>
                  </div>
                ))}
                {details.data.transactions.length === 0 && <p className="text-xs text-muted-foreground py-2">Sem transações.</p>}
              </Section>

              <Section title="Saques" icon={ArrowUpDown} count={details.data.withdrawals.length}>
                {details.data.withdrawals.map((w: any) => (
                  <div key={w.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 text-sm">
                    <div className="min-w-0">
                      <p className="truncate">{w.method || "—"} · {w.destination || "—"}</p>
                      <p className="text-[11px] text-muted-foreground">{new Date(w.created_at).toLocaleString("pt-MZ")}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{fmtMT(w.amount_mzn)}</p>
                      <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${w.status === "paid" ? "bg-emerald-500/10 text-emerald-500" : w.status === "pending" ? "bg-amber-500/10 text-amber-500" : "bg-destructive/10 text-destructive"}`}>{w.status}</span>
                    </div>
                  </div>
                ))}
                {details.data.withdrawals.length === 0 && <p className="text-xs text-muted-foreground py-2">Sem saques.</p>}
              </Section>

              <Section title="Notificações" icon={Bell} count={details.data.notifications.length}>
                {details.data.notifications.slice(0, 20).map((n: any) => (
                  <div key={n.id} className="py-2 border-b border-border/50 last:border-0 text-sm">
                    <div className="flex justify-between gap-2">
                      <p className="font-medium">{n.title}</p>
                      <p className="text-[11px] text-muted-foreground shrink-0">{new Date(n.created_at).toLocaleDateString("pt-MZ")}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{n.message}</p>
                  </div>
                ))}
                {details.data.notifications.length === 0 && <p className="text-xs text-muted-foreground py-2">Sem notificações.</p>}
              </Section>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-start gap-1.5 min-w-0">
      <Icon className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
        <p className="truncate">{value}</p>
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: any) {
  return (
    <Card className="p-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
      </div>
      <p className="text-sm font-bold mt-1">{value}</p>
    </Card>
  );
}

function Section({ title, icon: Icon, count, children }: any) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4" style={{ color: RUBY }} />
        <h3 className="font-semibold text-sm">{title}</h3>
        <span className="text-[10px] uppercase text-muted-foreground ml-auto">{count}</span>
      </div>
      <div>{children}</div>
    </Card>
  );
}
