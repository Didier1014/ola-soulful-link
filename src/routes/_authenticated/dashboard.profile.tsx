import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { User, Save, LogOut } from "lucide-react";
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
  const [form, setForm] = useState({ full_name: "", business_name: "", whatsapp: "", city: "", account_type: "person" });

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setLoading(false); return; }
      setEmail(u.user.email || "");
      const { data: p } = await supabase.from("profiles").select("*").eq("id", u.user.id).single();
      if (p) setForm({ full_name: p.full_name || "", business_name: p.business_name || "", whatsapp: p.whatsapp || "", city: p.city || "", account_type: p.account_type || "person" });
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
    const { error } = await supabase.from("profiles").update(form).eq("id", u.user.id);
    if (error) { setSaving(false); toast.error(error.message); return; }
    const r = await updateUserPreferences({ currency, notifications_enabled: notificationsEnabled }).catch(() => null);
    setSaving(false);
    if (r) toast.success("Perfil atualizado"); else toast.error("Erro ao guardar preferências");
  }
  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  if (loading) return <div className="text-sm text-muted-foreground">A carregar...</div>;

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h1 className="text-2xl font-bold tracking-tight">Meu Perfil</h1>
        <p className="text-sm text-muted-foreground">Atualize os seus dados</p>
      </div>

      <Card className="p-5 bg-white/5 border-white/10 rounded-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-[0_0_30px_-8px(var(--primary-glow))]">
            <User className="h-7 w-7 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{form.full_name || "Sem nome"}</p>
            <p className="text-xs text-muted-foreground truncate">{email}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div><Label>Nome completo</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div><Label>Nome do negócio</Label><Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></div>
            <div><Label>Cidade</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          </div>
          <div>
            <Label>Tipo de conta</Label>
            <Select value={form.account_type} onValueChange={(v) => setForm({ ...form, account_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="person">Pessoa singular</SelectItem>
                <SelectItem value="company">Empresa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Moeda preferida (notificações)</Label>
            <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MZN">MT (Metical)</SelectItem>
                <SelectItem value="USD">$ (Dólar)</SelectItem>
                <SelectItem value="ZAR">R (Rand)</SelectItem>
                <SelectItem value="EUR">€ (Euro)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label className="cursor-pointer">Receber notificações</Label>
            <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
          </div>
          <Button className="w-full rounded-xl bg-gradient-to-r from-primary to-primary-glow text-white" disabled={saving} onClick={save}>
            <Save className="h-4 w-4 mr-2" /> Guardar
          </Button>
        </div>
      </Card>

      <Card className="p-4 bg-white/5 border-white/10 rounded-2xl">
        <Button variant="ghost" className="w-full text-destructive" onClick={signOut}><LogOut className="h-4 w-4 mr-2" /> Terminar sessão</Button>
      </Card>
    </div>
  );
}
