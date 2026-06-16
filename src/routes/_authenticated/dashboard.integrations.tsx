// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getIntegrationSettings, saveIntegrationSetting, deleteIntegrationSetting } from "@/lib/integrations.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  TrendingUp, Gavel, BarChart3, Webhook,
  ChevronRight, Copy, CheckCircle2, ExternalLink, Trash2,
  Smartphone, type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/dashboard/integrations")({
  component: IntegrationsPage,
});

type IntegrationId = "utimify" | "lowtrack" | "meta_pixel" | "moz_sms" | "webhooks";

interface Integration {
  id: IntegrationId;
  group: string;
  name: string;
  desc: string;
  icon: LucideIcon;
  color: string;
  fields: { key: string; label: string; type: "text" | "password" | "textarea" | "url"; placeholder?: string }[];
  docUrl?: string;
}

const INTEGRATIONS: Integration[] = [
  {
    id: "utimify", group: "MARKETING",
    name: "Utmify", desc: "Rastreie conversões e atribuição UTM das suas vendas.",
    icon: TrendingUp, color: "bg-violet-50 text-violet-600",
    fields: [
      { key: "api_token", label: "API Token", type: "password", placeholder: "Cole o token gerado em Integrações > Webhooks > Credenciais" },
    ],
    docUrl: "https://app.utmify.com.br/dashboards",
  },
  {
    id: "lowtrack", group: "MARKETING",
    name: "LowTrack", desc: "Rastreador inteligente para baixar CPA. Envia dados de vendas para a Meta.",
    icon: TrendingUp, color: "bg-blue-50 text-blue-600",
    fields: [
      { key: "webhook_url", label: "Webhook URL (opcional)", type: "url", placeholder: "https://api.lowtrack.com.br/webhook" },
    ],
    docUrl: "https://lowtrack.com.br",
  },
  {
    id: "meta_pixel", group: "MARKETING",
    name: "Meta Pixel (Facebook)", desc: "Acompanhe conversões e crie públicos personalizados no Facebook/Instagram.",
    icon: BarChart3, color: "bg-sky-50 text-sky-600",
    fields: [
      { key: "pixel_id", label: "Pixel ID", type: "text", placeholder: "1234567890" },
      { key: "access_token", label: "Access Token (opcional)", type: "password", placeholder: "EA..." },
    ],
    docUrl: "https://developers.facebook.com/docs/meta-pixel",
  },
  {
    id: "moz_sms", group: "COMUNICAÇÃO",
    name: "MOZ SMS", desc: "Envie SMS em Moçambique via API da MOZ SMS. Usado para notificações de pagamento.",
    icon: Smartphone, color: "bg-emerald-50 text-emerald-600",
    fields: [
      { key: "api_token", label: "API Token", type: "password", placeholder: "mozsms_..." },
      { key: "sender_id", label: "Sender ID", type: "text", placeholder: "RedoxPay" },
    ],
    docUrl: "https://mozsms.co.mz/docs",
  },
  {
    id: "webhooks", group: "DESENVOLVEDOR",
    name: "Webhooks", desc: "Receba notificações em tempo real de eventos da sua conta (pagamentos, reembolsos, etc.).",
    icon: Webhook, color: "bg-amber-50 text-amber-600",
    fields: [
      { key: "callback_url", label: "Callback URL", type: "url", placeholder: "https://seu-sistema.com/webhook" },
      { key: "secret", label: "Segredo (para validar payloads)", type: "password", placeholder: "whsec_..." },
    ],
    docUrl: "#",
  },
];

const fmtBaseUrl = typeof window !== "undefined" ? window.location.origin : "";

const REDOX_WEBHOOK_URL = `${fmtBaseUrl}/api/public/webhook-payment`;

