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
import { Bell, Sparkles, Webhook, TrendingUp, MessageSquare, Send, Save, Radar } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { usePushNotifications } from "@/components/push-setup";
import { PushReactivateBanner } from "@/components/push-reactivate-banner";
import { sendTestNotification } from "@/lib/notifications.functions";

export const Route = createFileRoute("/_authenticated/dashboard/integrations")({
  component: IntegrationsPage,
});

interface Bundle {
  push_custom: { title?: string; body?: string; currency?: "MZN" | "BRL" | "USD" | "EUR" };
  pushcut: { enabled?: boolean; webhook_url?: string };
  utmify: { enabled?: boolean; api_token?: string; currency?: "MZN" | "BRL" | "USD" | "EUR" };
  mozesms: { enabled?: boolean; sender_id?: string; template?: string; test_number?: string };
}

const DEFAULT_BUNDLE: Bundle = {
  push_custom: { title: "💰 Nova venda aprovada!", body: "{valor} — {cliente}", currency: "MZN" },
  pushcut: { enabled: false, webhook_url: "" },
  utmify: { enabled: false, api_token: "", currency: "BRL" },
  mozesms: { enabled: false, sender_id: "RedoxPay", template: "Olá {nome}, recebemos o seu pagamento de {valor} para {produto}. Obrigado!", test_number: "" },
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
      await saveBundle({ data: b });
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

  return (
    <div className="space-y-4 pb-24">
      <div className="px-1">
        <h1 className="text-2xl font-semibold tracking-tight">Integrações</h1>
        <p className="text-sm text-muted-foreground">Configure webhooks para notificações e rastreamento</p>
      </div>

      {/* 1) Push Web App */}
      <Card className="rounded-2xl p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
            <Bell className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Notificações Push (Web App)</h3>
            <p className="text-sm text-muted-foreground">Receba alertas de vendas no navegador ou no telemóvel (PWA)</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={activatePush} disabled={pushLoading}><Bell className="h-4 w-4 mr-1" /> {permission === "granted" ? "Actualizar inscrição" : "Ativar notificações"}</Button>
          <Button variant="outline" onClick={testNotification}><Send className="h-4 w-4 mr-1" /> Push real de teste</Button>
        </div>
      </Card>

      {/* 2) Personalizar push */}
      <Card className="rounded-2xl p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">Personalizar Notificação Push</h3>
            <p className="text-sm text-muted-foreground">Edite o título e o conteúdo das notificações de venda aprovada</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Título da notificação</Label>
          <Input value={b.push_custom.title || ""}
            onChange={(e) => setB({ ...b, push_custom: { ...b.push_custom, title: e.target.value } })}
          />
        </div>
        <div className="space-y-2">
          <Label>Moeda do valor</Label>
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
        <div className="space-y-2">
          <Label>Mensagem (corpo)</Label>
          <Textarea rows={3} value={b.push_custom.body || ""}
            onChange={(e) => setB({ ...b, push_custom: { ...b.push_custom, body: e.target.value } })}
          />
          <p className="text-xs text-muted-foreground">Variáveis: {"{valor}"}, {"{produto}"}, {"{cliente}"}</p>
        </div>
      </Card>

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
        icon={<TrendingUp className="h-5 w-5 text-white" />}
        iconBg="from-violet-500 to-fuchsia-500"
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
        <Label>Modelo da Mensagem SMS</Label>
        <Textarea rows={3} value={b.mozesms.template || ""}
          onChange={(e) => setB({ ...b, mozesms: { ...b.mozesms, template: e.target.value } })}
        />
        <p className="text-xs text-muted-foreground -mt-2">Variáveis: {"{nome}"}, {"{produto}"}, {"{valor}"}, {"{email}"}</p>
        <Label>Número para teste SMS</Label>
        <div className="flex gap-2">
          <div className="h-10 px-3 rounded-md bg-secondary flex items-center text-sm">+258</div>
          <Input value={b.mozesms.test_number || ""}
            onChange={(e) => setB({ ...b, mozesms: { ...b.mozesms, test_number: e.target.value.replace(/\D/g, "") } })}
            placeholder="84XXXXXXX" />
        </div>
        <Button variant="outline" size="sm"
          disabled={!b.mozesms.test_number || !b.mozesms.template}
          onClick={async () => {
            try {
              await tSms({ data: {
                sender_id: b.mozesms.sender_id || "RedoxPay",
                message: (b.mozesms.template || "").replaceAll("{nome}", "Teste").replaceAll("{produto}", "Produto Teste").replaceAll("{valor}", "100 MT").replaceAll("{email}", "teste@redox.com"),
                number: `258${b.mozesms.test_number}`,
              } });
              toast.success("SMS de teste enviado");
            } catch (e: any) { toast.error(e.message); }
          }}>
          <Send className="h-3.5 w-3.5 mr-1" /> Testar
        </Button>
      </IntegrationCard>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 left-0 right-0 pt-2 pb-1 bg-gradient-to-t from-background via-background to-transparent">
        <Button
          className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary-glow text-white"
          disabled={saveM.isPending}
          onClick={() => saveM.mutate()}
        >
          <Save className="h-4 w-4 mr-2" /> {saveM.isPending ? "A guardar..." : "Salvar Integrações"}
        </Button>
      </div>
    </div>
  );
}

function IntegrationCard({
  icon, iconBg, title, desc, enabled, onToggle, children,
}: {
  icon: React.ReactNode; iconBg: string; title: string; desc: string;
  enabled: boolean; onToggle: (v: boolean) => void; children: React.ReactNode;
}) {
  return (
    <Card className="rounded-2xl p-5 space-y-3">
      <div className="flex items-start gap-3">
        <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${iconBg} flex items-center justify-center shrink-0`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{desc}</p>
        </div>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>
      {enabled && <div className="space-y-2 pt-2 border-t border-border/40">{children}</div>}
    </Card>
  );
}
