// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { User, Save, LogOut, ShieldCheck, Phone, Bell, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";
import { getCurrencyPref, updateUserPreferences, type Currency } from "@/lib/notifications.functions";

export const Route = createFileRoute("/_authenticated/dashboard/profile")({ component: Page });

function Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [currency, setCurrency] = useState<Currency>("MZN");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isMerchant, setIsMerchant] = useState(false);
  const [form, setForm] = useState({ full_name: "", business_name: "", whatsapp: "", city: "", account_type: "person", support_phone: "", support_phone2: "", payout_mpesa_phone: "", payout_emola_phone: "" });

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setLoading(false); return; }
      setEmail(u.user.email || "");
      const { data: p } = await supabase.from("profiles").select("*").eq("id", u.user.id).single();
      if (p) { setForm({ full_name: p.full_name || "", business_name: p.business_name || "", whatsapp: p.whatsapp || "", city: p.city || "", account_type: p.account_type || "person", support_phone: (p as any).support_phone || "", support_phone2: (p as any).support_phone2 || "", payout_mpesa_phone: (p as any).payout_mpesa_phone || "", payout_emola_phone: (p as any).payout_emola_phone || "" }); setIsMerchant(Boolean((p as any).is_merchant)); }
      const prefs = await getCurrencyPref();
      setCurrency(prefs.currency);
      setNotificationsEnabled(prefs.notifications_enabled);
      setLoading(false);
    })();
  }, []);

  async function save() {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return; }
    const payload: any = { ...form };
    if (!isMerchant) { delete payload.payout_mpesa_phone; delete payload.payout_emola_phone; }
    const { error } = await supabase.from("profiles").update(payload).eq("id", u.user.id);
    if (error) { setSaving(false); toast.error(error.message); return; }
    const r = await updateUserPreferences({ currency, notifications_enabled: notificationsEnabled }).catch(() => null);
    setSaving(false);
    if (r) toast.success("Perfil atualizado"); else toast.error("Erro ao guardar preferências");
  }
  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="neo-card neo-corner rounded-3xl h-40 animate-pulse" />
        <div className="neo-card neo-corner rounded-3xl h-96 animate-pulse" />
      </div>
    );
  }

  const displayName = form.full_name || form.business_name || "Sem nome";
  const initial = (displayName[0] || "R").toUpperCase();

  return (
    <div className="space-y-5 pb-24 max-w-3xl mx-auto">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-3xl neo-card neo-scan neo-corner p-6 md:p-8">
        <div aria-hidden className="absolute inset-0 neo-grid opacity-[0.3] pointer-events-none" />
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-primary-glow/20 blur-3xl pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-glow to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        <div className="relative flex items-start gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-[0_8px_30px_-8px_var(--primary-glow)] text-2xl font-bold text-white shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-mono">
              <span className="neo-live-dot" /> USER ACCOUNT · {form.account_type === "company" ? "COMPANY" : "PERSON"}
            </div>
            <h1 className="mt-1.5 text-2xl md:text-3xl font-semibold tracking-tight text-neo-glow truncate">{displayName}</h1>
            <p className="text-sm text-muted-foreground truncate">{email}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="neo-chip"><ShieldCheck className="h-3 w-3 text-emerald-500" /> VERIFIED</span>
              {isMerchant && <span className="neo-chip"><Wallet className="h-3 w-3 text-primary-glow" /> MERCHANT API</span>}
              <span className="neo-chip"><Bell className="h-3 w-3" /> {notificationsEnabled ? "NOTIF ON" : "NOTIF OFF"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* IDENTIDADE */}
      <SectionTitle icon={<User className="h-4 w-4" />} title="Identidade" desc="Os seus dados públicos e de negócio" />
      <Card className="neo-card neo-corner rounded-2xl p-5 space-y-4">
        <Field label="Nome completo">
          <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </Field>
        <Field label="Nome do negócio">
          <Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="WhatsApp"><Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></Field>
          <Field label="Cidade"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
        </div>
        <Field label="Tipo de conta">
          <Select value={form.account_type} onValueChange={(v) => setForm({ ...form, account_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="person">Pessoa singular</SelectItem>
              <SelectItem value="company">Empresa</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </Card>

      {/* SUPORTE */}
      <SectionTitle icon={<Phone className="h-4 w-4" />} title="Contactos de suporte" desc="Usados nos SMS pós-venda enviados ao cliente" />
      <Card className="neo-card neo-corner rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Suporte 1">
            <Input value={form.support_phone} placeholder="258840000000"
              onChange={(e) => setForm({ ...form, support_phone: e.target.value.replace(/[^\d+]/g, "") })} />
          </Field>
          <Field label="Suporte 2">
            <Input value={form.support_phone2} placeholder="258850000000"
              onChange={(e) => setForm({ ...form, support_phone2: e.target.value.replace(/[^\d+]/g, "") })} />
          </Field>
        </div>
      </Card>

      {/* PAYOUT */}
      {isMerchant && (
        <>
          <SectionTitle icon={<Wallet className="h-4 w-4" />} title="Payout direto" desc="Merchant API — receba directamente nas carteiras móveis" />
          <Card className="neo-card neo-corner rounded-2xl p-5 space-y-3 ring-1 ring-primary/30 shadow-[0_0_30px_-12px_var(--primary-glow)]">
            <div className="grid grid-cols-2 gap-3">
              <Field label="M-Pesa payout">
                <Input value={form.payout_mpesa_phone} placeholder="8XXXXXXXX"
                  onChange={(e) => setForm({ ...form, payout_mpesa_phone: e.target.value.replace(/\D/g, "") })} />
              </Field>
              <Field label="e-Mola payout">
                <Input value={form.payout_emola_phone} placeholder="8XXXXXXXX"
                  onChange={(e) => setForm({ ...form, payout_emola_phone: e.target.value.replace(/\D/g, "") })} />
              </Field>
            </div>
          </Card>
        </>
      )}

      {/* PREFERÊNCIAS */}
      <SectionTitle icon={<Bell className="h-4 w-4" />} title="Preferências" desc="Notificações e moeda apresentada" />
      <Card className="neo-card neo-corner rounded-2xl p-5 space-y-4">
        <Field label="Moeda preferida (notificações)">
          <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="MZN">MT (Metical)</SelectItem>
              <SelectItem value="USD">$ (Dólar)</SelectItem>
              <SelectItem value="ZAR">R (Rand)</SelectItem>
              <SelectItem value="EUR">€ (Euro)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <div className="flex items-center justify-between rounded-xl bg-muted/30 border border-border/40 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Receber notificações</p>
            <p className="text-xs text-muted-foreground">Push e sons em tempo real</p>
          </div>
          <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
        </div>
      </Card>

      {/* SESSÃO */}
      <Card className="neo-card neo-corner rounded-2xl p-4">
        <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-2" /> Terminar sessão
        </Button>
      </Card>

      {/* Sticky save */}
      <div className="sticky bottom-0 left-0 right-0 pt-3 pb-1 bg-gradient-to-t from-background via-background/95 to-transparent">
        <Button
          className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary-glow text-white font-semibold shadow-[0_8px_30px_-8px_var(--primary-glow)] hover:brightness-110"
          disabled={saving}
          onClick={save}
        >
          <Save className="h-4 w-4 mr-2" /> {saving ? "A guardar..." : "Guardar alterações"}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
