import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getOperation } from "@/lib/operation.functions";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Users, MousePointer2, FileCheck2, CreditCard, AlertTriangle, RefreshCw, Download, Radio, ArrowDown, Globe, TrendingUp } from "lucide-react";
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useState } from "react";

const operationQuery = (hours = 24, resource?: string) => queryOptions({ queryKey: ["operation", hours, resource], queryFn: () => getOperation({ data: { hours: hours as 24 | 168 | 720, resource } }), refetchInterval: 30000 });
export const Route = createFileRoute("/_authenticated/dashboard/operation")({
  loader: ({ context }) => context.queryClient.ensureQueryData(operationQuery()),
  head: () => ({ meta: [
    { title: "Operação — Monitorização de checkouts | Redox Pay" },
    { name: "description", content: "Acompanhe o funil, as origens dos leads e os pagamentos da sua operação na Redox Pay." },
    { property: "og:title", content: "Operação | Redox Pay" },
    { property: "og:description", content: "Fluxo de leads, conversão e atividade dos seus checkouts." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: OperationPage,
  errorComponent: () => <p role="alert">Não foi possível carregar a operação. Atualize a página para tentar novamente.</p>,
});

const count = (value: number) => new Intl.NumberFormat("pt-MZ").format(value);
const percent = (value: number, total: number) => `${total ? (value / total * 100).toFixed(1) : "0,0"}%`;
const stageLabels: Record<string, string> = { visited: "Chegou ao checkout", started: "A preencher", completed: "Dados preenchidos", attempted: "Pagamento iniciado", pending: "Pagamento pendente", paid: "Pago", failed: "Pagamento falhou", error: "Erro ao iniciar" };
function OperationPage() {
  const [hours, setHours] = useState(24);
  const [resource, setResource] = useState("all");
  const { data: all } = useSuspenseQuery(operationQuery(hours));
  const { data, refetch, isFetching } = useSuspenseQuery(operationQuery(hours, resource === "all" ? undefined : resource));
  const t = data.totals;
  const series = data.hourly.map(point => ({ ...point, label: new Date(point.ts).toLocaleTimeString("pt-MZ", { timeZone: "Africa/Maputo", hour: "2-digit", minute: "2-digit" }) }));
  const peak = series.reduce((best, point) => point.leads > best.leads ? point : best, series[0]);
  const funnel = [
    { label: "Chegaram ao checkout", value: t.visits, icon: Users },
    { label: "Começaram a preencher", value: t.started, icon: MousePointer2 },
    { label: "Preencheram nome e telefone", value: t.completed, icon: FileCheck2 },
    { label: "Clicaram em pagar", value: t.attempted, icon: CreditCard },
    { label: "Pagamento confirmado", value: t.paid, icon: TrendingUp },
  ];
  function exportCsv() {
    const escape = (v: unknown) => `"${String(v).replace(/^[=+@-]/, "'").replaceAll('"', '""')}"`;
    const rows = [["Checkout", "Origem", "Campanha", "Dispositivo", "Etapa", "Entrada", "Última atividade"], ...data.recent.map(r => [r.resource_name, r.source, r.campaign, r.device, stageLabels[r.stage], r.created_at, r.last_seen_at])];
    const url = URL.createObjectURL(new Blob(["\uFEFF" + rows.map(r => r.map(escape).join(";")).join("\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "redox-operacao-atividade.csv"; link.click(); URL.revokeObjectURL(url);
  }
  return <div className="space-y-8 min-w-0">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs text-muted-foreground flex items-center gap-2"><Activity className="size-4 text-primary-glow" /> CONTROLO DA OPERAÇÃO</p><h1 className="text-3xl font-semibold mt-2">Operação</h1><p className="text-xs text-muted-foreground mt-2">{new Date(data.updated_at).toLocaleString("pt-MZ", { timeZone: "Africa/Maputo" })} · Hora de Moçambique</p></div>
      <div className="flex gap-2 items-center"><span className="flex items-center gap-2 text-xs text-success mr-2"><Radio className="size-4" />{count(t.active)} ativos · 5 min</span><Button variant="outline" size="icon" title="Atualizar operação" aria-label="Atualizar operação" onClick={() => refetch()}><RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} /></Button><Button variant="outline" size="icon" title="Exportar atividade recente" aria-label="Exportar atividade recente" onClick={exportCsv}><Download className="size-4" /></Button></div>
    </header>
    <div className="flex flex-wrap gap-3">
      <Select value={String(hours)} onValueChange={v => setHours(Number(v))}><SelectTrigger className="w-40" aria-label="Período"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="24">Últimas 24 horas</SelectItem><SelectItem value="168">Últimos 7 dias</SelectItem><SelectItem value="720">Últimos 30 dias</SelectItem></SelectContent></Select>
      <Select value={resource} onValueChange={setResource}><SelectTrigger className="w-64 max-w-full" aria-label="Checkout"><SelectValue placeholder="Todos os checkouts" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os checkouts</SelectItem>{all.resources.map(r => <SelectItem key={r.resource_id} value={r.resource_id}>{r.resource_name}</SelectItem>)}</SelectContent></Select>
    </div>
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {[{ label: "Leads no checkout", value: count(t.visits), sub: "Sessões únicas", icon: Users, tone: "text-primary-glow" }, { label: "Conversão em venda", value: percent(t.paid, t.visits), sub: `${count(t.paid)} pagamentos confirmados`, icon: TrendingUp, tone: "text-success" }, { label: "Pagamentos falhados", value: count(t.failed), sub: `${count(t.errors)} sessões com erro ao iniciar`, icon: AlertTriangle, tone: "text-destructive" }, { label: "Abandono do formulário", value: count(t.abandoned), sub: "Sem pagar e inativos há 30 min", icon: MousePointer2, tone: "text-muted-foreground" }].map(k => <article key={k.label} className="rounded-lg border border-border bg-card p-5 min-w-0"><div className="flex items-center justify-between gap-2"><p className="text-xs text-muted-foreground">{k.label}</p><k.icon className={`size-4 shrink-0 ${k.tone}`} /></div><p className={`text-3xl font-semibold tabular-nums mt-4 ${k.tone}`}>{k.value}</p><p className="text-xs text-muted-foreground mt-3">{k.sub}</p></article>)}
    </div>
    {t.visits === 0 && <p role="status" className="border-l-2 border-primary pl-4 text-sm text-muted-foreground">Ainda sem leads registados neste período. A recolha começa com as novas visitas aos checkouts.</p>}
    <section className="border-y border-border py-6">
      <div className="flex flex-wrap justify-between gap-3 mb-6"><h2 className="font-semibold flex items-center gap-2"><Activity className="size-4 text-primary-glow" />Fluxo de leads · 24 horas</h2><p className="text-xs text-muted-foreground">Pico: {peak?.leads ? `${peak.label} · ${count(peak.leads)} leads` : "—"}</p></div>
      <div className="flex flex-wrap gap-4 mb-5 text-xs text-muted-foreground"><span className="text-primary-glow">● Chegadas</span><span className="text-foreground">● Dados preenchidos</span><span className="text-success">● Pagos</span></div>
      <div className="h-72 w-full min-w-0"><ResponsiveContainer width="100%" height="100%"><AreaChart data={series} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="label" stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} minTickGap={28} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} /><Tooltip content={({ active, payload, label }) => active && payload?.length ? <div className="bg-popover text-popover-foreground border border-border rounded-md px-4 py-3 text-xs"><strong>{label}</strong>{payload.map(p => <p key={String(p.dataKey)} className="mt-2">{p.name}: {p.value}</p>)}</div> : null} /><Area name="Chegadas" dataKey="leads" type="monotone" stroke="var(--primary-glow)" fill="var(--primary-glow)" fillOpacity={0.1} strokeWidth={2} /><Area name="Dados preenchidos" dataKey="completed" type="monotone" stroke="var(--foreground)" fill="var(--foreground)" fillOpacity={0.02} strokeWidth={1.5} /><Area name="Pagos" dataKey="paid" type="monotone" stroke="var(--success)" fill="var(--success)" fillOpacity={0.05} strokeWidth={2} /></AreaChart></ResponsiveContainer></div>
    </section>
    <div className="grid lg:grid-cols-2 gap-10">
      <section><h2 className="font-semibold mb-5">Funil do checkout</h2><div className="space-y-3">{funnel.map((step, i) => <div key={step.label}><div className="flex items-center gap-3 py-2"><step.icon className={`size-4 shrink-0 ${i === 4 ? "text-success" : "text-primary-glow"}`} /><span className="text-sm flex-1">{step.label}</span><span className="font-semibold tabular-nums">{count(step.value)}</span><span className="text-xs text-muted-foreground w-14 text-right">{percent(step.value, t.visits)}</span></div><progress className="w-full h-1 accent-primary" value={step.value} max={Math.max(t.visits, 1)} aria-label={step.label} />{i < 4 && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2"><ArrowDown className="size-3" />{percent(funnel[i + 1].value, step.value)} avançaram</p>}</div>)}</div><p className="mt-5 text-xs text-muted-foreground">{count(t.pending)} pagamentos pendentes · Valores por sessão, não por tentativa.</p></section>
      <section><h2 className="font-semibold mb-5 flex items-center gap-2"><Globe className="size-4 text-primary-glow" />Origens dos leads</h2><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-xs text-muted-foreground border-b border-border"><th className="text-left py-3 font-normal">Origem</th><th className="text-right font-normal">Leads</th><th className="text-right font-normal">Pagos</th><th className="text-right font-normal">Conversão</th></tr></thead><tbody>{data.sources.map(s => <tr key={s.source} className="border-b border-border"><td className="py-4 break-all pr-3">{s.source}</td><td className="text-right tabular-nums">{count(s.leads)}</td><td className="text-right tabular-nums text-success">{count(s.paid)}</td><td className="text-right tabular-nums">{percent(s.paid, s.leads)}</td></tr>)}</tbody></table></div>{!data.sources.length && <p className="text-muted-foreground text-sm py-8">Sem origens neste período.</p>}</section>
    </div>
    <section className="border-t border-border pt-6"><h2 className="font-semibold mb-5">Atividade recente</h2><div className="overflow-x-auto"><table className="w-full text-sm min-w-[660px]"><thead><tr className="text-xs text-muted-foreground border-b border-border">{["Lead", "Checkout", "Origem / campanha", "Dispositivo", "Etapa", "Última atividade"].map(label => <th key={label} className="text-left py-3 pr-4 font-normal">{label}</th>)}</tr></thead><tbody>{data.recent.map(r => <tr key={r.id} className="border-b border-border"><td className="py-4 pr-4 font-mono text-xs text-muted-foreground">{r.id.slice(0, 8)}</td><td className="pr-4 max-w-48 break-words">{r.resource_name}</td><td className="pr-4 max-w-48 break-words">{r.source}{r.campaign && <p className="text-xs text-muted-foreground mt-1">{r.campaign}</p>}</td><td className="pr-4 text-xs text-muted-foreground">{r.device === "mobile" ? "Telemóvel" : r.device === "tablet" ? "Tablet" : "Computador"}</td><td className={`pr-4 text-xs ${r.stage === "paid" ? "text-success" : ["failed", "error"].includes(r.stage) ? "text-destructive" : "text-foreground"}`}>{stageLabels[r.stage]}</td><td className="text-xs text-muted-foreground">{new Date(r.last_seen_at).toLocaleTimeString("pt-MZ", { timeZone: "Africa/Maputo", hour: "2-digit", minute: "2-digit" })}</td></tr>)}</tbody></table></div>{!data.recent.length && <p className="text-sm text-muted-foreground py-8">Nenhuma atividade registada.</p>}<p className="text-xs text-muted-foreground mt-5">Leads anónimos · Sem guardar o conteúdo dos campos · Pagamentos de teste excluídos das vendas</p></section>
  </div>;
}