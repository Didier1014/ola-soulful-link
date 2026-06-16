import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listMyProducts, createProduct, updateProduct, toggleProduct, deleteProduct } from "@/lib/products.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Copy, Plus, Trash2, ExternalLink, Search, Package as PackageIcon, Upload, Loader2, X, Edit3, Facebook, Phone, Tag } from "lucide-react";
import { toast } from "sonner";
import { useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/_authenticated/dashboard/products")({
  component: ProductsPage,
});

const fmtMT = (n: number) => `${new Intl.NumberFormat("pt-MZ", { maximumFractionDigits: 0 }).format(n)} MT`;

interface ProductForm {
  name: string;
  description: string;
  price_mzn: string;
  cover_path: string;
  cover_preview: string;
  delivery_url: string;
  pixel_id: string;
  utimify_id: string;
  lawtracker_id: string;
  support_phone: string;
}

const emptyForm: ProductForm = {
  name: "", description: "", price_mzn: "", cover_path: "", cover_preview: "",
  delivery_url: "", pixel_id: "", utimify_id: "", lawtracker_id: "", support_phone: "",
};

function formFromProduct(p: any): ProductForm {
  return {
    name: p.name,
    description: p.description || "",
    price_mzn: String(Number(p.price_mzn)),
    cover_path: p.cover_url || "",
    cover_preview: p.cover_url || "",
    delivery_url: p.delivery_url || "",
    pixel_id: p.pixel_id || "",
    utimify_id: p.utimify_id || "",
    lawtracker_id: p.lawtracker_id || "",
    support_phone: p.support_phone || "",
  };
}

