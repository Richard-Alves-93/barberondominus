import { useEffect, useState } from "react";
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

type Service = { id: string; name: string; duration_minutes: number; price: number; active: boolean };

export default function Servicos() {
  const { user } = useAuth();
  const [items, setItems] = useState<Service[]>([]);
  const [dialog, setDialog] = useState<{ open: boolean; data?: Partial<Service> }>({ open: false });

  const load = async () => {
    const { data } = await supabase.from("services").select("*").order("name");
    if (data) setItems(data);
  };
  useEffect(() => { load(); }, []);

  const save = async (form: any) => {
    if (!user) return;
    const payload = {
      name: form.name, duration_minutes: Number(form.duration_minutes) || 30,
      price: Number(form.price) || 0, active: form.active ?? true, owner_id: user.id,
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
        <Button size="sm" onClick={() => setDialog({ open: true, data: { duration_minutes: 30, active: true } })}><Plus className="h-4 w-4 mr-1" /> Novo</Button>
      </header>

      <main className="flex-1 p-4 lg:p-6">
        {!items.length ? (
          <Card className="p-10 text-center">
            <ShoppingBag className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum serviço cadastrado.</p>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.duration_minutes} min</p>
                  </div>
                  <Badge variant={s.active ? "secondary" : "outline"}>{s.active ? "Ativo" : "Inativo"}</Badge>
                </div>
                <p className="font-display text-2xl font-bold">R$ {Number(s.price).toFixed(2)}</p>
                <div className="flex gap-1 mt-3 justify-end">
                  <Button variant="ghost" size="icon" onClick={() => setDialog({ open: true, data: s })}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <ServiceDialog open={dialog.open} data={dialog.data} onClose={() => setDialog({ open: false })} onSave={save} />
    </div>
  );
}

function ServiceDialog({ open, data, onClose, onSave }: any) {
  const [form, setForm] = useState<any>({});
  useEffect(() => { if (open) setForm({ id: data?.id, name: data?.name ?? "", duration_minutes: data?.duration_minutes ?? 30, price: data?.price ?? 0, active: data?.active ?? true }); }, [open, data]);
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{form.id ? "Editar serviço" : "Novo serviço"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Duração (min)</Label><Input type="number" min={5} step={5} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} /></div>
            <div><Label>Preço (R$)</Label><Input type="number" min={0} step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
          </div>
          <div className="flex items-center justify-between"><Label>Ativo</Label><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(form)} disabled={!form.name}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
