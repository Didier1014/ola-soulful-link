// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { checkApiStatus } from "@/lib/transactions.functions";
import { updateUserPreferences, sendTestNotification, type Currency } from "@/lib/notifications.functions";
import { PushToggle } from "@/components/push-setup";
import { PushReactivateBanner } from "@/components/push-reactivate-banner";
import { Activity, CheckCircle2, XCircle, Zap, RefreshCw, Copy, Bell, Play, Palette, Volume2, Smartphone } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  component: SettingsPage,
});

const currencies: { value: Currency; label: string }[] = [
  { value: "MZN", label: "MT (Metical)" },
  { value: "USD", label: "$ (Dólar)" },
  { value: "BRL", label: "R$ (Real)" },
  { value: "ZAR", label: "R (Rand)" },
  { value: "EUR", label: "€ (Euro)" },
];

const positions = [
  { value: "bottom-right", label: "Inferior direito" },
  { value: "bottom-left", label: "Inferior esquerdo" },
  { value: "top-right", label: "Superior direito" },
  { value: "top-left", label: "Superior esquerdo" },
];

const webhookUrl = typeof window !== "undefined"
  ? `${window.location.origin}/api/public/webhook-payment`
  : "";

function SettingsPage() {
  const ping = useServerFn(checkApiStatus);
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["api-status"],
    queryFn: () => ping(),
    refetchInterval: 30_000,
  });

  const ok = !!data?.ok;
  const dot = ok ? "bg-emerald-400 shadow-[0_0_10px_#34d399]" : "bg-rose-500 shadow-[0_0_10px_#f43f5e]";

  // Notificações
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [currency, setCurrency] = useState<Currency>("MZN");
  const [position, setPosition] = useState("bottom-right");
  const [highlightColor, setHighlightColor] = useState("#ff3333");
  const [sound, setSound] = useState(true);
  const [duration, setDuration] = useState(6);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setLoading(false); return; }
      const meta = u.user.user_metadata ?? {};
      setNotifEnabled(meta.notifications_enabled !== false);
      setCurrency((meta.currency as Currency) ?? "MZN");
      setPosition((meta.notification_position as string) ?? "bottom-right");
      setHighlightColor((meta.notification_color as string) ?? "#ff3333");
      setSound(meta.notification_sound !== false);
      setDuration(Number(meta.notification_duration ?? 6));
      setLoading(false);
    })();
  }, []);

  async function saveNotifPrefs() {
    setSaving(true);
    try {
      await updateUserPreferences({
        notifications_enabled: notifEnabled,
        currency,
        notification_position: position,
        notification_color: highlightColor,
        notification_sound: sound,
        notification_duration: duration,
      });
      toast.success("Preferências salvas");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    }
    setSaving(false);
  }

  async function testNotification() {
    try {
      const r = await sendTestNotification();
      if (r?.push_sent) toast.success("Push real de teste enviado!");
      else toast.error("Teste registado, mas o push não foi enviado. Active as notificações push neste dispositivo.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao testar");
    }
  }

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerir integrações, notificações e preferências.</p>
      </div>

      {/* Gateway */}
      <Card className="relative overflow-hidden rounded-2xl p-5 bg-card/40 border border-white/5">
        <div aria-hidden className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/15 blur-3xl" />
        <div className="flex items-start justify-between relative">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Activity className="h-5 w-5 text-primary-glow" />
            </div>
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                Gateway
                <span className={`h-2 w-2 rounded-full ${dot}`} />
              </h3>
              <p className="text-xs text-muted-foreground">{data?.message ?? "A verificar…"}</p>
            </div>
          </div>
          <button onClick={() => refetch()} className="h-9 w-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10">
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 relative">
          <Metric icon={ok ? CheckCircle2 : XCircle} label="Estado" value={ok ? "Online" : "Offline"} tone={ok ? "ok" : "err"} />
          <Metric icon={Zap} label="Latência" value={data ? `${data.latency_ms} ms` : "—"} />
          <Metric icon={Activity} label="HTTP" value={data?.status ? String(data.status) : "—"} />
        </div>
      </Card>

      {/* Webhook */}
      <Card className="relative overflow-hidden rounded-2xl p-5 bg-card/40 border border-white/5">
        <h3 className="font-semibold">Webhook</h3>
        <p className="text-sm text-muted-foreground mt-1">URL para receber notificações de pagamento:</p>
        <code className="block mt-2 p-3 rounded-lg bg-white/5 border border-white/5 text-xs break-all text-primary-glow">
          {webhookUrl}
        </code>
        <button onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success("URL copiado"); }} className="mt-2 text-xs text-primary-glow hover:underline flex items-center gap-1">
          <Copy className="h-3 w-3" /> Copiar URL
        </button>
      </Card>

      {/* Notificações flutuantes + PWA push */}
      <Card className="p-5 bg-card/40 border border-white/5 rounded-2xl space-y-5">
        <h3 className="font-semibold flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Notificações em tempo real
        </h3>

        {loading ? (
          <p className="text-sm text-muted-foreground">A carregar...</p>
        ) : (
          <>
            <PushReactivateBanner />
            <div className="flex items-center justify-between">
              <Label className="font-medium cursor-pointer">Notificações no site</Label>
              <Switch checked={notifEnabled} onCheckedChange={setNotifEnabled} />
            </div>

            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <PushToggle />
              </div>
            </div>

            <div>
              <Label>Moeda para exibir</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Posição</Label>
              <Select value={position} onValueChange={setPosition}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {positions.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <Palette className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1">
                <Label>Cor do destaque</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="color"
                    value={highlightColor}
                    onChange={(e) => setHighlightColor(e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <span className="text-xs text-muted-foreground">{highlightColor}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="h-5 w-5 text-muted-foreground" />
                <Label className="font-medium cursor-pointer">Som ao receber</Label>
              </div>
              <Switch checked={sound} onCheckedChange={setSound} />
            </div>

            <div>
              <Label>Duração: {duration}s</Label>
              <Slider
                value={[duration]}
                onValueChange={([v]) => setDuration(v)}
                min={3}
                max={10}
                step={1}
                className="mt-2"
              />
            </div>

            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={testNotification}
              disabled={!notifEnabled}
            >
              <Play className="h-4 w-4" /> Testar notificação
            </Button>

            <Button
              className="w-full rounded-xl bg-gradient-to-r from-primary to-primary-glow text-white"
              disabled={saving}
              onClick={saveNotifPrefs}
            >
              {saving ? "A guardar..." : "Guardar preferências"}
            </Button>
          </>
        )}
      </Card>

      {/* Taxas */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="rounded-2xl p-5 bg-card/40 border border-white/5">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Taxas</p>
          <p className="mt-1 text-lg font-semibold">15% + 15 MT</p>
          <p className="text-xs text-muted-foreground">por transacção aprovada</p>
        </Card>
        <Card className="rounded-2xl p-5 bg-card/40 border border-white/5">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Valor mínimo</p>
          <p className="mt-1 text-lg font-semibold">50 MT</p>
          <p className="text-xs text-muted-foreground">C2B M-Pesa / e-Mola</p>
        </Card>
      </div>

      {/* API */}
      <Card className="rounded-2xl p-5 bg-card/40 border border-white/5">
        <h3 className="font-semibold">API</h3>
        <p className="text-sm text-muted-foreground">Documentação completa em breve. Para criar transacções via API, contacte o suporte.</p>
      </Card>
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: string; tone?: "ok" | "err" }) {
  const color = tone === "ok" ? "text-emerald-400" : tone === "err" ? "text-rose-400" : "text-foreground";
  return (
    <div className="rounded-xl bg-white/5 border border-white/5 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <p className={`mt-1 text-sm font-semibold ${color}`}>{value}</p>
    </div>
  );
}