function ProductsPage() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listMyProducts);
  const create = useServerFn(createProduct);
  const update = useServerFn(updateProduct);
  const toggle = useServerFn(toggleProduct);
  const del = useServerFn(deleteProduct);

  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: () => fetchList() });
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "active" | "inactive">("all");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => products.filter(p => {
    if (tab === "active" && !p.active) return false;
    if (tab === "inactive" && p.active) return false;
    if (query && !p.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }), [products, query, tab]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setOpen(false);
  }

  function openEdit(p: any) {
    setForm(formFromProduct(p));
    setEditingId(p.id);
    setOpen(true);
  }

  function openCreate() {
    resetForm();
    setEditingId(null);
    setOpen(true);
  }

  const createM = useMutation({
    mutationFn: () => create({ data: { name: form.name, description: form.description, price_mzn: Number(form.price_mzn), cover_path: form.cover_path, delivery_url: form.delivery_url, pixel_id: form.pixel_id, utimify_id: form.utimify_id, lawtracker_id: form.lawtracker_id, support_phone: form.support_phone } }),
    onSuccess: (p) => {
      toast.success(`Produto criado! Link: /c/${p.slug}`);
      resetForm();
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const updateM = useMutation({
    mutationFn: () => update({ data: { id: editingId!, name: form.name, description: form.description, price_mzn: Number(form.price_mzn), cover_path: form.cover_path, delivery_url: form.delivery_url, pixel_id: form.pixel_id, utimify_id: form.utimify_id, lawtracker_id: form.lawtracker_id, support_phone: form.support_phone } }),
    onSuccess: () => {
      toast.success("Produto atualizado");
      resetForm();
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Máx 5MB"); return; }
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada");
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${u.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data: signed } = await supabase.storage.from("product-images").createSignedUrl(path, 3600);
      setForm((f) => ({ ...f, cover_path: path, cover_preview: signed?.signedUrl || "" }));
      toast.success("Imagem carregada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally { setUploading(false); }
  }

  function copyLink(slug: string) {
    navigator.clipboard.writeText(`${window.location.origin}/c/${slug}`);
    toast.success("Link copiado!");
  }

  const isEditing = editingId !== null;
  const mutating = isEditing ? updateM : createM;

  return (
    <div className="space-y-4">
      <div className="px-1 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Produtos</h1>
          <p className="text-sm text-muted-foreground">{products.length} produtos</p>
        </div>
        <Button onClick={openCreate} className="rounded-xl bg-gradient-to-r from-primary to-primary-glow text-white">
          <Plus className="h-4 w-4 mr-1" /> Novo
        </Button>
      </div>

      <Card className="rounded-2xl shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar produto..." className="pl-9 bg-secondary border-0 h-11 rounded-xl" />
        </div>
        <div className="flex gap-2">
          {(["all","active","inactive"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 h-8 rounded-lg text-sm font-medium transition-colors ${tab===t ? "bg-foreground text-background" : "text-muted-foreground"}`}>
              {t === "all" ? "Todos" : t === "active" ? "Ativos" : "Inativos"}
            </button>
          ))}
        </div>
      </Card>

      {/* Create / Edit modal */}
      <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); }}>
        <DialogContent className="bg-card border-white/10 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar produto" : "Novo produto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Preço (MZN) *</Label><Input type="number" value={form.price_mzn} onChange={(e) => setForm({ ...form, price_mzn: e.target.value })} /></div>
            <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>

            {/* Imagem */}
            <div className="space-y-2">
              <Label>Imagem de capa</Label>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
              {form.cover_preview ? (
                <div className="relative">
                  <img src={form.cover_preview} alt="Capa" className="w-full h-40 object-cover rounded-xl" />
                  <button type="button" onClick={() => setForm((f) => ({ ...f, cover_path: "", cover_preview: "" }))} className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/90 flex items-center justify-center shadow"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="w-full h-32 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground hover:bg-secondary/50 transition-colors">
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                  {uploading ? "Carregando..." : "Carregar da galeria"}
                </button>
              )}
            </div>

            <div className="space-y-2"><Label>Link de entrega</Label><Input value={form.delivery_url} onChange={(e) => setForm({ ...form, delivery_url: e.target.value })} placeholder="https://..." /></div>

            {/* Rastreio e integrações */}
            <div className="border-t border-border pt-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1"><Tag className="h-3 w-3" /> Tracking & Integrações</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Facebook className="h-3 w-3 text-sky-600" /> Pixel ID</Label>
                  <Input value={form.pixel_id} onChange={(e) => setForm({ ...form, pixel_id: e.target.value })} placeholder="1234567890" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Tag className="h-3 w-3 text-violet-600" /> Utmify ID do produto</Label>
                  <Input value={form.utimify_id} onChange={(e) => setForm({ ...form, utimify_id: e.target.value })} placeholder="ID do produto na Utmify" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Tag className="h-3 w-3 text-blue-600" /> LowTrack ID</Label>
                  <Input value={form.lawtracker_id} onChange={(e) => setForm({ ...form, lawtracker_id: e.target.value })} placeholder="ID da oferta na LowTrack" />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Phone className="h-3 w-3 text-emerald-600" /> Tel. Suporte</Label>
                  <Input value={form.support_phone} onChange={(e) => setForm({ ...form, support_phone: e.target.value })} placeholder="+258 84..." />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={() => mutating.mutate()} disabled={!form.name || !form.price_mzn || mutating.isPending || uploading} className="bg-foreground text-background">
                {mutating.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                {isEditing ? "Guardar alterações" : "Criar produto"}
              </Button>
              <Button variant="ghost" onClick={resetForm}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product grid */}
      <div className="grid grid-cols-2 gap-3">
        {!filtered.length && (
          <div className="col-span-2 text-center text-sm text-muted-foreground py-10">Sem produtos.</div>
        )}
        {filtered.map((p) => (
          <Card key={p.id} className="rounded-2xl shadow-sm overflow-hidden p-3">
            <div className="aspect-square rounded-xl bg-secondary overflow-hidden relative">
              {p.cover_url ? <img src={p.cover_url} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground"><PackageIcon className="h-10 w-10" /></div>}
              <span className={`absolute top-2 left-2 inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md ${p.active ? "bg-emerald-50 text-emerald-700" : "bg-secondary text-muted-foreground"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${p.active ? "bg-emerald-500" : "bg-muted-foreground"}`} /> {p.active ? "Ativo" : "Inativo"}
              </span>
              <button onClick={() => openEdit(p)} className="absolute top-2 right-2 h-8 w-8 rounded-lg bg-background/80 backdrop-blur flex items-center justify-center shadow hover:bg-background">
                <Edit3 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="pt-3 px-1">
              <p className="font-medium text-sm truncate">{p.name}</p>
              <p className="font-semibold mt-0.5">{fmtMT(Number(p.price_mzn))}</p>

              {/* Badges for integrations */}
              {p.support_phone && (
                <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1"><Phone className="h-3 w-3" /> {p.support_phone}</p>
              )}
              {(p.pixel_id || p.utimify_id || p.lawtracker_id) && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {p.pixel_id && <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-700">Pixel</span>}
                  {p.utimify_id && <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">Utimify</span>}
                  {p.lawtracker_id && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">LawTracker</span>}
                </div>
              )}

              <div className="flex items-center gap-1 mt-2">
                <button onClick={() => copyLink(p.slug)} className="flex-1 h-8 rounded-lg bg-secondary text-foreground/80 flex items-center justify-center gap-1 text-xs"><Copy className="h-3 w-3" />Link</button>
                <a href={`/c/${p.slug}`} target="_blank" rel="noreferrer" className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center"><ExternalLink className="h-3 w-3" /></a>
                <button onClick={() => toggle({ data: { id: p.id, active: !p.active } }).then(() => qc.invalidateQueries({ queryKey: ["products"] }))} className="h-8 px-2 rounded-lg bg-secondary text-xs">{p.active ? "Off" : "On"}</button>
                <button onClick={() => { if (confirm("Eliminar?")) del({ data: { id: p.id } }).then(() => qc.invalidateQueries({ queryKey: ["products"] })); }} className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-[#e11d48]"><Trash2 className="h-3 w-3" /></button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
