// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listMyProducts, createProduct, updateProduct,
  toggleProduct, deleteProduct, duplicateProduct, aiGenerateProductCopy,
} from "@/lib/products.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ExternalLink, Copy, Pencil, Trash2, Plus, Upload, Loader2, X,
  Package as PackageIcon, ChevronLeft, Link as LinkIcon, FileDown, Box, UserPlus,
  Wand2, CreditCard, ListChecks, Activity, Beaker, Palette, ShoppingCart,
  TrendingUp, Users, Repeat, Bot,
} from "lucide-react";
import { toast } from "sonner";
import { useEffect, useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/_authenticated/dashboard/products")({
  component: ProductsPage,
});

const fmtMT = (n: number) => `${new Intl.NumberFormat("pt-MZ", { maximumFractionDigits: 0 }).format(n)} MZN`;

type ProductType = "external" | "digital" | "physical" | "lead";

const TYPE_META: Record<ProductType, { label: string; desc: string; icon: any }> = {
  external: { label: "Link externo", desc: "Após o pagamento, o cliente é redireccionado para um URL (entrega manual).", icon: LinkIcon },
  digital:  { label: "Produto digital", desc: "Disponibiliza ficheiros (PDF, ZIP) na área de membros após o pagamento.", icon: FileDown },
  physical: { label: "Produto físico", desc: "Pede o endereço de entrega no checkout. Gere envios e códigos de rastreio.", icon: Box },
  lead:     { label: "Captura de leads (grátis)", desc: "Sem pagamento. Recolhe nome, email e telefone, depois redirecciona.", icon: UserPlus },
};

interface Form {
  product_type: ProductType;
  name: string;
  slug: string;
  description: string;
  price_mzn: string;
  discount_no_balance: string;
  cover_path: string;
  cover_preview: string;
  delivery_url: string;
  thank_you_url: string;
  digital_file_path: string;
  sms_sender_id: string;
  sms_template: string;
  pixel_id: string;
  utimify_id: string;
  lawtracker_id: string;
  support_phone: string;
  config: Record<string, any>;
}

const emptyForm: Form = {
  product_type: "external",
  name: "", slug: "", description: "", price_mzn: "", discount_no_balance: "0",
  cover_path: "", cover_preview: "",
  delivery_url: "", thank_you_url: "",
  digital_file_path: "",
  sms_sender_id: "RedoxPay",
  sms_template: "Olá {nome}, obrigado pela compra de {produto} no valor de {valor}!",
  pixel_id: "", utimify_id: "", lawtracker_id: "", support_phone: "",
  config: {},
};

function fromProduct(p: any): Form {
  return {
    product_type: (p.product_type as ProductType) || "external",
    name: p.name, slug: p.slug || "",
    description: p.description || "",
    price_mzn: String(Number(p.price_mzn)),
    discount_no_balance: String(p.discount_no_balance ?? 0),
    cover_path: p.cover_url || "", cover_preview: p.cover_url || "",
    delivery_url: p.delivery_url || "", thank_you_url: p.thank_you_url || "",
    digital_file_path: p.digital_file_path || "",
    sms_sender_id: p.sms_sender_id || "RedoxPay",
    sms_template: p.sms_template || "",
    pixel_id: p.pixel_id || "", utimify_id: p.utimify_id || "",
    lawtracker_id: p.lawtracker_id || "", support_phone: p.support_phone || "",
    config: p.config || {},
  };
}

/* -------------------- Page -------------------- */

