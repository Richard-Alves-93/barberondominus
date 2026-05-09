import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Minus, Trash2, ShoppingCart, Search, X, Receipt, Package as PackageIcon } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStaffRole } from "@/hooks/useStaffRole";
import { toast } from "sonner";

type Item = { description: string; qty: number; price: number; service_id?: string; product_id?: string };
type Sale = {
  id: string; client_id: string | null; barber_id: string | null;
  items: Item[]; total: number; payment_method: string | null;
  status: string; notes: string | null; created_at: string;
};
type Ref = { id: string; name: string };
type Service = Ref & { price: number; category: string | null };
type Product = Ref & { price: number; category: string | null; stock: number; unit: string };

const PAYMENTS = ["Dinheiro", "Pix", "Crédito", "Débito", "Outro"];

export default function Vendas() {
  const { user } = useAuth();
  const { ownerId, isOwner, permissions } = useStaffRole();
  const [tab, setTab] = useState<"servicos" | "produtos">("servicos");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [barbers, setBarbers] = useState<Ref[]>([]);
  const [clients, setClients] = useState<Ref[]>([]);
  const [recent, setRecent] = useState<Sale[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [cart, setCart] = useState<Item[]>([]);
  const [clientId, setClientId] = useState("");
  const [barberId, setBarberId] = useState("");
  const [payment, setPayment] = useState("Dinheiro");
  const [notes, setNotes] = useState("");

  const canDelete = isOwner || permissions.can_cancel_sales;

  const load = async () => {
    const [s, p, b, c, r] = await Promise.all([
      supabase.from("services").select("id,name,price,category").eq("active", true).order("name"),
      supabase.from("products").select("id,name,price,category,stock,unit").eq("active", true).order("name"),
      supabase.from("barbers").select("id,name").eq("active", true).order("name"),
      supabase.from("clients").select("id,name").order("name"),
      supabase.from("sales").select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    if (s.data) setServices(s.data as any);
    if (p.data) setProducts(p.data as any);
    if (b.data) setBarbers(b.data);
    if (c.data) setClients(c.data);
    if (r.data) setRecent(r.data as any);
  };
  useEffect(() => { load(); }, []);

  const list = tab === "servicos" ? services : products;
  const categories = useMemo(() => {
    const set = new Set<string>();
    list.forEach((x: any) => x.category && set.add(x.category));
    return Array.from(set);
  }, [list]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((x: any) =>
      (category === "all" || x.category === category) &&
      (!q || x.name.toLowerCase().includes(q))
    );
  }, [list, search, category]);

  const addService = (s: Service) => {
    setCart((c) => {
      const idx = c.findIndex((i) => i.service_id === s.id);
      if (idx >= 0) return c.map((i, k) => k === idx ? { ...i, qty: i.qty + 1 } : i);
      return [...c, { description: s.name, qty: 1, price: Number(s.price), service_id: s.id }];
    });
  };
  const addProduct = (p: Product) => {
    setCart((c) => {
      const idx = c.findIndex((i) => i.product_id === p.id);
      if (idx >= 0) return c.map((i, k) => k === idx ? { ...i, qty: i.qty + 1 } : i);
      return [...c, { description: p.name, qty: 1, price: Number(p.price), product_id: p.id }];
    });
  };
  const updateQty = (idx: number, delta: number) =>
    setCart((c) => c.map((i, k) => k === idx ? { ...i, qty: Math.max(1, i.qty + delta) } : i));
  const removeItem = (idx: number) => setCart((c) => c.filter((_, k) => k !== idx));
  const clearCart = () => { setCart([]); setClientId(""); setBarberId(""); setPayment("Dinheiro"); setNotes(""); };

  const total = useMemo(() => cart.reduce((a, i) => a + i.qty * i.price, 0), [cart]);

  const checkout = async () => {
    if (!user || !ownerId) return;
    if (!cart.length) return toast.error("Carrinho vazio");

    // Estoque: serviços com produtos vinculados + produtos vendidos diretos
    const serviceIds = cart.map((i) => i.service_id).filter(Boolean) as string[];
    const need = new Map<string, number>();
    if (serviceIds.length) {
      const { data: links } = await supabase.from("service_products")
        .select("service_id,product_id,quantity").in("service_id", serviceIds);
      for (const it of cart) {
        if (!it.service_id) continue;
        for (const l of (links ?? []) as any[]) {
          if (l.service_id === it.service_id) {
            need.set(l.product_id, (need.get(l.product_id) ?? 0) + Number(l.quantity) * it.qty);
          }
        }
      }
    }
    for (const it of cart) {
      if (it.product_id) need.set(it.product_id, (need.get(it.product_id) ?? 0) + it.qty);
    }
    if (need.size) {
      const insufficient: string[] = [];
      for (const [pid, qty] of need) {
        const p = products.find((x) => x.id === pid);
        if (!p) continue;
        if (Number(p.stock) < qty) insufficient.push(`${p.name} (precisa ${qty} ${p.unit}, tem ${p.stock})`);
      }
      if (insufficient.length && !confirm(`Estoque insuficiente:\n• ${insufficient.join("\n• ")}\n\nFinalizar mesmo assim?`)) return;
    }

    const payload = {
      owner_id: ownerId, client_id: clientId || null, barber_id: barberId || null,
      items: cart, total, payment_method: payment, status: "paid",
      notes: notes || null,
    };
    const { error } = await supabase.from("sales").insert(payload);
    if (error) return toast.error("Erro ao registrar venda");

    if (need.size) {
      const movs = Array.from(need.entries()).map(([product_id, quantity]) => ({
        owner_id: ownerId, product_id, movement_type: "out", quantity, reason: "Venda",
      }));
      await supabase.from("stock_movements").insert(movs);
    }

    toast.success(`Venda finalizada · R$ ${total.toFixed(2)}`);
    clearCart(); load();
  };

  const removeSale = async (id: string) => {
    if (!confirm("Excluir esta venda?")) return;
    const { error } = await supabase.from("sales").delete().eq("id", id);
    if (error) return toast.error("Erro ao excluir");
    toast.success("Excluída"); load();
  };

  const nameOf = (l: Ref[], id: string | null) => l.find((x) => x.id === id)?.name ?? "—";

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <header className="h-16 border-b bg-card flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40">
        <div className="flex items-center gap-3 min-w-0">
          <SidebarTrigger />
          <h1 className="font-display font-bold text-xl truncate">PDV · Vendas</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
          <Receipt className="h-4 w-4 mr-1" /> Histórico
        </Button>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Catálogo */}
        <main className="flex-1 p-3 lg:p-4 overflow-y-auto">
          <div className="flex gap-2 mb-3">
            <Button size="sm" variant={tab === "servicos" ? "default" : "outline"} onClick={() => { setTab("servicos"); setCategory("all"); }}>Serviços</Button>
            <Button size="sm" variant={tab === "produtos" ? "default" : "outline"} onClick={() => { setTab("produtos"); setCategory("all"); }}>Produtos</Button>
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input className="pl-8" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          {categories.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mb-3">
              <Badge variant={category === "all" ? "default" : "outline"} className="cursor-pointer" onClick={() => setCategory("all")}>Todas</Badge>
              {categories.map((c) => (
                <Badge key={c} variant={category === c ? "default" : "outline"} className="cursor-pointer" onClick={() => setCategory(c)}>{c}</Badge>
              ))}
            </div>
          )}

          {!filtered.length ? (
            <Card className="p-10 text-center">
              <PackageIcon className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">Nada encontrado.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {filtered.map((x: any) => {
                const lowStock = tab === "produtos" && Number(x.stock) <= 0;
                return (
                  <button
                    key={x.id}
                    onClick={() => tab === "servicos" ? addService(x) : addProduct(x)}
                    className="group text-left rounded-xl border bg-card hover:border-primary hover:shadow-md transition p-3 active:scale-[0.98]"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-semibold text-sm leading-tight line-clamp-2 flex-1">{x.name}</p>
                      <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                    </div>
                    {x.category && <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{x.category}</p>}
                    <div className="flex items-end justify-between mt-2">
                      <p className="font-display font-bold">R$ {Number(x.price).toFixed(2)}</p>
                      {tab === "produtos" && (
                        <span className={`text-[10px] ${lowStock ? "text-destructive" : "text-muted-foreground"}`}>
                          {x.stock} {x.unit}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </main>

        {/* Carrinho */}
        <aside className="w-full lg:w-[360px] border-t lg:border-t-0 lg:border-l bg-card flex flex-col max-h-[60vh] lg:max-h-none">
          <div className="p-3 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span className="font-semibold">Carrinho</span>
              <Badge variant="secondary">{cart.length}</Badge>
            </div>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart}>Limpar</Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {!cart.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Toque em um serviço ou produto para adicionar.
              </p>
            ) : cart.map((i, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{i.description}</p>
                  <p className="text-xs text-muted-foreground">R$ {i.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateQty(idx, -1)}><Minus className="h-3 w-3" /></Button>
                  <span className="w-6 text-center text-sm font-semibold">{i.qty}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateQty(idx, 1)}><Plus className="h-3 w-3" /></Button>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeItem(idx)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          <div className="p-3 border-t space-y-2 bg-background">
            <div className="grid grid-cols-2 gap-2">
              <Select value={clientId || "none"} onValueChange={(v) => setClientId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Cliente" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sem cliente —</SelectItem>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={barberId || "none"} onValueChange={(v) => setBarberId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Barbeiro" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sem barbeiro —</SelectItem>
                  {barbers.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Select value={payment} onValueChange={setPayment}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PAYMENTS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-display font-bold text-2xl">R$ {total.toFixed(2)}</span>
            </div>
            <Button className="w-full h-11" disabled={!cart.length} onClick={checkout}>
              Finalizar venda
            </Button>
          </div>
        </aside>
      </div>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Últimas vendas</SheetTitle></SheetHeader>
          <div className="mt-4 divide-y">
            {!recent.length && <p className="text-sm text-muted-foreground py-6 text-center">Sem vendas ainda.</p>}
            {recent.map((s) => (
              <div key={s.id} className="py-3 flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">R$ {Number(s.total).toFixed(2)}</p>
                    <Badge variant={s.status === "paid" ? "secondary" : "outline"} className="text-xs">{s.status}</Badge>
                    {s.payment_method && <Badge variant="outline" className="text-xs">{s.payment_method}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {nameOf(clients, s.client_id)} · {nameOf(barbers, s.barber_id)} · {format(parseISO(s.created_at), "dd/MM HH:mm", { locale: ptBR })}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {s.items?.map((i) => `${i.qty}× ${i.description}`).join(", ")}
                  </p>
                </div>
                {canDelete && (
                  <Button variant="ghost" size="icon" onClick={() => removeSale(s.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
