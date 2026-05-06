import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Users, Search } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Client = { id: string; name: string; phone: string | null; email: string | null; notes: string | null };

export default function Clientes() {
  const { user } = useAuth();
  const [items, setItems] = useState<Client[]>([]);
  const [q, setQ] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; data?: Partial<Client> }>({ open: false });

  const load = async () => {
    const { data } = await supabase.from("clients").select("*").order("name");
    if (data) setItems(data);
  };
  useEffect(() => { load(); }, []);

  const save = async (form: any) => {
    if (!user) return;
    const payload = { name: form.name, phone: form.phone || null, email: form.email || null, notes: form.notes || null, owner_id: user.id };
    const res = form.id
      ? await supabase.from("clients").update(payload).eq("id", form.id)
      : await supabase.from("clients").insert(payload);
    if (res.error) return toast.error("Erro ao salvar");
    toast.success("Salvo"); setDialog({ open: false }); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este cliente?")) return;
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) return toast.error("Erro ao excluir");
    toast.success("Excluído"); load();
  };

  const filtered = items.filter((c) =>
    [c.name, c.phone, c.email].filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col">
      <header className="h-16 border-b bg-card flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40">
        <div className="flex items-center gap-3"><SidebarTrigger /><h1 className="font-display font-bold text-xl">Clientes</h1></div>
        <Button size="sm" onClick={() => setDialog({ open: true, data: {} })}><Plus className="h-4 w-4 mr-1" /> Novo</Button>
      </header>

      <main className="flex-1 p-4 lg:p-6 space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, telefone, email..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>

        {!filtered.length ? (
          <Card className="p-10 text-center">
            <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">{q ? "Nenhum resultado." : "Nenhum cliente cadastrado."}</p>
          </Card>
        ) : (
          <Card className="divide-y">
            {filtered.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-4 hover:bg-muted/30">
                <div className="h-10 w-10 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground font-bold">
                  {c.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.phone || c.email || "—"}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setDialog({ open: true, data: c })}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
          </Card>
        )}
      </main>

      <ClientDialog open={dialog.open} data={dialog.data} onClose={() => setDialog({ open: false })} onSave={save} />
    </div>
  );
}

function ClientDialog({ open, data, onClose, onSave }: any) {
  const [form, setForm] = useState<any>({});
  useEffect(() => { if (open) setForm({ id: data?.id, name: data?.name ?? "", phone: data?.phone ?? "", email: data?.email ?? "", notes: data?.notes ?? "" }); }, [open, data]);
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{form.id ? "Editar cliente" : "Novo cliente"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Observações</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(form)} disabled={!form.name}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
