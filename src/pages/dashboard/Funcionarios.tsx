import { useEffect, useState } from "react";
import { Plus, Trash2, UserCog, ShieldCheck } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Staff = {
  id: string; user_id: string; name: string; email: string | null; active: boolean;
  can_pdv: boolean; can_agenda: boolean; can_view_clients: boolean; can_view_services: boolean;
  can_cancel_sales: boolean; can_view_reports: boolean; can_manage_stock: boolean;
};

const PERM_LABELS: { key: keyof Staff; label: string; hint?: string }[] = [
  { key: "can_pdv", label: "Acessar PDV / Vendas" },
  { key: "can_agenda", label: "Acessar Agenda" },
  { key: "can_view_clients", label: "Ver Clientes" },
  { key: "can_view_services", label: "Ver Serviços" },
  { key: "can_cancel_sales", label: "Cancelar / excluir vendas" },
  { key: "can_view_reports", label: "Ver Relatórios" },
  { key: "can_manage_stock", label: "Gerenciar Estoque" },
];

export default function Funcionarios() {
  const [items, setItems] = useState<Staff[]>([]);
  const [dialog, setDialog] = useState<{ open: boolean; data?: any }>({ open: false });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("staff_members")
      .select("*").order("created_at", { ascending: false });
    if (data) setItems(data as any);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm("Remover acesso deste funcionário?")) return;
    const { error } = await supabase.from("staff_members").delete().eq("id", id);
    if (error) return toast.error("Erro ao remover");
    toast.success("Funcionário removido"); load();
  };

  const toggleActive = async (s: Staff) => {
    const { error } = await supabase.from("staff_members").update({ active: !s.active }).eq("id", s.id);
    if (error) return toast.error("Erro");
    load();
  };

  const save = async (form: any) => {
    setSaving(true);
    try {
      if (form.id) {
        const { error } = await supabase.from("staff_members").update({
          name: form.name,
          can_pdv: form.can_pdv, can_agenda: form.can_agenda,
          can_view_clients: form.can_view_clients, can_view_services: form.can_view_services,
          can_cancel_sales: form.can_cancel_sales, can_view_reports: form.can_view_reports,
          can_manage_stock: form.can_manage_stock,
        }).eq("id", form.id);
        if (error) throw error;
      } else {
        if (!form.email || !form.password || form.password.length < 6) {
          toast.error("Email e senha (min 6) são obrigatórios"); setSaving(false); return;
        }
        const { data, error } = await supabase.functions.invoke("create-staff", {
          body: {
            email: form.email, password: form.password, name: form.name,
            permissions: {
              can_pdv: form.can_pdv, can_agenda: form.can_agenda,
              can_view_clients: form.can_view_clients, can_view_services: form.can_view_services,
              can_cancel_sales: form.can_cancel_sales, can_view_reports: form.can_view_reports,
              can_manage_stock: form.can_manage_stock,
            },
          },
        });
        if (error || (data as any)?.error) throw new Error((data as any)?.error ?? error?.message);
      }
      toast.success("Salvo"); setDialog({ open: false }); load();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar");
    } finally { setSaving(false); }
  };

  return (
    <div className="flex-1 flex flex-col">
      <header className="h-16 border-b bg-card flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <SidebarTrigger /><h1 className="font-display font-bold text-xl">Funcionários</h1>
        </div>
        <Button size="sm" onClick={() => setDialog({ open: true, data: {
          name: "", email: "", password: "",
          can_pdv: true, can_agenda: true, can_view_clients: true, can_view_services: true,
          can_cancel_sales: false, can_view_reports: false, can_manage_stock: false,
        } })}>
          <Plus className="h-4 w-4 mr-1" /> Novo funcionário
        </Button>
      </header>

      <main className="flex-1 p-4 lg:p-6 space-y-4">
        {!items.length ? (
          <Card className="p-10 text-center">
            <UserCog className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum funcionário cadastrado.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Cadastre seus funcionários e defina o que cada um pode acessar.
            </p>
          </Card>
        ) : (
          <Card className="divide-y">
            {items.map((s) => (
              <div key={s.id} className="p-4 flex items-center gap-3 hover:bg-muted/30">
                <div className="h-10 w-10 rounded-full bg-gradient-hero flex items-center justify-center text-sm font-bold text-primary-foreground">
                  {s.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold truncate">{s.name}</p>
                    {!s.active && <Badge variant="outline" className="text-xs">Inativo</Badge>}
                    {s.can_pdv && <Badge variant="secondary" className="text-xs">PDV</Badge>}
                    {s.can_agenda && <Badge variant="secondary" className="text-xs">Agenda</Badge>}
                    {s.can_cancel_sales && <Badge className="text-xs"><ShieldCheck className="h-3 w-3 mr-1" />Cancela vendas</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                </div>
                <Switch checked={s.active} onCheckedChange={() => toggleActive(s)} />
                <Button variant="ghost" size="sm" onClick={() => setDialog({ open: true, data: s })}>Editar</Button>
                <Button variant="ghost" size="icon" onClick={() => remove(s.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </Card>
        )}
      </main>

      <StaffDialog open={dialog.open} data={dialog.data} saving={saving}
        onClose={() => setDialog({ open: false })} onSave={save} />
    </div>
  );
}

function StaffDialog({ open, data, saving, onClose, onSave }: any) {
  const [form, setForm] = useState<any>({});
  useEffect(() => { if (open) setForm({ ...data }); }, [open, data]);
  const isEdit = !!form.id;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar funcionário" : "Novo funcionário"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[65vh] overflow-y-auto">
          <div>
            <Label>Nome</Label>
            <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          {!isEdit && (
            <>
              <div>
                <Label>Email de acesso</Label>
                <Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label>Senha provisória (mín 6)</Label>
                <Input type="text" value={form.password ?? ""} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                <p className="text-xs text-muted-foreground mt-1">
                  Compartilhe com o funcionário. Ele pode trocar depois.
                </p>
              </div>
            </>
          )}

          <div className="border-t pt-3">
            <p className="text-sm font-semibold mb-2">Permissões</p>
            <div className="space-y-2">
              {PERM_LABELS.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <Label className="font-normal">{label}</Label>
                  <Switch checked={!!form[key]} onCheckedChange={(v) => setForm({ ...form, [key]: v })} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={() => onSave(form)} disabled={saving || !form.name}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
