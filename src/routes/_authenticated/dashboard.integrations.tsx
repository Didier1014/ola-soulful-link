// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getIntegrationsBundle, saveIntegrationsBundle,
  testPushcut, testUtmify, sendTestSms, testLowtrack,
  getIntegrationSettings, saveIntegrationSetting,
} from "@/lib/integrations.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Sparkles, Webhook, TrendingUp, MessageSquare, Send, Save, Radar, Plug, CheckCircle2, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { usePushNotifications } from "@/components/push-setup";
import { PushReactivateBanner } from "@/components/push-reactivate-banner";
import { sendTestNotification } from "@/lib/notifications.functions";
import utmifyLogo from "@/assets/utmify-logo.png.asset.json";

export const Route = createFileRoute("/_authenticated/dashboard/integrations")({
  component: IntegrationsPage,
});

interface Bundle {
  push_custom: { title?: string; body?: string; currency?: "MZN" | "BRL" | "USD" | "EUR" };
  pushcut: { enabled?: boolean; webhook_url?: string };
  utmify: { enabled?: boolean; api_token?: string; currency?: "MZN" | "BRL" | "USD" | "EUR" };
  mozesms: { enabled?: boolean; sender_id?: string; template?: string; test_number?: string; support_phone?: string; support_phone2?: string };
}

const DEFAULT_BUNDLE: Bundle = {
  push_custom: { title: "💰 Nova venda aprovada!", body: "{valor}", currency: "MZN" },
  pushcut: { enabled: false, webhook_url: "" },
  utmify: { enabled: false, api_token: "", currency: "BRL" },
  mozesms: { enabled: false, sender_id: "RedoxPay", template: "Olá {nome}, recebemos o seu pagamento de {valor} para {produto}. Suporte: {suporte} / {suporte2}", test_number: "", support_phone: "", support_phone2: "" },
};