function ProductsPage() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listMyProducts);
  const create = useServerFn(createProduct);
  const update = useServerFn(updateProduct);
  const toggle = useServerFn(toggleProduct);
  const del = useServerFn(deleteProduct);
  const dup = useServerFn(duplicateProduct);

  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: () => fetchList() });

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"type" | "form">("type");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const isEditing = editingId !== null;

  function openCreate() {
    setForm(emptyForm); setEditingId(null); setStep("type"); setOpen(true);
  }
  function openEdit(p: any) {
    setForm(fromProduct(p)); setEditingId(p.id); setStep("form"); setOpen(true);
  }
  function close() { setOpen(false); setEditingId(null); setForm(emptyForm); setStep("type"); }

  const createM = useMutation({
    mutationFn: () => {
      const s = serialize(form);
      if (!s.slug || s.slug.length < 3) throw new Error("Define um slug (mínimo 3 caracteres, ex: meu-produto)");
      return create({ data: s });
    },
    onSuccess: (p) => { toast.success(`Produto criado: /c/${p.slug}`); qc.invalidateQueries({ queryKey: ["products"] }); close(); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateM = useMutation({
    mutationFn: () => update({ data: { id: editingId!, ...serialize(form) } }),
    onSuccess: () => { toast.success("Produto actualizado"); qc.invalidateQueries({ queryKey: ["products"] }); close(); },
    onError: (e: any) => toast.error(e.message),
  });

  function copyLink(slug: string) {
    navigator.clipboard.writeText(`${window.location.origin}/c/${slug}`);
    toast.success("Link copiado");
  }

  return (
    <div className="space-y-4 pb-10">
      <div className="px-1 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Produtos</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus produtos e checkouts</p>
        </div>
        <Button onClick={openCreate} className="rounded-xl bg-gradient-to-r from-primary to-primary-glow text-white">
          <Plus className="h-4 w-4 mr-1" /> Novo Produto
        </Button>
      </div>

      <div className="space-y-2">
        {!products.length && (
          <Card className="rounded-2xl p-10 text-center text-sm text-muted-foreground">
            Sem produtos. Clica em <strong>Novo Produto</strong> para começar.
          </Card>
        )}
        {products.map((p: any) => (
          <Card key={p.id} className="rounded-2xl overflow-hidden sm:p-3 sm:flex sm:items-center sm:gap-3">
            {/* Mobile: large stacked layout */}
            <div className="sm:hidden">
              <div className="aspect-[16/10] w-full bg-secondary overflow-hidden">
                {p.cover_url
                  ? <img src={p.cover_url} alt={p.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-muted-foreground"><PackageIcon className="h-10 w-10" /></div>}
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-base truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate">/{p.slug}</p>
                  </div>
                  <Switch checked={p.active} onCheckedChange={(v) => toggle({ data: { id: p.id, active: v } }).then(() => qc.invalidateQueries({ queryKey: ["products"] }))} />
                </div>
                <p className="text-primary font-bold text-lg">{fmtMT(Number(p.price_mzn))}</p>
                <div className="grid grid-cols-5 gap-1 pt-2 border-t border-border">
                  <Button variant="ghost" size="icon" className="w-full" onClick={() => window.open(`/c/${p.slug}`, "_blank")}><ExternalLink className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="w-full" onClick={() => copyLink(p.slug)}><Copy className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="w-full" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="w-full" onClick={() => dup({ data: { id: p.id } }).then(() => qc.invalidateQueries({ queryKey: ["products"] })).then(() => toast.success("Duplicado"))}><Copy className="h-4 w-4 text-muted-foreground" /></Button>
                  <Button variant="ghost" size="icon" className="w-full text-destructive"
                    onClick={() => { if (confirm("Eliminar?")) del({ data: { id: p.id } }).then(() => qc.invalidateQueries({ queryKey: ["products"] })); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Desktop: compact row */}
            <div className="hidden sm:flex sm:items-center sm:gap-3 sm:w-full">
              <div className="h-14 w-14 rounded-xl bg-secondary overflow-hidden shrink-0">
                {p.cover_url
                  ? <img src={p.cover_url} alt={p.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-muted-foreground"><PackageIcon className="h-5 w-5" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{p.name}</p>
                <p className="text-primary font-semibold text-sm">{fmtMT(Number(p.price_mzn))}</p>
                <p className="text-xs text-muted-foreground truncate">/{p.slug}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => window.open(`/c/${p.slug}`, "_blank")}><ExternalLink className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => copyLink(p.slug)}><Copy className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                <Switch checked={p.active} onCheckedChange={(v) => toggle({ data: { id: p.id, active: v } }).then(() => qc.invalidateQueries({ queryKey: ["products"] }))} />
                <Button variant="ghost" size="icon" onClick={() => dup({ data: { id: p.id } }).then(() => qc.invalidateQueries({ queryKey: ["products"] })).then(() => toast.success("Duplicado"))}><Copy className="h-4 w-4 text-muted-foreground" /></Button>
                <Button variant="ghost" size="icon" className="text-destructive"
                  onClick={() => { if (confirm("Eliminar?")) del({ data: { id: p.id } }).then(() => qc.invalidateQueries({ queryKey: ["products"] })); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <ProductDialog
        open={open} step={step} setStep={setStep}
        form={form} setForm={setForm}
        isEditing={isEditing}
        onClose={close}
        onSubmit={() => isEditing ? updateM.mutate() : createM.mutate()}
        submitting={createM.isPending || updateM.isPending}
      />
    </div>
  );
}

/* -------------------- Serialize for server -------------------- */
function serialize(f: Form) {
  return {
    product_type: f.product_type,
    name: f.name.trim(),
    slug: f.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, ""),
    description: f.description,
    price_mzn: Number(f.price_mzn || 0),
    discount_no_balance: Number(f.discount_no_balance || 0),
    cover_path: f.cover_path,
    delivery_url: f.delivery_url || "",
    thank_you_url: f.thank_you_url || "",
    digital_file_path: f.digital_file_path,
    sms_sender_id: f.sms_sender_id,
    sms_template: f.sms_template,
    pixel_id: f.pixel_id, utimify_id: f.utimify_id,
    lawtracker_id: f.lawtracker_id, support_phone: f.support_phone,
    config: f.config || {},
  };
}

/* -------------------- Dialog (wizard 2-step) -------------------- */

function ProductDialog({
  open, step, setStep, form, setForm, isEditing, onClose, onSubmit, submitting,
}: {
  open: boolean; step: "type" | "form";
  setStep: (s: "type" | "form") => void;
  form: Form; setForm: (f: Form) => void;
  isEditing: boolean; onClose: () => void; onSubmit: () => void; submitting: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="bg-card border-white/10 max-w-2xl max-h-[92vh] overflow-y-auto p-0">
        <div className="relative overflow-hidden border-b border-border/60 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent px-6 pt-6 pb-5">
          <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <DialogHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-lg shadow-primary/30">
                <PackageIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg">
                  {isEditing ? "Editar Produto" : "Novo Produto"}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {step === "type" && !isEditing ? "Passo 1 de 2 · escolha o tipo" : "Configure detalhes e recursos"}
                </p>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 pt-4">
          {step === "type" && !isEditing ? (
            <TypeStep
              value={form.product_type}
              onPick={(t) => setForm({ ...form, product_type: t })}
              onCancel={onClose}
              onContinue={() => setStep("form")}
            />
          ) : (
            <FormStep
              form={form} setForm={setForm}
              isEditing={isEditing}
              onBackToType={() => setStep("type")}
              onSubmit={onSubmit}
              submitting={submitting}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TypeStep({
  value, onPick, onCancel, onContinue,
}: { value: ProductType; onPick: (t: ProductType) => void; onCancel: () => void; onContinue: () => void }) {
  return (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <h3 className="text-base font-semibold">Que tipo de produto vai criar?</h3>
        <p className="text-sm text-muted-foreground">Escolha o tipo — poderá personalizar tudo no próximo passo.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(Object.keys(TYPE_META) as ProductType[]).map((t) => {
          const m = TYPE_META[t]; const Icon = m.icon;
          const selected = value === t;
          return (
            <button
              key={t}
              onClick={() => onPick(t)}
              className={`group relative text-left rounded-2xl border p-4 transition-all overflow-hidden ${
                selected
                  ? "border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-md shadow-primary/10 ring-1 ring-primary/40"
                  : "border-border hover:border-primary/40 hover:bg-secondary/40 hover:-translate-y-0.5"
              }`}
            >
              {selected && (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_2px] shadow-primary/60" />
              )}
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${
                selected ? "bg-primary text-white" : "bg-secondary text-primary group-hover:bg-primary/10"
              }`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="font-medium text-sm">{m.label}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{m.desc}</p>
            </button>
          );
        })}
      </div>
      <div className="flex justify-end gap-2 pt-3 border-t border-border">
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button onClick={onContinue} className="bg-gradient-to-r from-primary to-primary-glow text-white shadow-md shadow-primary/20">
          Continuar
        </Button>
      </div>
    </div>
  );
}

/* -------------------- Form step (tabs + feature pills) -------------------- */

const PILLS: { key: string; label: string; icon: any; group: "vendas" | "marketing" | "conv" | "ia" }[] = [
  { key: "pagamento",     label: "Pagamento",     icon: CreditCard,  group: "vendas" },
  { key: "checkout",      label: "Checkout",      icon: ListChecks,  group: "vendas" },
  { key: "tracking",      label: "Tracking",      icon: Activity,    group: "marketing" },
  { key: "ab",            label: "Testes A/B",    icon: Beaker,      group: "marketing" },
  { key: "personalizacao",label: "Personalização",icon: Palette,     group: "marketing" },
  { key: "orderBumps",    label: "Order Bumps",   icon: ShoppingCart,group: "conv" },
  { key: "upsells",       label: "Upsells",       icon: TrendingUp,  group: "conv" },
  { key: "provaSocial",   label: "Prova Social",  icon: Users,       group: "conv" },
  { key: "recuperacao",   label: "Recuperação",   icon: Repeat,      group: "conv" },
  { key: "assistenteIa",  label: "Assistente IA", icon: Bot,         group: "ia" },
];

function FormStep({
  form, setForm, isEditing, onBackToType, onSubmit, submitting,
}: {
  form: Form; setForm: (f: Form) => void;
  isEditing: boolean; onBackToType: () => void; onSubmit: () => void; submitting: boolean;
}) {
  const [tab, setTab] = useState<"basico" | "entrega" | "avancado">("basico");
  const [openPill, setOpenPill] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingDigital, setUploadingDigital] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const digitalRef = useRef<HTMLInputElement>(null);
  const aiFn = useServerFn(aiGenerateProductCopy);

  const meta = TYPE_META[form.product_type];

  async function uploadCover(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Imagem inválida"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Máx 5MB"); return; }
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão");
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${u.user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) throw error;
      const { data: s } = await supabase.storage.from("product-images").createSignedUrl(path, 3600);
      setForm({ ...form, cover_path: path, cover_preview: s?.signedUrl || "" });
      toast.success("Imagem carregada");
    } catch (e: any) { toast.error(e.message); } finally { setUploading(false); }
  }

  async function uploadDigital(file: File) {
    if (file.size > 50 * 1024 * 1024) { toast.error("Máx 50MB"); return; }
    setUploadingDigital(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão");
      const path = `${u.user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("product-digital").upload(path, file);
      if (error) throw error;
      setForm({ ...form, digital_file_path: path });
      toast.success("Ficheiro carregado");
    } catch (e: any) { toast.error(e.message); } finally { setUploadingDigital(false); }
  }

  async function generateAI() {
    if (!form.name) { toast.error("Insere primeiro o nome"); return; }
    try {
      const j: any = await aiFn({ data: { name: form.name, hint: form.description } });
      setForm({ ...form, name: j.title || form.name, description: j.description || form.description });
      toast.success("Texto gerado pela IA");
    } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-4">
      {/* tabs */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-secondary/70 rounded-xl text-sm border border-border/40">
        {(["basico","entrega","avancado"] as const).map(t => (
          <button key={t}
            onClick={() => setTab(t)}
            className={`py-2 rounded-lg font-medium capitalize transition-all ${
              tab === t
                ? "bg-background shadow-sm text-foreground ring-1 ring-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}>
            {t === "basico" ? "Básico" : t === "entrega" ? "Entrega" : "Avançado"}
          </button>
        ))}
      </div>

      {/* feature pills */}
      <div className="rounded-xl border border-border/50 bg-secondary/20 p-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">Recursos avançados</p>
        <div className="flex flex-wrap gap-1.5">
          {PILLS.map(p => {
            const Icon = p.icon;
            const isOn = !!form.config?.[p.key]?.enabled;
            return (
              <button key={p.key} onClick={() => setOpenPill(p.key)}
                className={`inline-flex items-center gap-1.5 text-xs px-2.5 h-7 rounded-full border transition-all ${
                  isOn
                    ? "border-primary/50 text-primary bg-primary/10 shadow-sm shadow-primary/10"
                    : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-background"
                }`}>
                <Icon className="h-3 w-3" /> {p.label}
                {isOn && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* BÁSICO */}
      {tab === "basico" && (
        <div className="space-y-3">
          <Card className="rounded-xl p-3 flex items-center justify-between bg-gradient-to-r from-primary/10 to-transparent border-primary/20">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center text-primary">
                <meta.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Tipo de produto</p>
                <p className="font-medium text-sm">{meta.label}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onBackToType} disabled={isEditing}>Alterar</Button>
          </Card>

          <div className="space-y-2">
            <Label>Imagem do Produto</Label>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCover(f); e.target.value = ""; }} />
            {form.cover_preview ? (
              <div className="relative w-32">
                <img src={form.cover_preview} className="w-32 h-32 rounded-xl object-cover" />
                <button type="button" onClick={() => setForm({ ...form, cover_path: "", cover_preview: "" })} className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background border shadow flex items-center justify-center"><X className="h-3 w-3" /></button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="w-32 h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground hover:bg-secondary/50">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? "..." : "Upload"}
              </button>
            )}
            <p className="text-xs text-muted-foreground">JPG, PNG ou WebP. Máx 5MB.</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Nome do Produto</Label>
              <Button variant="ghost" size="sm" onClick={generateAI}><Wand2 className="h-3 w-3 mr-1" /> Gerar com IA</Button>
            </div>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Curso de Marketing" />
          </div>

          <div className="space-y-2">
            <Label>Slug (URL do checkout) <span className="text-destructive">*</span></Label>
            <div className="flex items-center gap-1 rounded-md border border-border bg-secondary">
              <span className="px-3 text-xs text-muted-foreground">{typeof window !== "undefined" ? window.location.origin : "redoxpay.site"}/c/</span>
              <Input value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="nome-do-produto" className="border-0 bg-transparent" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Preço (MZN)</Label>
              <Input type="number" value={form.price_mzn} onChange={(e) => setForm({ ...form, price_mzn: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Desconto saldo (%)</Label>
              <Input type="number" value={form.discount_no_balance} onChange={(e) => setForm({ ...form, discount_no_balance: e.target.value })} />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground -mt-1">Se o cliente não tiver saldo, é redireccionado para uma página com este desconto. 0 = desactivado.</p>
        </div>
      )}

      {/* ENTREGA */}
      {tab === "entrega" && (
        <div className="space-y-3">
          {form.product_type === "external" && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><ExternalLink className="h-4 w-4" /> Link de Obrigado (redireccionamento após pagamento)</Label>
              <Input value={form.thank_you_url} onChange={(e) => setForm({ ...form, thank_you_url: e.target.value })} placeholder="https://seusite.com/obrigado" />
              <p className="text-xs text-muted-foreground">Após o pagamento, o cliente será redireccionado para este link.</p>
              <Label className="pt-2">Link de Entrega (área de membros, download, etc.)</Label>
              <Input value={form.delivery_url} onChange={(e) => setForm({ ...form, delivery_url: e.target.value })} placeholder="https://..." />
            </div>
          )}
          {form.product_type === "digital" && (
            <div className="space-y-2">
              <Label>Ficheiro do produto (PDF/ZIP/MP4)</Label>
              <input ref={digitalRef} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDigital(f); e.target.value = ""; }} />
              <Button variant="outline" onClick={() => digitalRef.current?.click()} disabled={uploadingDigital}>
                {uploadingDigital ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
                {form.digital_file_path ? "Substituir ficheiro" : "Carregar ficheiro"}
              </Button>
              {form.digital_file_path && <p className="text-xs text-muted-foreground truncate">{form.digital_file_path}</p>}
              <Label className="pt-2">Link de Obrigado</Label>
              <Input value={form.thank_you_url} onChange={(e) => setForm({ ...form, thank_you_url: e.target.value })} placeholder="https://seusite.com/obrigado" />
            </div>
          )}
          {form.product_type === "physical" && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">No checkout serão pedidos endereço e cidade.</p>
              <Label>Link de Obrigado</Label>
              <Input value={form.thank_you_url} onChange={(e) => setForm({ ...form, thank_you_url: e.target.value })} />
            </div>
          )}
          {form.product_type === "lead" && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Sem pagamento. Após preencher, o lead é redireccionado.</p>
              <Label>Link de Redireccionamento</Label>
              <Input value={form.thank_you_url} onChange={(e) => setForm({ ...form, thank_you_url: e.target.value })} placeholder="https://..." />
            </div>
          )}
        </div>
      )}

      {/* AVANÇADO */}
      {tab === "avancado" && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Sender ID (Remetente SMS)</Label>
            <Input value={form.sms_sender_id} onChange={(e) => setForm({ ...form, sms_sender_id: e.target.value })} maxLength={11} />
            <p className="text-xs text-muted-foreground">Aparecerá no SMS enviado ao cliente.</p>
          </div>
          <div className="space-y-2">
            <Label>Modelo de Mensagem SMS</Label>
            <Textarea rows={3} value={form.sms_template} onChange={(e) => setForm({ ...form, sms_template: e.target.value })} />
            <p className="text-xs text-muted-foreground">Variáveis: {"{nome}"}, {"{produto}"}, {"{valor}"}, {"{email}"}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
            <div className="space-y-2"><Label>Pixel ID (Meta)</Label><Input value={form.pixel_id} onChange={(e) => setForm({ ...form, pixel_id: e.target.value })} /></div>
            <div className="space-y-2"><Label>UTMify ID</Label><Input value={form.utimify_id} onChange={(e) => setForm({ ...form, utimify_id: e.target.value })} /></div>
            <div className="space-y-2"><Label>LowTrack Token</Label><Input value={form.lawtracker_id} onChange={(e) => setForm({ ...form, lawtracker_id: e.target.value })} placeholder="Cole aqui o token do LowTrack" /></div>
            <div className="space-y-2"><Label>Telefone Suporte</Label><Input value={form.support_phone} onChange={(e) => setForm({ ...form, support_phone: e.target.value })} placeholder="+258 84..." /></div>
            <div className="space-y-2 col-span-2">
              <Label>Pushcut Webhook URL</Label>
              <Input
                value={form.config?.pushcut_webhook_url || ""}
                onChange={(e) => setForm({ ...form, config: { ...(form.config || {}), pushcut_webhook_url: e.target.value } })}
                placeholder="https://api.pushcut.io/.../notifications/..."
              />
              <p className="text-xs text-muted-foreground">Se preenchido, dispara notificação Pushcut só para vendas deste produto (sobrepõe a configuração global).</p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between gap-2 pt-3 border-t border-border">
        {!isEditing
          ? <Button variant="ghost" size="sm" onClick={onBackToType}><ChevronLeft className="h-4 w-4 mr-1" /> Tipo</Button>
          : <span />}
        <Button onClick={onSubmit} disabled={submitting || !form.name || !form.price_mzn}
          className="flex-1 max-w-xs ml-auto bg-gradient-to-r from-primary to-primary-glow text-white">
          {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
          {isEditing ? "Salvar alterações" : "Criar Produto"}
        </Button>
      </div>

      <PillDialog
        open={openPill !== null} pillKey={openPill || ""}
        config={form.config?.[openPill || ""] || {}}
        onClose={() => setOpenPill(null)}
        onSave={(cfg) => setForm({ ...form, config: { ...form.config, [openPill!]: cfg } })}
      />
    </div>
  );
}

/* -------------------- Pill config dialog -------------------- */

function PillDialog({ open, pillKey, config, onClose, onSave }: {
  open: boolean; pillKey: string; config: any;
  onClose: () => void; onSave: (cfg: any) => void;
}) {
  const [c, setC] = useState<any>(config);
  useEffect(() => { if (open) setC({ ...config }); }, [open, pillKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const meta = PILLS.find(p => p.key === pillKey);
  if (!meta) return null;
  const Icon = meta.icon;

  function save() { onSave({ ...c, enabled: !!c.enabled }); onClose(); }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="bg-card border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Icon className="h-4 w-4 text-primary" /> {meta.label}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between pb-2 border-b border-border">
          <span className="text-sm">Activar</span>
          <Switch checked={!!c.enabled} onCheckedChange={(v) => setC({ ...c, enabled: v })} />
        </div>

        <div className="space-y-3 py-2">
          {pillKey === "pagamento" && (
            <>
              <Label>Métodos aceites</Label>
              {(["mpesa", "emola"] as const).map(m => (
                <label key={m} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={c.methods?.[m] ?? true}
                    onChange={(e) => setC({ ...c, methods: { ...(c.methods || {}), [m]: e.target.checked } })} />
                  {m === "mpesa" ? "M-Pesa" : "e-Mola"}
                </label>
              ))}
              <Label>Valor mínimo (MZN)</Label>
              <Input type="number" value={c.min_value || ""} onChange={(e) => setC({ ...c, min_value: e.target.value })} />
            </>
          )}
          {pillKey === "checkout" && (
            <>
              <Label>Cor primária</Label>
              <Input type="color" value={c.primary_color || "#6E56CF"} onChange={(e) => setC({ ...c, primary_color: e.target.value })} className="w-20 h-10 p-1" />
              <Label>Campos pedidos</Label>
              {["nome", "email", "telefone", "nuit", "endereco"].map(f => (
                <label key={f} className="flex items-center gap-2 text-sm capitalize">
                  <input type="checkbox" checked={c.fields?.[f] ?? (f === "nome" || f === "telefone")}
                    onChange={(e) => setC({ ...c, fields: { ...(c.fields || {}), [f]: e.target.checked } })} />
                  {f}
                </label>
              ))}
            </>
          )}
          {pillKey === "tracking" && (
            <>
              <Label>Facebook Pixel ID</Label>
              <Input value={c.pixel_id || ""} onChange={(e) => setC({ ...c, pixel_id: e.target.value })} />
              <Label>Google Ads ID</Label>
              <Input value={c.google_ads || ""} onChange={(e) => setC({ ...c, google_ads: e.target.value })} placeholder="AW-..." />
              <Label>Google Tag Manager</Label>
              <Input value={c.gtm || ""} onChange={(e) => setC({ ...c, gtm: e.target.value })} placeholder="GTM-..." />
            </>
          )}
          {pillKey === "ab" && (
            <>
              <Label>Variante B (URL alternativo)</Label>
              <Input value={c.variant_b_url || ""} onChange={(e) => setC({ ...c, variant_b_url: e.target.value })} placeholder="/c/slug-b" />
              <Label>% tráfego para B</Label>
              <Input type="number" min={0} max={100} value={c.split ?? 50} onChange={(e) => setC({ ...c, split: Number(e.target.value) })} />
            </>
          )}
          {pillKey === "personalizacao" && (
            <>
              <Label>Cabeçalho do checkout</Label>
              <Input value={c.header_text || ""} onChange={(e) => setC({ ...c, header_text: e.target.value })} placeholder="🔥 Oferta termina em..." />
              <Label>Contagem regressiva (minutos)</Label>
              <Input type="number" value={c.countdown_min || ""} onChange={(e) => setC({ ...c, countdown_min: e.target.value })} />
            </>
          )}
          {pillKey === "orderBumps" && (
            <>
              <Label>IDs de produtos extra (separados por vírgula)</Label>
              <Input value={c.product_ids || ""} onChange={(e) => setC({ ...c, product_ids: e.target.value })} placeholder="id1, id2, id3" />
            </>
          )}
          {pillKey === "upsells" && (
            <>
              <Label>ID do produto upsell</Label>
              <Input value={c.upsell_id || ""} onChange={(e) => setC({ ...c, upsell_id: e.target.value })} />
              <Label>Desconto (%)</Label>
              <Input type="number" value={c.discount || ""} onChange={(e) => setC({ ...c, discount: e.target.value })} />
            </>
          )}
          {pillKey === "provaSocial" && (
            <>
              <Label>Mostrar vendas recentes</Label>
              <p className="text-xs text-muted-foreground">Mostra as últimas vendas (anonimizadas) no checkout.</p>
              <Label>Número mínimo de vendas para mostrar</Label>
              <Input type="number" value={c.min_sales ?? 3} onChange={(e) => setC({ ...c, min_sales: Number(e.target.value) })} />
            </>
          )}
          {pillKey === "recuperacao" && (
            <>
              <Label>Atraso (minutos)</Label>
              <Input type="number" value={c.delay_min ?? 15} onChange={(e) => setC({ ...c, delay_min: Number(e.target.value) })} />
              <Label>Mensagem</Label>
              <Textarea value={c.message || "Olá {nome}, terminou a compra de {produto}?"} onChange={(e) => setC({ ...c, message: e.target.value })} />
            </>
          )}
          {pillKey === "assistenteIa" && (
            <>
              <p className="text-sm text-muted-foreground">Use a IA na aba <strong>Básico</strong> para gerar nome e descrição automaticamente.</p>
              <Label>Prompt extra (opcional)</Label>
              <Textarea value={c.extra_prompt || ""} onChange={(e) => setC({ ...c, extra_prompt: e.target.value })} placeholder="Tom de voz, palavras-chave..." />
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} className="bg-primary text-primary-foreground">Guardar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
