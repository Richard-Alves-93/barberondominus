import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, ShoppingBag, X } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Service = {
  id: string;
  name: string;
  category: string | null;
  subcategory: string | null;
  duration_minutes: number;
  cost: number;
  profit_margin: number;
  price: number;
  active: boolean;
};
type Product = { id: string; name: string; unit: string; stock: number };
type Link = { id?: string; product_id: string; quantity: number };

export default function Servicos() {
  const { user } = useAuth();
  const [items, setItems] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [links, setLinks] = useState<Record<string, Link[]>>({});
  const [dialog, setDialog] = useState<{ open: boolean; data?: Partial<Service> }>({ open: false });
  const [filterCat, setFilterCat] = useState<string>("");
  const [filterSub, setFilterSub] = useState<string>("");

  const load = async () => {
    const [s, p, l] = await Promise.all([
      supabase.from("services").select("*").order("category").order("subcategory").order("name"),
      supabase.from("products").select("id,name,unit,stock").eq("active", true).order("name"),
      supabase.from("service_products").select("id,service_id,product_id,quantity"),
    ]);
    if (s.data) setItems(s.data as any);
    if (p.data) setProducts(p.data as any);
    if (l.data) {
      const map: Record<string, Link[]> = {};
      for (const row of l.data as any[]) {
        (map[row.service_id] ??= []).push({ id: row.id, product_id: row.product_id, quantity: Number(row.quantity) });
      }
      setLinks(map);
    }
  };
  useEffect(() => { load(); }, []);

  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category).filter(Boolean) as string[])),
    [items]
  );
  const subcategories = useMemo(
    () => Array.from(new Set(items.filter((i) => !filterCat || i.category === filterCat)
      .map((i) => i.subcategory).filter(Boolean) as string[])),
    [items, filterCat]
  );
  const filtered = items.filter((i) =>
    (!filterCat || i.category === filterCat) && (!filterSub || i.subcategory === filterSub)
  );

  const save = async (form: any, formLinks: Link[]) => {
    if (!user) return;
    const cost = Number(form.cost) || 0;
    const margin = Number(form.profit_margin) || 0;
    if (margin < 0) return toast.error("Margem não pode ser negativa");
    if (cost < 0) return toast.error("Custo não pode ser negativo");
    const price = form.price !== "" && form.price != null ? Number(form.price) : +(cost * (1 + margin / 100)).toFixed(2);
    if (price < 0) return toast.error("Preço não pode ser negativo");
    const payload = {
      name: form.name.trim(),
      category: form.category?.trim() || null,
      subcategory: form.subcategory?.trim() || null,
      duration_minutes: Number(form.duration_minutes) || 30,
      cost, profit_margin: margin, price,
      active: form.active ?? true,
      owner_id: user.id,
    };
    const res = form.id
      ? await supabase.from("services").update(payload).eq("id", form.id).select().single()
      : await supabase.from("services").insert(payload).select().single();
    if (res.error || !res.data) return toast.error("Erro ao salvar");

    const serviceId = (res.data as any).id;
    // resync vínculos
    await supabase.from("service_products").delete().eq("service_id", serviceId);
    if (formLinks.length) {
      const rows = formLinks
        .filter((l) => l.product_id && l.quantity > 0)
        .map((l) => ({ owner_id: user.id, service_id: serviceId, product_id: l.product_id, quantity: l.quantity }));
      if (rows.length) await supabase.from("service_products").insert(rows);
    }

    toast.success("Salvo"); setDialog({ open: false }); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este serviço?")) return;
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) return toast.error("Erro ao excluir");
    toast.success("Excluído"); load();
  };

  return (
    <div className="flex-1 flex flex-col">
      <header className="h-16 border-b bg-card flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40">
        <div className="flex items-center gap-3"><SidebarTrigger /><h1 className="font-display font-bold text-xl">Serviços</h1></div>
        <Button size="sm" onClick={() => setDialog({ open: true, data: { duration_minutes: 30, active: true, cost: 0, profit_margin: 0 } })}><Plus className="h-4 w-4 mr-1" /> Novo</Button>
      </header>

      <main className="flex-1 p-4 lg:p-6 space-y-4">
        {(categories.length > 0 || subcategories.length > 0) && (
          <div className="space-y-2">
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-muted-foreground mr-1">Categoria:</span>
                <Badge variant={!filterCat ? "default" : "outline"} className="cursor-pointer"
                  onClick={() => { setFilterCat(""); setFilterSub(""); }}>Todas</Badge>
                {categories.map((c) => (
                  <Badge key={c} variant={filterCat === c ? "default" : "outline"} className="cursor-pointer"
                    onClick={() => { setFilterCat(c); setFilterSub(""); }}>{c}</Badge>
                ))}
              </div>
            )}
            {subcategories.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-muted-foreground mr-1">Subcategoria:</span>
                <Badge variant={!filterSub ? "default" : "outline"} className="cursor-pointer" onClick={() => setFilterSub("")}>Todas</Badge>
                {subcategories.map((c) => (
                  <Badge key={c} variant={filterSub === c ? "default" : "outline"} className="cursor-pointer" onClick={() => setFilterSub(c)}>{c}</Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {!filtered.length ? (
          <Card className="p-10 text-center">
            <ShoppingBag className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum serviço cadastrado.</p>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((s) => {
              const l = links[s.id] ?? [];
              const lowStock = l.some((x) => {
                const p = products.find((pp) => pp.id === x.product_id);
                return p && p.stock < x.quantity;
              });
              return (
                <Card key={s.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[s.category, s.subcategory].filter(Boolean).join(" › ") || "Sem categoria"} • {s.duration_minutes} min
                      </p>
                    </div>
                    <Badge variant={s.active ? "secondary" : "outline"}>{s.active ? "Ativo" : "Inativo"}</Badge>
                  </div>
                  <p className="font-display text-2xl font-bold">R$ {Number(s.price).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Custo R$ {Number(s.cost).toFixed(2)} • Margem {Number(s.profit_margin).toFixed(0)}%
                  </p>
                  {l.length > 0 && (
                    <p className={`text-xs mt-1 ${lowStock ? "text-destructive" : "text-muted-foreground"}`}>
                      {l.length} produto(s) vinculado(s){lowStock ? " • estoque insuficiente" : ""}
                    </p>
                  )}
                  <div className="flex gap-1 mt-3 justify-end">
                    <Button variant="ghost" size="icon" onClick={() => setDialog({ open: true, data: s })}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <ServiceDialog
        open={dialog.open}
        data={dialog.data}
        categories={categories}
        allItems={items}
        products={products}
        existingLinks={dialog.data?.id ? (links[dialog.data.id as string] ?? []) : []}
        onClose={() => setDialog({ open: false })}
        onSave={save}
      />
    </div>
  );
}

function ServiceDialog({ open, data, categories, allItems, products, existingLinks, onClose, onSave }: any) {
  const [form, setForm] = useState<any>({});
  const [priceTouched, setPriceTouched] = useState(false);
  const [serviceLinks, setServiceLinks] = useState<Link[]>([]);

  useEffect(() => {
    if (open) {
      setForm({
        id: data?.id,
        name: data?.name ?? "",
        category: data?.category ?? "",
        subcategory: data?.subcategory ?? "",
        duration_minutes: data?.duration_minutes ?? 30,
        cost: data?.cost ?? 0,
        profit_margin: data?.profit_margin ?? 0,
        price: data?.price ?? 0,
        active: data?.active ?? true,
      });
      // Considera "manualmente ajustado" se preço já existe e diverge do calculado
      const computed = +((Number(data?.cost) || 0) * (1 + (Number(data?.profit_margin) || 0) / 100)).toFixed(2);
      setPriceTouched(!!data?.id && Math.abs(Number(data?.price ?? 0) - computed) > 0.005);
      setServiceLinks(existingLinks.map((l: Link) => ({ ...l })));
    }
  }, [open, data, existingLinks]);

  const subcategoriesForCat = useMemo(() => {
    return Array.from(new Set(
      (allItems as Service[])
        .filter((i) => i.category === form.category)
        .map((i) => i.subcategory)
        .filter(Boolean) as string[]
    ));
  }, [allItems, form.category]);

  const computedPrice = useMemo(() => {
    const c = Math.max(0, Number(form.cost) || 0);
    const m = Math.max(0, Number(form.profit_margin) || 0);
    return +(c * (1 + m / 100)).toFixed(2);
  }, [form.cost, form.profit_margin]);

  useEffect(() => {
    if (!priceTouched) setForm((f: any) => ({ ...f, price: computedPrice }));
  }, [computedPrice, priceTouched]);

  const marginInvalid = Number(form.profit_margin) < 0;
  const costInvalid = Number(form.cost) < 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{form.id ? "Editar serviço" : "Novo serviço"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Input list="svc-cats" maxLength={60} placeholder="Ex: Cabelo"
                value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              <datalist id="svc-cats">{categories?.map((c: string) => <option key={c} value={c} />)}</datalist>
            </div>
            <div>
              <Label>Subcategoria</Label>
              <Input list="svc-subs" maxLength={60} placeholder="Ex: Coloração"
                value={form.subcategory} onChange={(e) => setForm({ ...form, subcategory: e.target.value })} />
              <datalist id="svc-subs">{subcategoriesForCat.map((c: string) => <option key={c} value={c} />)}</datalist>
            </div>
          </div>
          <div>
            <Label>Duração (min)</Label>
            <Input type="number" min={5} step={5} value={form.duration_minutes}
              onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Custo (R$)</Label>
              <Input type="number" min={0} step="0.01" value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })} />
              {costInvalid && <p className="text-xs text-destructive mt-1">Não pode ser negativo</p>}
            </div>
            <div>
              <Label>Margem (%)</Label>
              <Input type="number" min={0} step="1" value={form.profit_margin}
                onChange={(e) => setForm({ ...form, profit_margin: e.target.value })} />
              {marginInvalid && <p className="text-xs text-destructive mt-1">Não pode ser negativa</p>}
            </div>
          </div>
          <div>
            <Label>Preço de venda (R$)</Label>
            <Input type="number" min={0} step="0.01" value={form.price}
              onChange={(e) => { setPriceTouched(true); setForm({ ...form, price: e.target.value }); }} />
            <p className="text-xs text-muted-foreground mt-1">
              Sugerido: R$ {computedPrice.toFixed(2)}
              {priceTouched && (
                <button type="button" className="ml-2 underline" onClick={() => { setPriceTouched(false); setForm({ ...form, price: computedPrice }); }}>
                  usar sugerido
                </button>
              )}
            </p>
          </div>

          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <Label>Produtos consumidos</Label>
              <Button type="button" variant="ghost" size="sm"
                onClick={() => setServiceLinks([...serviceLinks, { product_id: "", quantity: 1 }])}>
                <Plus className="h-3 w-3 mr-1" /> Vincular
              </Button>
            </div>
            {!serviceLinks.length ? (
              <p className="text-xs text-muted-foreground">Nenhum produto vinculado.</p>
            ) : (
              <div className="space-y-2">
                {serviceLinks.map((l, idx) => {
                  const p = products.find((pp: Product) => pp.id === l.product_id);
                  return (
                    <div key={idx} className="flex gap-2 items-start">
                      <Select value={l.product_id || undefined}
                        onValueChange={(v) => setServiceLinks(serviceLinks.map((x, i) => i === idx ? { ...x, product_id: v } : x))}>
                        <SelectTrigger className="flex-1"><SelectValue placeholder="Produto..." /></SelectTrigger>
                        <SelectContent>
                          {products.map((p: Product) => (
                            <SelectItem key={p.id} value={p.id}>{p.name} ({p.stock} {p.unit})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input className="w-20" type="number" min={0} step="0.01" value={l.quantity}
                        onChange={(e) => setServiceLinks(serviceLinks.map((x, i) => i === idx ? { ...x, quantity: Number(e.target.value) } : x))} />
                      <Button type="button" variant="ghost" size="icon"
                        onClick={() => setServiceLinks(serviceLinks.filter((_, i) => i !== idx))}>
                        <X className="h-4 w-4" />
                      </Button>
                      {p && p.stock < l.quantity && (
                        <p className="text-xs text-destructive w-full">Estoque insuficiente ({p.stock} {p.unit})</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label>Ativo</Label>
            <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(form, serviceLinks)} disabled={!form.name?.trim() || marginInvalid || costInvalid}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
