import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Package, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
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

type Product = {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  cost: number;
  price: number;
  stock: number;
  min_stock: number;
  active: boolean;
};

const UNITS = ["un", "ml", "g", "kg", "L"];

export default function Estoque() {
  const { user } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [filter, setFilter] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; data?: Partial<Product> }>({ open: false });
  const [moveDialog, setMoveDialog] = useState<{ open: boolean; product?: Product; type?: "in" | "out" | "adjust" }>({ open: false });

  const load = async () => {
    const { data } = await supabase.from("products").select("*").order("name");
    if (data) setItems(data as any);
  };
  useEffect(() => { load(); }, []);

  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category).filter(Boolean) as string[])),
    [items]
  );
  const filtered = filter ? items.filter((i) => i.category === filter) : items;
  const lowStockCount = items.filter((i) => i.stock <= i.min_stock).length;

  const save = async (form: any) => {
    if (!user) return;
    if (Number(form.cost) < 0 || Number(form.price) < 0) return toast.error("Valores não podem ser negativos");
    const payload = {
      owner_id: user.id,
      name: form.name.trim(),
      category: form.category?.trim() || null,
      unit: form.unit || "un",
      cost: Number(form.cost) || 0,
      price: Number(form.price) || 0,
      min_stock: Number(form.min_stock) || 0,
      active: form.active ?? true,
    };
    const res = form.id
      ? await supabase.from("products").update(payload).eq("id", form.id)
      : await supabase.from("products").insert({ ...payload, stock: Number(form.stock) || 0 });
    if (res.error) return toast.error("Erro ao salvar");
    toast.success("Salvo"); setDialog({ open: false }); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este produto?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error("Erro ao excluir");
    toast.success("Excluído"); load();
  };

  const move = async (product: Product, type: "in" | "out" | "adjust", qty: number, reason: string) => {
    if (!user) return;
    if (qty < 0) return toast.error("Quantidade inválida");
    if (type === "out" && product.stock < qty) return toast.error("Estoque insuficiente");
    const { error } = await supabase.from("stock_movements").insert({
      owner_id: user.id, product_id: product.id, movement_type: type, quantity: qty, reason: reason || null,
    });
    if (error) return toast.error("Erro ao registrar movimento");
    toast.success("Movimento registrado"); setMoveDialog({ open: false }); load();
  };

  return (
    <div className="flex-1 flex flex-col">
      <header className="h-16 border-b bg-card flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40">
        <div className="flex items-center gap-3"><SidebarTrigger /><h1 className="font-display font-bold text-xl">Estoque</h1></div>
        <Button size="sm" onClick={() => setDialog({ open: true, data: { unit: "un", active: true, cost: 0, price: 0, stock: 0, min_stock: 0 } })}>
          <Plus className="h-4 w-4 mr-1" /> Novo
        </Button>
      </header>

      <main className="flex-1 p-4 lg:p-6 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Produtos</p>
            <p className="font-display text-2xl font-bold">{items.length}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Estoque baixo</p>
            <p className={`font-display text-2xl font-bold ${lowStockCount > 0 ? "text-destructive" : ""}`}>{lowStockCount}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Valor em estoque</p>
            <p className="font-display text-2xl font-bold">
              R$ {items.reduce((a, p) => a + Number(p.cost) * Number(p.stock), 0).toFixed(2)}
            </p>
          </Card>
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Badge variant={!filter ? "default" : "outline"} className="cursor-pointer" onClick={() => setFilter("")}>Todas</Badge>
            {categories.map((c) => (
              <Badge key={c} variant={filter === c ? "default" : "outline"} className="cursor-pointer" onClick={() => setFilter(c)}>{c}</Badge>
            ))}
          </div>
        )}

        {!filtered.length ? (
          <Card className="p-10 text-center">
            <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum produto cadastrado.</p>
          </Card>
        ) : (
          <Card className="divide-y">
            {filtered.map((p) => {
              const low = p.stock <= p.min_stock;
              return (
                <div key={p.id} className="p-4 flex items-center gap-3 hover:bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold truncate">{p.name}</p>
                      {!p.active && <Badge variant="outline">Inativo</Badge>}
                      {low && p.active && <Badge variant="destructive">Baixo</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {p.category || "Sem categoria"} • R$ {Number(p.price).toFixed(2)} • custo R$ {Number(p.cost).toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold">{Number(p.stock).toFixed(p.unit === "un" ? 0 : 2)} {p.unit}</p>
                    <p className="text-xs text-muted-foreground">mín {Number(p.min_stock).toFixed(p.unit === "un" ? 0 : 2)}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" title="Entrada" onClick={() => setMoveDialog({ open: true, product: p, type: "in" })}>
                      <ArrowDownToLine className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Saída" onClick={() => setMoveDialog({ open: true, product: p, type: "out" })}>
                      <ArrowUpFromLine className="h-4 w-4 text-orange-600" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDialog({ open: true, data: p })}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              );
            })}
          </Card>
        )}
      </main>

      <ProductDialog open={dialog.open} data={dialog.data} categories={categories}
        onClose={() => setDialog({ open: false })} onSave={save} />
      <MoveDialog open={moveDialog.open} product={moveDialog.product} type={moveDialog.type}
        onClose={() => setMoveDialog({ open: false })} onSave={move} />
    </div>
  );
}

function ProductDialog({ open, data, categories, onClose, onSave }: any) {
  const [form, setForm] = useState<any>({});
  useEffect(() => {
    if (open) setForm({
      id: data?.id, name: data?.name ?? "", category: data?.category ?? "",
      unit: data?.unit ?? "un", cost: data?.cost ?? 0, price: data?.price ?? 0,
      stock: data?.stock ?? 0, min_stock: data?.min_stock ?? 0, active: data?.active ?? true,
    });
  }, [open, data]);
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{form.id ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Input list="prod-cats" maxLength={60} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              <datalist id="prod-cats">{categories?.map((c: string) => <option key={c} value={c} />)}</datalist>
            </div>
            <div>
              <Label>Unidade</Label>
              <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Custo (R$)</Label><Input type="number" min={0} step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></div>
            <div><Label>Preço (R$)</Label><Input type="number" min={0} step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {!form.id && (
              <div><Label>Estoque inicial</Label><Input type="number" min={0} step="0.01" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
            )}
            <div><Label>Estoque mínimo</Label><Input type="number" min={0} step="0.01" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} /></div>
          </div>
          <div className="flex items-center justify-between">
            <Label>Ativo</Label>
            <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(form)} disabled={!form.name?.trim()}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MoveDialog({ open, product, type, onClose, onSave }: any) {
  const [qty, setQty] = useState(0);
  const [reason, setReason] = useState("");
  useEffect(() => { if (open) { setQty(0); setReason(""); } }, [open]);
  if (!product) return null;
  const titles: any = { in: "Entrada de estoque", out: "Saída de estoque", adjust: "Ajustar saldo" };
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{titles[type]}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{product.name} — atual: {Number(product.stock).toFixed(2)} {product.unit}</p>
          <div><Label>Quantidade</Label><Input type="number" min={0} step="0.01" value={qty} onChange={(e) => setQty(Number(e.target.value))} /></div>
          <div><Label>Motivo (opcional)</Label><Input maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(product, type, qty, reason)} disabled={qty <= 0}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
