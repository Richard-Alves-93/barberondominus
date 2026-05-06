import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Trash2, ShoppingCart, X } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Item = { description: string; qty: number; price: number };
type Sale = {
  id: string;
  client_id: string | null; barber_id: string | null;
  items: Item[]; total: number; payment_method: string | null;
  status: string; notes: string | null; created_at: string;
};
type Ref = { id: string; name: string };

const PAYMENTS = ["Dinheiro", "Pix", "Crédito", "Débito", "Outro"];

export default function Vendas() {
  const { user } = useAuth();
  const [items, setItems] = useState<Sale[]>([]);
  const [barbers, setBarbers] = useState<Ref[]>([]);
  const [clients, setClients] = useState<Ref[]>([]);
  const [services, setServices] = useState<(Ref & { price: number })[]>([]);
  const [dialog, setDialog] = useState<{ open: boolean; data?: any }>({ open: false });

  const load = async () => {
    const [s, b, c, sv] = await Promise.all([
      supabase.from("sales").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("barbers").select("id,name").eq("active", true).order("name"),
      supabase.from("clients").select("id,name").order("name"),
      supabase.from("services").select("id,name,price").eq("active", true).order("name"),
    ]);
    if (s.data) setItems(s.data as any);
    if (b.data) setBarbers(b.data);
    if (c.data) setClients(c.data);
    if (sv.data) setServices(sv.data as any);
  };
  useEffect(() => { load(); }, []);

  const save = async (form: any) => {
    if (!user) return;
    const total = form.items.reduce((acc: number, i: Item) => acc + Number(i.qty) * Number(i.price), 0);
    const payload = {
      owner_id: user.id,
      client_id: form.client_id || null,
      barber_id: form.barber_id || null,
      items: form.items, total,
      payment_method: form.payment_method, status: form.status,
      notes: form.notes || null,
    };
    const res = form.id
      ? await supabase.from("sales").update(payload).eq("id", form.id)
      : await supabase.from("sales").insert(payload);
    if (res.error) return toast.error("Erro ao salvar");
    toast.success("Venda registrada"); setDialog({ open: false }); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta venda?")) return;
    const { error } = await supabase.from("sales").delete().eq("id", id);
    if (error) return toast.error("Erro ao excluir");
    toast.success("Excluída"); load();
  };

  const total = useMemo(() => items.reduce((a, s) => a + Number(s.total), 0), [items]);

  const nameOf = (list: Ref[], id: string | null) => list.find((x) => x.id === id)?.name ?? "—";

  return (
    <div className="flex-1 flex flex-col">
      <header className="h-16 border-b bg-card flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40">
        <div className="flex items-center gap-3"><SidebarTrigger /><h1 className="font-display font-bold text-xl">Vendas</h1></div>
        <Button size="sm" onClick={() => setDialog({ open: true, data: { items: [{ description: "", qty: 1, price: 0 }], status: "paid", payment_method: "Dinheiro" } })}>
          <Plus className="h-4 w-4 mr-1" /> Nova venda
        </Button>
      </header>

      <main className="flex-1 p-4 lg:p-6 space-y-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total registrado (últimas 100)</p>
            <p className="font-display font-bold text-2xl">R$ {total.toFixed(2)}</p>
          </div>
          <Badge variant="secondary">{items.length} vendas</Badge>
        </Card>

        {!items.length ? (
          <Card className="p-10 text-center">
            <ShoppingCart className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhuma venda registrada.</p>
          </Card>
        ) : (
          <Card className="divide-y">
            {items.map((s) => (
              <div key={s.id} className="p-4 flex items-center gap-3 hover:bg-muted/30">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">R$ {Number(s.total).toFixed(2)}</p>
                    <Badge variant={s.status === "paid" ? "secondary" : "outline"} className="text-xs">{s.status}</Badge>
                    {s.payment_method && <Badge variant="outline" className="text-xs">{s.payment_method}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-1">
                    {nameOf(clients, s.client_id)} · {nameOf(barbers, s.barber_id)} · {format(parseISO(s.created_at), "dd/MM HH:mm", { locale: ptBR })}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {s.items?.map((i) => `${i.qty}× ${i.description}`).join(", ")}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
          </Card>
        )}
      </main>

      <SaleDialog open={dialog.open} data={dialog.data} barbers={barbers} clients={clients} services={services}
        onClose={() => setDialog({ open: false })} onSave={save} />
    </div>
  );
}

function SaleDialog({ open, data, barbers, clients, services, onClose, onSave }: any) {
  const [form, setForm] = useState<any>({ items: [] });
  useEffect(() => {
    if (open) setForm({
      id: data?.id, client_id: data?.client_id ?? "", barber_id: data?.barber_id ?? "",
      items: data?.items?.length ? data.items : [{ description: "", qty: 1, price: 0 }],
      payment_method: data?.payment_method ?? "Dinheiro", status: data?.status ?? "paid", notes: data?.notes ?? "",
    });
  }, [open, data]);

  const total = form.items?.reduce((a: number, i: Item) => a + Number(i.qty || 0) * Number(i.price || 0), 0) ?? 0;

  const setItem = (idx: number, patch: Partial<Item>) =>
    setForm({ ...form, items: form.items.map((it: Item, i: number) => i === idx ? { ...it, ...patch } : it) });

  const addServiceAsItem = (id: string) => {
    const s = services.find((x: any) => x.id === id);
    if (!s) return;
    setForm({ ...form, items: [...form.items, { description: s.name, qty: 1, price: Number(s.price) }] });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{form.id ? "Editar venda" : "Nova venda"}</DialogTitle></DialogHeader>
        <div className="space-y-3 max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cliente</Label>
              <Select value={form.client_id || "none"} onValueChange={(v) => setForm({ ...form, client_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sem cliente —</SelectItem>
                  {clients.map((c: Ref) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Barbeiro</Label>
              <Select value={form.barber_id || "none"} onValueChange={(v) => setForm({ ...form, barber_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sem barbeiro —</SelectItem>
                  {barbers.map((b: Ref) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Adicionar serviço rápido</Label>
            <Select value="" onValueChange={addServiceAsItem}>
              <SelectTrigger><SelectValue placeholder="Escolha um serviço..." /></SelectTrigger>
              <SelectContent>
                {services.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name} · R$ {Number(s.price).toFixed(2)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Itens</Label>
              <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, items: [...form.items, { description: "", qty: 1, price: 0 }] })}>
                <Plus className="h-3 w-3 mr-1" /> Item
              </Button>
            </div>
            <div className="space-y-2">
              {form.items?.map((it: Item, i: number) => (
                <div key={i} className="flex gap-2 items-start">
                  <Input className="flex-1" placeholder="Descrição" value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} />
                  <Input className="w-16" type="number" min={1} value={it.qty} onChange={(e) => setItem(i, { qty: Number(e.target.value) })} />
                  <Input className="w-24" type="number" min={0} step="0.01" value={it.price} onChange={(e) => setItem(i, { price: Number(e.target.value) })} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => setForm({ ...form, items: form.items.filter((_: any, j: number) => j !== i) })}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Pagamento</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENTS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-muted/40 rounded-lg p-3 flex items-center justify-between">
            <span className="font-semibold">Total</span>
            <span className="font-display font-bold text-xl">R$ {total.toFixed(2)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(form)} disabled={!form.items?.length || total <= 0}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
