import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Scissors } from "lucide-react";
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

type Barber = { id: string; name: string; color: string; active: boolean };

const COLORS = ["#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#EF4444", "#06B6D4", "#F97316"];

export default function Barbeiros() {
  const { user } = useAuth();
  const [items, setItems] = useState<Barber[]>([]);
  const [dialog, setDialog] = useState<{ open: boolean; data?: Partial<Barber> }>({ open: false });

  const load = async () => {
    const { data } = await supabase.from("barbers").select("*").order("name");
    if (data) setItems(data);
  };
  useEffect(() => { load(); }, []);

  const save = async (form: any) => {
    if (!user) return;
    const payload = { name: form.name, color: form.color, active: form.active ?? true, owner_id: user.id };
    if (form.id) {
      const { error } = await supabase.from("barbers").update(payload).eq("id", form.id);
      if (error) return toast.error("Erro ao salvar");
    } else {
      const { error } = await supabase.from("barbers").insert(payload);
      if (error) return toast.error("Erro ao criar");
    }
    toast.success("Salvo");
    setDialog({ open: false });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este barbeiro?")) return;
    const { error } = await supabase.from("barbers").delete().eq("id", id);
    if (error) return toast.error("Erro ao excluir");
    toast.success("Excluído");
    load();
  };

  return (
    <div className="flex-1 flex flex-col">
      <header className="h-16 border-b bg-card flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40">
        <div className="flex items-center gap-3"><SidebarTrigger /><h1 className="font-display font-bold text-xl">Barbeiros</h1></div>
        <Button size="sm" onClick={() => setDialog({ open: true, data: { color: COLORS[0], active: true } })}><Plus className="h-4 w-4 mr-1" /> Novo</Button>
      </header>

      <main className="flex-1 p-4 lg:p-6">
        {!items.length ? (
          <Card className="p-10 text-center">
            <Scissors className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum barbeiro cadastrado ainda.</p>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((b) => (
              <Card key={b.id} className="p-4 flex items-center gap-3">
                <div className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold" style={{ background: b.color }}>
                  {b.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{b.name}</p>
                  <Badge variant={b.active ? "secondary" : "outline"} className="mt-1 text-xs">{b.active ? "Ativo" : "Inativo"}</Badge>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setDialog({ open: true, data: b })}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => remove(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </Card>
            ))}
          </div>
        )}
      </main>

      <BarberDialog open={dialog.open} data={dialog.data} onClose={() => setDialog({ open: false })} onSave={save} />
    </div>
  );
}

function BarberDialog({ open, data, onClose, onSave }: any) {
  const [form, setForm] = useState<any>({});
  useEffect(() => { if (open) setForm({ id: data?.id, name: data?.name ?? "", color: data?.color ?? COLORS[0], active: data?.active ?? true }); }, [open, data]);
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{form.id ? "Editar barbeiro" : "Novo barbeiro"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div>
            <Label>Cor de identificação</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                  className={`h-8 w-8 rounded-full border-2 ${form.color === c ? "border-foreground" : "border-transparent"}`} style={{ background: c }} />
              ))}
            </div>
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
