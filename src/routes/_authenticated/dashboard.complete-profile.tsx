// @ts-nocheck
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserCog, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/complete-profile")({ component: Page });

const PROVINCES = [
  "Maputo Cidade", "Maputo Província", "Gaza", "Inhambane", "Sofala",
  "Manica", "Tete", "Zambézia", "Nampula", "Cabo Delgado", "Niassa",
];

function Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "", whatsapp: "", birth_date: "", province: "", neighborhood: "",
  });

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { router.navigate({ to: "/auth", replace: true }); return; }
      const { data: p } = await supabase.from("profiles").select("full_name,whatsapp,birth_date,province,neighborhood").eq("id", u.user.id).single();
      if (p) setForm({
        full_name: p.full_name || "",
        whatsapp: p.whatsapp || "",
        birth_date: p.birth_date || "",
        province: p.province || "",
        neighborhood: p.neighborhood || "",
      });
      setLoading(false);
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim() || !form.whatsapp.trim() || !form.birth_date || !form.province.trim() || !form.neighborhood.trim()) {
      toast.error("Preencha todos os campos"); return;
    }
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return; }
    const { error } = await supabase.from("profiles").update(form).eq("id", u.user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Perfil completo!");
    router.navigate({ to: "/dashboard", replace: true });
  }

  if (loading) return <div className="text-sm text-muted-foreground">A carregar...</div>;

  return (
    <div className="max-w-xl mx-auto">
      <Card className="p-6 bg-white/5 border-white/10 rounded-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center">
            <UserCog className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Complete o seu perfil</h1>
            <p className="text-xs text-muted-foreground">Precisamos destes dados para continuar</p>
          </div>
        </div>
        <form onSubmit={save} className="space-y-3">
          <div><Label>Nome completo</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} maxLength={120} /></div>
          <div><Label>Número de WhatsApp</Label><Input required value={form.whatsapp} placeholder="+258 84..." onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} maxLength={20} /></div>
          <div><Label>Data de nascimento</Label><Input required type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} /></div>
          <div>
            <Label>Província</Label>
            <Select value={form.province} onValueChange={(v) => setForm({ ...form, province: v })}>
              <SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
              <SelectContent>
                {PROVINCES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Bairro</Label><Input required value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} maxLength={120} /></div>
          <Button type="submit" className="w-full rounded-xl bg-gradient-to-r from-primary to-primary-glow text-white" disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> Guardar e continuar
          </Button>
        </form>
      </Card>
    </div>
  );
}
