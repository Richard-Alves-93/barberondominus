import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fmtBRL } from "./lib";

type Plan = {
  id: string; name: string; description: string | null;
  billing_type: "fixed" | "percent"; monthly_price: number;
  revenue_percent: number; adhesion_fee: number; active: boolean;
};
const empty: Omit<Plan, "id"> = {
  name: "", description: "", billing_type: "fixed",
  monthly_price: 0, revenue_percent: 0, adhesion_fee: 0, active: true,
};

export default function AdminPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState<Omit<Plan, "id">>(empty);

  const load = async () => {
    const { data } = await supabase.from("plans").select("*").order("monthly_price");
    setPlans((data ?? []) as Plan[]);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (p: Plan) => { setEditing(p); const { id, ...r } = p; setForm(r); setOpen(true); };

  const save = async () => {
    if (!form.name.trim()) return toast.error("Nome obrigatório");
    if (form.adhesion_fee < 0 || form.monthly_price < 0 || form.revenue_percent < 0)
      return toast.error("Valores não podem ser negativos");
    const payload = {
      ...form,
      monthly_price: Number(form.monthly_price) || 0,
      revenue_percent: Number(form.revenue_percent) || 0,
      adhesion_fee: Number(form.adhesion_fee) || 0,
    };
    const res = editing
      ? await supabase.from("plans").update(payload).eq("id", editing.id)
      : await supabase.from("plans").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success(editing ? "Plano atualizado" : "Plano criado");
    setOpen(false); load();
  };

  const del = async (id: string) => {
    const { error } = await supabase.from("plans").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Plano excluído"); load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Planos</h1>
          <p className="text-muted-foreground">Estrutura de cobrança da plataforma</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo plano</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map(p => (
          <Card key={p.id} className="p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-lg">{p.name}</h3>
                {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
              </div>
              {p.active ? <Badge className="bg-emerald-500/15 text-emerald-600">Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}
            </div>
            <div className="space-y-1 pt-2 border-t text-sm">
              <Row k="Cobrança" v={p.billing_type === "fixed" ? "Mensalidade fixa" : "% sobre faturamento"} />
              <Row k="Mensalidade" v={fmtBRL(Number(p.monthly_price))} />
              <Row k="% Faturamento" v={`${Number(p.revenue_percent)}%`} />
              <Row k="Adesão" v={fmtBRL(Number(p.adhesion_fee))} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(p)}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir plano?</AlertDialogTitle>
                    <AlertDialogDescription>Barbearias com este plano ficarão sem plano vinculado.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => del(p.id)}>Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar plano" : "Novo plano"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea rows={2} value={form.description ?? ""} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo de cobrança</Label>
                <Select value={form.billing_type} onValueChange={(v: any) => setForm({ ...form, billing_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Mensalidade fixa</SelectItem>
                    <SelectItem value="percent">% Faturamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                <Label>Ativo</Label>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Mensalidade (R$)</Label><Input type="number" min={0} step={0.01} value={form.monthly_price} onChange={e => setForm({ ...form, monthly_price: Number(e.target.value) })} /></div>
              <div><Label>% Faturamento</Label><Input type="number" min={0} max={100} step={0.1} value={form.revenue_percent} onChange={e => setForm({ ...form, revenue_percent: Number(e.target.value) })} /></div>
              <div><Label>Adesão (R$)</Label><Input type="number" min={0} step={0.01} value={form.adhesion_fee} onChange={e => setForm({ ...form, adhesion_fee: Number(e.target.value) })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></div>
);