function IntegrationsPage() {
  const qc = useQueryClient();
  const fetchSettings = useServerFn(getIntegrationSettings);
  const { data: savedSettings = [] } = useQuery({
    queryKey: ["integration_settings"],
    queryFn: () => fetchSettings(),
  });

  const settingsMap = useMemo(() => {
    const m = new Map<string, Record<string, string>>();
    savedSettings.forEach((s: { integration_key: string; settings: Record<string, string> }) => m.set(s.integration_key, s.settings));
    return m;
  }, [savedSettings]);

  const [selected, setSelected] = useState<IntegrationId | null>(null);
  const groups = Array.from(new Set(INTEGRATIONS.map(i => i.group)));

  if (selected) {
    const it = INTEGRATIONS.find(i => i.id === selected)!;
    return (
      <IntegrationDetail
        integration={it}
        initial={settingsMap.get(selected) || {}}
        onBack={() => setSelected(null)}
        onSaved={() => qc.invalidateQueries({ queryKey: ["integration_settings"] })}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h1 className="text-2xl font-semibold tracking-tight">Integrações</h1>
        <p className="text-sm text-muted-foreground">Conecte ferramentas externas para automatizar, rastrear e notificar as suas vendas</p>
      </div>

      {groups.map(g => (
        <div key={g} className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground px-1">{g}</p>
          {INTEGRATIONS.filter(i => i.group === g).map(it => {
            const saved = settingsMap.get(it.id);
            const configured = saved && Object.keys(saved).length > 0 && Object.values(saved).some(v => v);
            return (
              <Card key={it.id} className="rounded-2xl shadow-sm p-5">
                <div className="flex items-start justify-between">
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${it.color}`}><it.icon className="h-5 w-5" /></div>
                  {configured ? (
                    <span className="text-xs px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Configurado
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-md bg-sky-50 text-sky-700">Disponível</span>
                  )}
                </div>
                <h3 className="mt-3 font-semibold">{it.name}</h3>
                <p className="text-sm text-muted-foreground">{it.desc}</p>
                <button onClick={() => setSelected(it.id)} className="mt-3 text-sm text-sky-600 flex items-center gap-1 font-medium">
                  {configured ? "Reconfigurar" : "Configurar"} <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </Card>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function IntegrationDetail({
  integration, initial, onBack, onSaved,
}: {
  integration: Integration;
  initial: Record<string, string>;
  onBack: () => void;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const saveFn = useServerFn(saveIntegrationSetting);
  const deleteFn = useServerFn(deleteIntegrationSetting);
  const [values, setValues] = useState<Record<string, string>>(initial);
  const configured = Object.keys(initial).length > 0 && Object.values(initial).some(v => v);

  const saveM = useMutation({
    mutationFn: () => saveFn({ data: { integration_key: integration.id, settings: values } }),
    onSuccess: () => { toast.success(`${integration.name} configurado com sucesso!`); onSaved(); qc.invalidateQueries({ queryKey: ["integration_settings"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao guardar"),
  });

  const deleteM = useMutation({
    mutationFn: () => deleteFn({ data: { integration_key: integration.id } }),
    onSuccess: () => { toast.success("Configuração removida"); onSaved(); qc.invalidateQueries({ queryKey: ["integration_settings"] }); onBack(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-muted-foreground">← Voltar para integrações</button>

      <div className="flex items-start gap-3">
        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${integration.color}`}>
          <integration.icon className="h-6 w-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">{integration.name}</h1>
            {configured && <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">● Ativo</span>}
          </div>
          <p className="text-sm text-muted-foreground max-w-md">{integration.desc}</p>
        </div>
      </div>

      {integration.id === "webhooks" && (
        <Card className="rounded-2xl shadow-sm p-5 bg-primary/5 border-primary/20">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Webhook Redox Pay (receber eventos)</h3>
          <p className="text-xs text-muted-foreground mb-2">URL para receber atualizações de pagamento em tempo real:</p>
          <code className="block p-3 rounded-lg bg-black/40 border border-white/10 text-xs break-all font-mono">{REDOX_WEBHOOK_URL}</code>
          <Button
            variant="outline" size="sm"
            className="mt-2 rounded-xl bg-white/5 border-white/10"
            onClick={() => { navigator.clipboard.writeText(REDOX_WEBHOOK_URL); toast.success("URL copiado"); }}
          >
            <Copy className="h-3.5 w-3.5 mr-1" /> Copiar URL
          </Button>
        </Card>
      )}

      <Card className="rounded-2xl shadow-sm p-5">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Como funciona</h3>
        <ol className="space-y-3 text-sm">
          {[
            `Obtenha as suas credenciais no painel do ${integration.name}`,
            "Insira os dados nos campos abaixo e guarde",
            integration.id === "webhooks"
              ? "Enviaremos eventos em tempo real para o seu URL"
              : `Os dados serão enviados automaticamente para o ${integration.name}`,
          ].map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="h-5 w-5 rounded-full bg-violet-100 text-violet-700 text-xs flex items-center justify-center font-semibold shrink-0">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        {integration.docUrl && integration.docUrl !== "#" && (
          <a href={integration.docUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-primary-glow hover:underline">
            <ExternalLink className="h-3 w-3" /> Documentação oficial
          </a>
        )}
      </Card>

      <Card className="rounded-2xl shadow-sm p-5 space-y-4">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Configuração</h3>
        {integration.fields.map(f => (
          <div key={f.key} className="space-y-2">
            <Label>{f.label}</Label>
            {f.type === "textarea" ? (
              <Textarea
                value={values[f.key] || ""}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                placeholder={f.placeholder}
              />
            ) : (
              <Input
                type={f.type === "password" ? "password" : "text"}
                value={values[f.key] || ""}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                className="font-mono"
              />
            )}
          </div>
        ))}
        <div className="flex justify-between pt-2">
          {configured && (
            <Button variant="ghost" className="text-destructive" onClick={() => deleteM.mutate()} disabled={deleteM.isPending}>
              <Trash2 className="h-4 w-4 mr-1" /> Remover
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="ghost" onClick={onBack}>Cancelar</Button>
            <Button
              className="bg-foreground text-background"
              disabled={saveM.isPending}
              onClick={() => saveM.mutate()}
            >
              {saveM.isPending ? "A guardar..." : "Guardar configuração"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}