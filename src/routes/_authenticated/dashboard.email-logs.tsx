import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getEmailLogs } from "@/lib/email-logs.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Mail, RefreshCw, AlertCircle, CheckCircle2, Clock, Ban, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/email-logs")({
  component: EmailLogsPage,
});

const RANGES = [
  { label: "24h", days: 1 },
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
];

const STATUSES = [
  { value: "", label: "Todos" },
  { value: "sent", label: "Enviados" },
  { value: "pending", label: "Pendentes" },
  { value: "dlq", label: "Falhados" },
  { value: "failed", label: "Erro" },
  { value: "suppressed", label: "Bloqueados" },
  { value: "bounced", label: "Devolvidos" },
  { value: "complained", label: "Reclamados" },
];

function statusBadge(s: string) {
  const map: Record<string, { cls: string; icon: any }> = {
    sent: { cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
    pending: { cls: "bg-amber-500/15 text-amber-400 border-amber-500/30", icon: Clock },
    dlq: { cls: "bg-red-500/15 text-red-400 border-red-500/30", icon: XCircle },
    failed: { cls: "bg-red-500/15 text-red-400 border-red-500/30", icon: XCircle },
    suppressed: { cls: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30", icon: Ban },
    bounced: { cls: "bg-orange-500/15 text-orange-400 border-orange-500/30", icon: AlertCircle },
    complained: { cls: "bg-purple-500/15 text-purple-400 border-purple-500/30", icon: AlertCircle },
  };
  const { cls, icon: Icon } = map[s] ?? { cls: "bg-white/5 text-foreground/60 border-white/10", icon: Mail };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border ${cls} font-medium`}>
      <Icon className="h-3 w-3" /> {s}
    </span>
  );
}

function EmailLogsPage() {
  const fetchLogs = useServerFn(getEmailLogs);
  const [days, setDays] = useState(7);
  const [template, setTemplate] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch, isFetching, error } = useQuery({
    queryKey: ["email-logs", days, template, status, search],
    queryFn: () => fetchLogs({ data: { rangeDays: days, template: template || null, status: status || null, search: search || null } }),
    refetchInterval: 15000,
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /> Monitoramento de Emails</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Estado completo de envio (auth + transacionais)</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching} className="h-9 rounded-lg">
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {error ? (
        <Card className="p-4 bg-red-500/10 border-red-500/30 text-red-400 text-sm">
          {(error as Error).message}
        </Card>
      ) : null}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard label="Total" value={data?.stats.total ?? 0} cls="text-foreground" />
        <StatCard label="Enviados" value={data?.stats.sent ?? 0} cls="text-emerald-400" />
        <StatCard label="Pendentes" value={data?.stats.pending ?? 0} cls="text-amber-400" />
        <StatCard label="Falhados" value={(data?.stats.dlq ?? 0) + (data?.stats.failed ?? 0)} cls="text-red-400" />
        <StatCard label="Bloqueados" value={data?.stats.suppressed ?? 0} cls="text-zinc-400" />
        <StatCard label="Devolvidos" value={data?.stats.bounced ?? 0} cls="text-orange-400" />
        <StatCard label="Reclamados" value={data?.stats.complained ?? 0} cls="text-purple-400" />
        <StatCard label="Templates" value={data?.templates.length ?? 0} cls="text-primary" />
      </div>

      {/* Filters */}
      <Card className="p-3 space-y-3 bg-white/[0.02] border-white/5">
        <div className="flex flex-wrap gap-1.5">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                days === r.days ? "bg-primary/20 border-primary/40 text-primary" : "bg-white/5 border-white/10 text-foreground/60 hover:bg-white/10"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground"
          >
            <option value="">Todos os templates</option>
            {(data?.templates ?? []).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm text-foreground"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <Input
            placeholder="Procurar email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 bg-white/5 border-white/10"
          />
        </div>
      </Card>

      {/* Table */}
      <Card className="bg-white/[0.02] border-white/5 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">A carregar…</div>
        ) : !data?.rows.length ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Nenhum email encontrado neste período.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {data.rows.map((r) => (
              <div key={r.id} className="p-3 space-y-1.5 hover:bg-white/[0.02]">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {statusBadge(r.status)}
                    <span className="text-xs font-medium text-foreground/80 truncate">{r.template_name}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString("pt-PT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div className="text-xs text-foreground/60 truncate">{r.recipient_email}</div>
                {r.error_message ? (
                  <div className="text-[11px] text-red-400 bg-red-500/5 border border-red-500/20 rounded px-2 py-1 mt-1 break-all">
                    {r.error_message}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
        {data && data.total_after_filter > data.rows.length ? (
          <div className="p-3 text-center text-[11px] text-muted-foreground border-t border-white/5">
            A mostrar {data.rows.length} de {data.total_after_filter}
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function StatCard({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <Card className="p-3 bg-white/[0.02] border-white/5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold mt-0.5 ${cls}`}>{value}</div>
    </Card>
  );
}