function IntegrationsPage() {
  const qc = useQueryClient();
  const fetchBundle = useServerFn(getIntegrationsBundle);
  const saveBundle = useServerFn(saveIntegrationsBundle);
  const tPushcut = useServerFn(testPushcut);
  const tUtmify = useServerFn(testUtmify);
  const tSms = useServerFn(sendTestSms);
  const tLowtrack = useServerFn(testLowtrack);
  const fetchLegacy = useServerFn(getIntegrationSettings);
  const saveLegacy = useServerFn(saveIntegrationSetting);
  const { permission, loading: pushLoading, enable: enablePush } = usePushNotifications();
  const sendServerTestPush = useServerFn(sendTestNotification);

  const { data } = useQuery({ queryKey: ["bundle"], queryFn: () => fetchBundle() });
  const { data: legacy } = useQuery({ queryKey: ["legacy-integrations"], queryFn: () => fetchLegacy() });
  const [b, setB] = useState<Bundle>(DEFAULT_BUNDLE);
  const [lowtrack, setLowtrack] = useState<{ enabled: boolean; webhook_url: string; api_token: string; currency: "MZN" | "BRL" | "USD" | "EUR" }>({ enabled: false, webhook_url: "", api_token: "", currency: "BRL" });

  useEffect(() => {
    if (data) {
      setB({
        push_custom: { ...DEFAULT_BUNDLE.push_custom, ...(data.push_custom || {}) },
        pushcut: { ...DEFAULT_BUNDLE.pushcut, ...(data.pushcut || {}) },
        utmify: { ...DEFAULT_BUNDLE.utmify, ...(data.utmify || {}) },
        mozesms: { ...DEFAULT_BUNDLE.mozesms, ...(data.mozesms || {}) },
      });
    }
  }, [data]);

  useEffect(() => {
    const row = (legacy || []).find((r: any) => r.integration_key === "lowtrack");
    if (row?.settings) {
      setLowtrack({
        enabled: row.settings.enabled !== false,
        webhook_url: row.settings.webhook_url || "",
        api_token: row.settings.api_token || "",
        currency: (row.settings.currency as any) || "BRL",
      });
    }
  }, [legacy]);

  const saveM = useMutation({
    mutationFn: async () => {
      await saveBundle({ data: { ...b, push_custom: { ...b.push_custom, body: "{valor}" } } });
      await saveLegacy({ data: { integration_key: "lowtrack", settings: lowtrack } });
    },
    onSuccess: () => {
      toast.success("Integrações guardadas");
      qc.invalidateQueries({ queryKey: ["bundle"] });
      qc.invalidateQueries({ queryKey: ["legacy-integrations"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  async function activatePush() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Notificações não suportadas neste browser"); return;
    }
    await enablePush();
    if (Notification.permission === "granted") toast.success("Notificações push activas neste dispositivo");
    else toast.error("Permissão negada");
  }

  async function testNotification() {
    try {
      const r = await sendServerTestPush();
      if (r?.push_sent) toast.success("Push real de teste enviado pelo servidor");
      else toast.error("Teste registado, mas push não foi enviado. Active as notificações push primeiro.");
    } catch (e: any) {
      toast.error(e?.message || "Falha ao enviar notificação");
    }

  }

  const activeCount = [b.pushcut.enabled, b.utmify.enabled, lowtrack.enabled, b.mozesms.enabled].filter(Boolean).length;
  const pushOn = permission === "granted";

  const total = 5;
  const totalActive = activeCount + (pushOn ? 1 : 0);

  return (
    <div className="space-y-5 pb-24 max-w-5xl mx-auto">
      {/* HERO HUD */}
      <div className="relative overflow-hidden rounded-3xl neo-card neo-scan neo-corner p-6 md:p-8">
        <div aria-hidden className="absolute inset-0 neo-grid opacity-[0.3] pointer-events-none" />
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-primary-glow/20 blur-3xl pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-glow to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        <div className="relative flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-[0_8px_30px_-8px_var(--primary-glow)] shrink-0">
            <Plug className="h-7 w-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-mono">
              <span className="neo-live-dot" /> LINK LAYER · v2.0
            </div>
            <h1 className="mt-1.5 text-2xl md:text-3xl font-semibold tracking-tight text-neo-glow">Integrações</h1>
            <p className="text-sm text-muted-foreground">Conecte notificações, rastreamento e SMS às suas vendas</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="neo-chip"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> {totalActive}/{total} ativas</span>
              <span className="neo-chip">
                {pushOn ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_currentColor]" /> : <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />}
                PUSH {pushOn ? "ONLINE" : "OFFLINE"}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">// sync: agora</span>
            </div>
          </div>
        </div>
      </div>


      {/* Grupo: Notificações */}
      <SectionTitle icon={<Bell className="h-4 w-4" />} title="Notificações" desc="Alertas em tempo real para si" />

      {/* 1) Push Web App */}
      <Card className="neo-card neo-corner rounded-2xl p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-[0_0_20px_-4px_var(--primary-glow)]">
            <Bell className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold tracking-tight">Notificações Push (Web App)</h3>
              <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${pushOn ? "text-emerald-500 bg-emerald-500/10" : "text-muted-foreground bg-muted/60"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${pushOn ? "bg-emerald-500 shadow-[0_0_8px_currentColor]" : "bg-muted-foreground/50"}`} />
                {pushOn ? "ONLINE" : "OFFLINE"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Alertas de vendas no navegador ou no telemóvel (PWA)</p>
          </div>
        </div>
        <PushReactivateBanner />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-xl" onClick={activatePush} disabled={pushLoading}><Bell className="h-4 w-4 mr-1" /> {pushOn ? "Actualizar inscrição" : "Ativar notificações"}</Button>
          <Button variant="outline" className="rounded-xl" onClick={testNotification}><Send className="h-4 w-4 mr-1" /> Push real de teste</Button>
        </div>
      </Card>

      {/* 2) Personalizar push */}
      <Card className="neo-card neo-corner rounded-2xl p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-[0_0_20px_-4px_var(--primary-glow)]">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold tracking-tight">Personalizar Notificação Push</h3>
            <p className="text-sm text-muted-foreground">Edite o título e o conteúdo das notificações de venda aprovada</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Título da notificação</Label>
          <Input value={b.push_custom.title || ""}
            onChange={(e) => setB({ ...b, push_custom: { ...b.push_custom, title: e.target.value } })}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Moeda do valor</Label>
          <Select value={b.push_custom.currency || "MZN"} onValueChange={(v: any) => setB({ ...b, push_custom: { ...b.push_custom, currency: v } })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="MZN">Metical (MZN)</SelectItem>
              <SelectItem value="BRL">Real Brasileiro (R$)</SelectItem>
              <SelectItem value="USD">Dólar (US$)</SelectItem>
              <SelectItem value="EUR">Euro (€)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">A variável {"{valor}"} será mostrada na moeda selecionada.</p>
        </div>
      </Card>


      {/* Grupo: Rastreamento */}
      <SectionTitle icon={<TrendingUp className="h-4 w-4" />} title="Rastreamento & Conversões" desc="Envie os dados de vendas às suas plataformas de atribuição" />

      {/* 3) PUSHcut */}
      <IntegrationCard
        icon={<Webhook className="h-5 w-5 text-white" />}
        iconBg="from-orange-500 to-pink-500"
        title="PUSHcut"
        desc="Receba notificações de vendas em tempo real no seu dispositivo (iOS/iPadOS)"
        enabled={!!b.pushcut.enabled}
        onToggle={(v) => setB({ ...b, pushcut: { ...b.pushcut, enabled: v } })}
      >
        <Label>Webhook URL</Label>
        <Input value={b.pushcut.webhook_url || ""}
          onChange={(e) => setB({ ...b, pushcut: { ...b.pushcut, webhook_url: e.target.value } })}
          placeholder="https://api.pushcut.io/..." />
        <Button variant="outline" size="sm"
          disabled={!b.pushcut.webhook_url}
          onClick={async () => {
            try { await tPushcut({ data: { webhook_url: b.pushcut.webhook_url! } }); toast.success("Notificação enviada para o PUSHcut"); }
            catch (e: any) { toast.error(e.message); }
          }}>
          <Send className="h-3.5 w-3.5 mr-1" /> Testar
        </Button>
      </IntegrationCard>

      {/* 4) UTMify */}
      <IntegrationCard
        icon={<img src={utmifyLogo.url} alt="UTMify" className="h-7 w-7 object-contain" />}
        iconBg="bg-white"
        title="UTMify"
        desc="Rastreamento de conversões e atribuição de vendas"
        enabled={!!b.utmify.enabled}
        onToggle={(v) => setB({ ...b, utmify: { ...b.utmify, enabled: v } })}
      >
        <Label>API Token</Label>
        <Input type="password" value={b.utmify.api_token || ""}
          onChange={(e) => setB({ ...b, utmify: { ...b.utmify, api_token: e.target.value } })}
          placeholder="utm_..." />
        <Label>Moeda da dashboard UTMify</Label>
        <Select value={b.utmify.currency || "BRL"} onValueChange={(v: any) => setB({ ...b, utmify: { ...b.utmify, currency: v } })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="MZN">Metical (MZN)</SelectItem>
            <SelectItem value="BRL">Real (BRL)</SelectItem>
            <SelectItem value="USD">Dólar (USD)</SelectItem>
            <SelectItem value="EUR">Euro (EUR)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground -mt-1">O valor em MZN será convertido automaticamente para esta moeda antes de enviar à UTMify.</p>
        <Button variant="outline" size="sm"
          disabled={!b.utmify.api_token}
          onClick={async () => {
            try { await tUtmify({ data: { api_token: b.utmify.api_token! } }); toast.success("Conexão UTMify validada"); }
            catch (e: any) { toast.error(e.message); }
          }}>
          <Send className="h-3.5 w-3.5 mr-1" /> Testar
        </Button>
      </IntegrationCard>

      {/* 4b) LowTrack */}
      <IntegrationCard
        icon={<Radar className="h-5 w-5 text-white" />}
        iconBg="from-sky-500 to-cyan-500"
        title="LowTrack"
        desc="Rastreamento inteligente para low ticket — devolve dados ao Pixel para baixar CPA (lowtrack.com.br)"
        enabled={!!lowtrack.enabled}
        onToggle={(v) => setLowtrack({ ...lowtrack, enabled: v })}
      >
        <Label>Webhook / Postback URL</Label>
        <Input value={lowtrack.webhook_url}
          onChange={(e) => setLowtrack({ ...lowtrack, webhook_url: e.target.value })}
          placeholder="https://api.lowtrack.com.br/postback/..." />
        <Label>API Token (opcional)</Label>
        <Input type="password" value={lowtrack.api_token}
          onChange={(e) => setLowtrack({ ...lowtrack, api_token: e.target.value })}
          placeholder="lt_..." />
        <p className="text-xs text-muted-foreground -mt-1">Enviado como <code>Authorization: Bearer …</code> no postback.</p>
        <Label>Moeda da dashboard LowTrack</Label>
        <Select value={lowtrack.currency || "BRL"} onValueChange={(v: any) => setLowtrack({ ...lowtrack, currency: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="MZN">Metical (MZN)</SelectItem>
            <SelectItem value="BRL">Real (BRL)</SelectItem>
            <SelectItem value="USD">Dólar (USD)</SelectItem>
            <SelectItem value="EUR">Euro (EUR)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground -mt-1">O valor em MZN será convertido automaticamente para esta moeda antes de enviar ao LowTrack.</p>
        <Button variant="outline" size="sm"
          disabled={!lowtrack.webhook_url}
          onClick={async () => {
            try { await tLowtrack({ data: { webhook_url: lowtrack.webhook_url, api_token: lowtrack.api_token || undefined } }); toast.success("Postback de teste enviado ao LowTrack"); }
            catch (e: any) { toast.error(e.message); }
          }}>
          <Send className="h-3.5 w-3.5 mr-1" /> Testar
        </Button>
      </IntegrationCard>

      {/* Grupo: SMS */}
      <SectionTitle icon={<MessageSquare className="h-4 w-4" />} title="SMS transacional" desc="Confirmação por SMS ao cliente após aprovação" />

      {/* 5) MozeSMS */}
      <IntegrationCard
        icon={<MessageSquare className="h-5 w-5 text-white" />}
        iconBg="from-emerald-500 to-teal-500"
        title="MozeSMS"
        desc="SMS automático para o cliente após pagamento aprovado"
        enabled={!!b.mozesms.enabled}
        onToggle={(v) => setB({ ...b, mozesms: { ...b.mozesms, enabled: v } })}
      >
        <Label>Nome do Remetente (Sender ID)</Label>
        <Input value={b.mozesms.sender_id || ""}
          onChange={(e) => setB({ ...b, mozesms: { ...b.mozesms, sender_id: e.target.value } })}
          maxLength={11} placeholder="RedoxPay" />
        <div className="rounded-lg border border-border/40 bg-muted/40 p-3 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Modelo de mensagem (fixo — igual para todos)</p>
          <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">{`{nome}, pagamento recebido com sucesso de {valor} para {produto}, se nao conseguiu acessa aqui esta o link {link}
SUPORTE ou Reclamações: {suporte1} , {suporte2}
{suporte3}`}</pre>
          <p className="text-xs text-muted-foreground pt-1">
            <b>{"{suporte1}"}</b> e <b>{"{suporte2}"}</b> são os seus números (edite abaixo ou em <a href="/dashboard/profile" className="underline text-primary">Perfil</a>). <b>{"{suporte3}"}</b> é o número do admin (usado caso não atenda).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Suporte 1 (o seu número)</Label>
            <div className="flex gap-2">
              <div className="h-10 px-3 rounded-md bg-secondary flex items-center text-sm">+258</div>
              <Input
                value={b.mozesms.support_phone || ""}
                onChange={(e) => setB({ ...b, mozesms: { ...b.mozesms, support_phone: e.target.value.replace(/\D/g, "") } })}
                placeholder="84XXXXXXX"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Suporte 2 (alternativo)</Label>
            <div className="flex gap-2">
              <div className="h-10 px-3 rounded-md bg-secondary flex items-center text-sm">+258</div>
              <Input
                value={b.mozesms.support_phone2 || ""}
                onChange={(e) => setB({ ...b, mozesms: { ...b.mozesms, support_phone2: e.target.value.replace(/\D/g, "") } })}
                placeholder="85XXXXXXX"
              />
            </div>
          </div>
        </div>

        <Label>Número para teste SMS</Label>
        <div className="flex gap-2">
          <div className="h-10 px-3 rounded-md bg-secondary flex items-center text-sm">+258</div>
          <Input value={b.mozesms.test_number || ""}
            onChange={(e) => setB({ ...b, mozesms: { ...b.mozesms, test_number: e.target.value.replace(/\D/g, "") } })}
            placeholder="84XXXXXXX" />
        </div>
        <Button variant="outline" size="sm"
          disabled={!b.mozesms.test_number}
          onClick={async () => {
            try {
              const { buildFixedSmsTemplate } = await import("@/lib/sms-template");
              const message = buildFixedSmsTemplate({
                nome: "Teste",
                produto: "Produto Teste",
                valor: "100 MT",
                link: "https://exemplo.com/produto",
                suporte1: b.mozesms.support_phone || "",
                suporte2: b.mozesms.support_phone2 || "",
                suporte3: "(número do admin)",
              });
              await tSms({ data: {
                sender_id: b.mozesms.sender_id || "RedoxPay",
                message,
                number: `258${b.mozesms.test_number}`,
              } });
              toast.success("SMS de teste enviado");
            } catch (e: any) { toast.error(e.message); }
          }}>
          <Send className="h-3.5 w-3.5 mr-1" /> Testar
        </Button>
      </IntegrationCard>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 left-0 right-0 pt-3 pb-1 bg-gradient-to-t from-background via-background/95 to-transparent">
        <Button
          className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary-glow text-white font-semibold shadow-[0_8px_30px_-8px_var(--primary-glow)] hover:brightness-110"
          disabled={saveM.isPending}
          onClick={() => saveM.mutate()}
        >
          <Save className="h-4 w-4 mr-2" /> {saveM.isPending ? "A guardar..." : "Salvar Integrações"}
        </Button>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 px-1 pt-3">
      <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-mono">//</span>
          <h2 className="text-sm font-semibold tracking-tight uppercase tracking-[0.14em]">{title}</h2>
        </div>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <div className="hidden sm:block h-px flex-1 bg-gradient-to-r from-border/60 to-transparent" />
    </div>
  );
}

function IntegrationCard({
  icon, iconBg, title, desc, enabled, onToggle, children,
}: {
  icon: React.ReactNode; iconBg: string; title: string; desc: string;
  enabled: boolean; onToggle: (v: boolean) => void; children: React.ReactNode;
}) {
  const bgClass = iconBg.startsWith("bg-") ? iconBg : `bg-gradient-to-br ${iconBg}`;
  return (
    <Card className={`neo-card neo-corner rounded-2xl p-5 space-y-3 transition-all ${enabled ? "ring-1 ring-primary/30 shadow-[0_0_30px_-12px_var(--primary-glow)]" : ""}`}>
      <div className="flex items-start gap-3">
        <div className={`h-11 w-11 rounded-xl ${bgClass} flex items-center justify-center shrink-0 shadow-md`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold tracking-tight">{title}</h3>
            <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${enabled ? "text-emerald-500 bg-emerald-500/10" : "text-muted-foreground bg-muted/60"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${enabled ? "bg-emerald-500 shadow-[0_0_8px_currentColor]" : "bg-muted-foreground/50"}`} />
              {enabled ? "ONLINE" : "OFFLINE"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{desc}</p>
        </div>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>
      {enabled && <div className="space-y-2 pt-3 border-t border-border/40">{children}</div>}
    </Card>
  );
}

  );
}
