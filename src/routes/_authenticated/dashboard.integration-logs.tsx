import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listIntegrationLogs } from "@/lib/integration-logs.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard/integration-logs")({
  component: IntegrationLogsPage,
  errorComponent: ({ error }) => <div className="p-6 text-sm text-red-500">{String(error)}</div>,
  notFoundComponent: () => <div className="p-6">Not found</div>,
});

function IntegrationLogsPage() {
  const fetchLogs = useServerFn(listIntegrationLogs);
  const [txFilter, setTxFilter] = useState("");
  const [applied, setApplied] = useState("");

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["integration-logs", applied],
    queryFn: () => fetchLogs({ data: { transactionId: applied || undefined, limit: 200 } }),
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Logs de Integração (LowTrack / Utmify)</h1>
        <Button size="sm" variant="outline" onClick={() => refetch()}>Atualizar</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtrar por ID de venda</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder="Cole o transaction_id (UUID)"
            value={txFilter}
            onChange={(e) => setTxFilter(e.target.value.trim())}
          />
          <Button onClick={() => setApplied(txFilter)}>Filtrar</Button>
          <Button variant="ghost" onClick={() => { setTxFilter(""); setApplied(""); }}>Limpar</Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : logs.length === 0 ? (
        <div className="text-sm text-muted-foreground">Sem registros.</div>
      ) : (
        <div className="space-y-2">
          {logs.map((l: any) => {
            const success = l.error == null && l.ok === true;
            return (
              <Card key={l.id}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant={success ? "default" : "destructive"}>
                      {l.provider}
                    </Badge>
                    <span className="font-mono">
                      {l.error ? "ERRO" : `HTTP ${l.status_code ?? "?"}`}
                    </span>
                    <span className="text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span>
                    <span className="text-muted-foreground font-mono truncate">
                      sale:{l.transaction_id}
                    </span>
                  </div>
                  {l.error && (
                    <pre className="text-xs bg-red-500/10 p-2 rounded overflow-x-auto">{l.error}</pre>
                  )}
                  {l.response_body && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground">Resposta</summary>
                      <pre className="mt-1 p-2 rounded bg-muted overflow-x-auto whitespace-pre-wrap">{l.response_body}</pre>
                    </details>
                  )}
                  {l.request_payload && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground">Payload enviado</summary>
                      <pre className="mt-1 p-2 rounded bg-muted overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(l.request_payload, null, 2)}
                      </pre>
                    </details>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
