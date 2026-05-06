import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, ShoppingBag } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Service = {
  id: string;
  name: string;
  category: string | null;
  duration_minutes: number;
  cost: number;
  profit_margin: number;
  price: number;
  active: boolean;
};

export default function Servicos() {
  const { user } = useAuth();
  const [items, setItems] = useState<Service[]>([]);
  const [dialog, setDialog] = useState<{ open: boolean; data?: Partial<Service> }>({ open: false });
  const [filterCat, setFilterCat] = useState<string>("");

  const load = async () => {
    const { data } = await supabase.from("services").select("*").order("category").order("name");
    if (data) setItems(data as any);
  };
  useEffect(() => { load(); }, []);

  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category).filter(Boolean) as string[])),
    [items]
  );
  const filtered = filterCat ? items.filter((i) => i.category === filterCat) : items;

  const save = async (form: any) => {
    if (!user) return;
    const cost = Number(form.cost) || 0;
    const margin = Number(form.profit_margin) || 0;
    const price = form.price !== "" && form.price != null ? Number(form.price) : +(cost * (1 + margin / 100)).toFixed(2);
    const payload = {
      name: form.name,
      category: form.category || null,
      duration_minutes: Number(form.duration_minutes) || 30,
      cost,
      profit_margin: margin,
      price,
      active: form.active ?? true,
      owner_id: user.id,
    };
    const res = form.id
      ? await supabase.from("services").update(payload).eq("id", form.id)
      : await supabase.from("services").insert(payload);
    if (res.error) return toast.error("Erro ao salvar");
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
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Badge variant={!filterCat ? "default" : "outline"} className="cursor-pointer" onClick={() => setFilterCat("")}>Todas</Badge>
            {categories.map((c) => (
              <Badge key={c} variant={filterCat === c ? "default" : "outline"} className="cursor-pointer" onClick={() => setFilterCat(c)}>{c}</Badge>
            ))}
          </div>
        )}

        {!filtered.length ? (
          <Card className="p-10 text-center">
            <ShoppingBag className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum serviço cadastrado.</p>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.category ? `${s.category} • ` : ""}{s.duration_minutes} min
                    </p>
                  </div>
                  <Badge variant={s.active ? "secondary" : "outline"}>{s.active ? "Ativo" : "Inativo"}</Badge>
                </div>
                <p className="font-display text-2xl font-bold">R$ {Number(s.price).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Custo R$ {Number(s.cost).toFixed(2)} • Margem {Number(s.profit_margin).toFixed(0)}%
                </p>
                <div className="flex gap-1 mt-3 justify-end">
                  <Button variant="ghost" size="icon" onClick={() => setDialog({ open: true, data: s })}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <ServiceDialog
        open={dialog.open}
        data={dialog.data}
        categories={categories}
        onClose={() => setDialog({ open: false })}
        onSave={save}
      />
    </div>
  );
}

function ServiceDialog({ open, data, categories, onClose, onSave }: any) {
  const [form, setForm] = useState<any>({});
  const [priceTouched, setPriceTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        id: data?.id,
        name: data?.name ?? "",
        category: data?.category ?? "",
        duration_minutes: data?.duration_minutes ?? 30,
        cost: data?.cost ?? 0,
        profit_margin: data?.profit_margin ?? 0,
        price: data?.price ?? 0,
        active: data?.active ?? true,
      });
      setPriceTouched(false);
    }
  }, [open, data]);

  const computedPrice = useMemo(() => {
    const c = Number(form.cost) || 0;
    const m = Number(form.profit_margin) || 0;
    return +(c * (1 + m / 100)).toFixed(2);
  }, [form.cost, form.profit_margin]);

  // Auto-update price when user hasn't manually edited it
  useEffect(() => {
    if (!priceTouched) setForm((f: any) => ({ ...f, price: computedPrice }));
  }, [computedPrice, priceTouched]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{form.id ? "Editar serviço" : "Novo serviço"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Categoria</Label>
            <Input
              list="service-categories"
              placeholder="Ex: Corte, Barba, Coloração"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
            <datalist id="service-categories">
              {categories?.map((c: string) => <option key={c} value={c} />)}
            </datalist>
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
            </div>
            <div>
              <Label>Margem (%)</Label>
              <Input type="number" min={0} step="1" value={form.profit_margin}
                onChange={(e) => setForm({ ...form, profit_margin: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Preço de venda (R$)</Label>
            <Input type="number" min={0} step="0.01" value={form.price}
              onChange={(e) => { setPriceTouched(true); setForm({ ...form, price: e.target.value }); }} />
            <p className="text-xs text-muted-foreground mt-1">
              Sugerido: R$ {computedPrice.toFixed(2)} (custo + margem)
              {priceTouched && (
                <button type="button" className="ml-2 underline" onClick={() => { setPriceTouched(false); setForm({ ...form, price: computedPrice }); }}>
                  usar sugerido
                </button>
              )}
            </p>
          </div>
          <div className="flex items-center justify-between">
            <Label>Ativo</Label>
            <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(form)} disabled={!form.name}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
