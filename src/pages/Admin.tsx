import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Logo } from "@/components/Logo";
import {
  Shield, Users, Building2, LogOut, Plus, Pencil, Trash2,
  DollarSign, TrendingUp, Power, UserPlus,
} from "lucide-react";
import { toast } from "sonner";

type Plan = {
  id: string;
  name: string;
  description: string | null;
  billing_type: "fixed" | "percent";
  monthly_price: number;
  revenue_percent: number;
  adhesion_fee: number;
  active: boolean;
};

type Profile = {
  id: string;
  full_name: string | null;
  barbershop_name: string | null;
  plan_id: string | null;
  status: "active" | "suspended";
  created_at: string;
};

type AdminUser = { user_id: string; created_at: string };

const emptyPlan: Omit<Plan, "id"> = {
  name: "", description: "", billing_type: "fixed",
  monthly_price: 0, revenue_percent: 0, adhesion_fee: 0, active: true,
};

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const Admin = () => {
  const { signOut, user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    const [pRes, plRes, aRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("plans").select("*").order("monthly_price"),
      supabase.from("user_roles").select("user_id, created_at").eq("role", "admin"),
    ]);
    if (pRes.error) toast.error(pRes.error.message);
    if (plRes.error) toast.error(plRes.error.message);
    if (aRes.error) toast.error(aRes.error.message);
    setProfiles((pRes.data ?? []) as Profile[]);
    setPlans((plRes.data ?? []) as Plan[]);
    setAdmins((aRes.data ?? []) as AdminUser[]);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  // ---- Métricas ----
  const totalBarbearias = profiles.length;
  const ativas = profiles.filter(p => p.status === "active").length;
  const suspensas = profiles.filter(p => p.status === "suspended").length;
  const planMap = Object.fromEntries(plans.map(p => [p.id, p]));
  const mrr = profiles.reduce((sum, p) => {
    const pl = p.plan_id ? planMap[p.plan_id] : null;
    if (!pl || p.status !== "active") return sum;
    return sum + Number(pl.monthly_price);
  }, 0);
  const adesoesTotal = profiles.reduce((sum, p) => {
    const pl = p.plan_id ? planMap[p.plan_id] : null;
    return pl ? sum + Number(pl.adhesion_fee) : sum;
  }, 0);

  // ---- Plan CRUD ----
  const [planDialog, setPlanDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planForm, setPlanForm] = useState<Omit<Plan, "id">>(emptyPlan);

  const openNewPlan = () => {
    setEditingPlan(null);
    setPlanForm(emptyPlan);
    setPlanDialog(true);
  };
  const openEditPlan = (p: Plan) => {
    setEditingPlan(p);
    const { id, ...rest } = p;
    setPlanForm(rest);
    setPlanDialog(true);
  };
  const savePlan = async () => {
    if (!planForm.name.trim()) return toast.error("Nome obrigatório");
    const payload = {
      ...planForm,
      monthly_price: Number(planForm.monthly_price) || 0,
      revenue_percent: Number(planForm.revenue_percent) || 0,
      adhesion_fee: Number(planForm.adhesion_fee) || 0,
    };
    const res = editingPlan
      ? await supabase.from("plans").update(payload).eq("id", editingPlan.id)
      : await supabase.from("plans").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success(editingPlan ? "Plano atualizado" : "Plano criado");
    setPlanDialog(false);
    loadAll();
  };
  const deletePlan = async (id: string) => {
    const { error } = await supabase.from("plans").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Plano excluído");
    loadAll();
  };

  // ---- Profile actions ----
  const setProfilePlan = async (profileId: string, planId: string | null) => {
    const { error } = await supabase
      .from("profiles")
      .update({ plan_id: planId })
      .eq("id", profileId);
    if (error) return toast.error(error.message);
    toast.success("Plano atualizado");
    loadAll();
  };
  const toggleStatus = async (p: Profile) => {
    const next = p.status === "active" ? "suspended" : "active";
    const { error } = await supabase
      .from("profiles")
      .update({
        status: next,
        suspended_at: next === "suspended" ? new Date().toISOString() : null,
      })
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(next === "active" ? "Barbearia reativada" : "Barbearia suspensa");
    loadAll();
  };

  // ---- Admin promotion ----
  const [promoteEmail, setPromoteEmail] = useState("");
  const promoteAdmin = async () => {
    const email = promoteEmail.trim().toLowerCase();
    if (!email) return toast.error("Informe um e-mail");
    // find user by matching profiles via auth: profiles.id == user.id
    // we need user_id from auth.users; use a join via profiles is not enough (no email).
    // Workaround: ask user to first sign up, then we look them up via profiles where full_name? Not reliable.
    // Better: use supabase.auth admin via edge function. Simpler: search via user_roles+auth not available client-side.
    // For now: instruct user to provide the user_id (auth uuid).
    toast.error("Para promover, peça o usuário a se cadastrar e me passe o e-mail. Funcionalidade requer Edge Function — em breve.");
  };
  const revokeAdmin = async (userId: string) => {
    if (userId === user?.id) return toast.error("Você não pode remover a si mesmo");
    const { error } = await supabase.from("user_roles")
      .delete().eq("user_id", userId).eq("role", "admin");
    if (error) return toast.error(error.message);
    toast.success("Admin removido");
    loadAll();
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b bg-card">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Logo />
            <Badge variant="secondary" className="gap-1">
              <Shield className="h-3 w-3" /> Admin Master
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Painel Administrativo</h1>
          <p className="text-muted-foreground">Gestão global da plataforma Barber On</p>
        </div>

        {/* Métricas */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Building2 className="h-5 w-5 text-primary" /></div>
              <div><p className="text-xs text-muted-foreground">Barbearias</p><p className="text-2xl font-bold">{totalBarbearias}</p></div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10"><Power className="h-5 w-5 text-emerald-600" /></div>
              <div><p className="text-xs text-muted-foreground">Ativas</p><p className="text-2xl font-bold">{ativas}</p></div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10"><Power className="h-5 w-5 text-destructive" /></div>
              <div><p className="text-xs text-muted-foreground">Suspensas</p><p className="text-2xl font-bold">{suspensas}</p></div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10"><DollarSign className="h-5 w-5 text-accent" /></div>
              <div><p className="text-xs text-muted-foreground">MRR</p><p className="text-xl font-bold">{fmtBRL(mrr)}</p></div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div>
              <div><p className="text-xs text-muted-foreground">Adesões</p><p className="text-xl font-bold">{fmtBRL(adesoesTotal)}</p></div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="barbearias">
          <TabsList>
            <TabsTrigger value="barbearias">Barbearias</TabsTrigger>
            <TabsTrigger value="planos">Planos</TabsTrigger>
            <TabsTrigger value="admins">Administradores</TabsTrigger>
          </TabsList>

          {/* Barbearias */}
          <TabsContent value="barbearias">
            <Card className="overflow-hidden">
              <div className="p-4 border-b">
                <h2 className="font-semibold">Barbearias cadastradas</h2>
              </div>
              {loading ? (
                <div className="p-12 text-center text-muted-foreground">Carregando…</div>
              ) : profiles.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">Nenhuma barbearia cadastrada.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr className="text-left">
                        <th className="p-3 font-medium">Barbearia</th>
                        <th className="p-3 font-medium">Responsável</th>
                        <th className="p-3 font-medium">Plano</th>
                        <th className="p-3 font-medium">Status</th>
                        <th className="p-3 font-medium">Cadastro</th>
                        <th className="p-3 font-medium text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profiles.map(p => (
                        <tr key={p.id} className="border-t">
                          <td className="p-3 font-medium">{p.barbershop_name ?? "—"}</td>
                          <td className="p-3 text-muted-foreground">{p.full_name ?? "—"}</td>
                          <td className="p-3">
                            <Select
                              value={p.plan_id ?? "none"}
                              onValueChange={(v) => setProfilePlan(p.id, v === "none" ? null : v)}
                            >
                              <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Sem plano</SelectItem>
                                {plans.map(pl => (
                                  <SelectItem key={pl.id} value={pl.id}>{pl.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-3">
                            {p.status === "active"
                              ? <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20">Ativa</Badge>
                              : <Badge variant="destructive">Suspensa</Badge>}
                          </td>
                          <td className="p-3 text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pt-BR")}</td>
                          <td className="p-3 text-right">
                            <Button size="sm" variant={p.status === "active" ? "outline" : "default"} onClick={() => toggleStatus(p)}>
                              <Power className="h-3 w-3 mr-1" />
                              {p.status === "active" ? "Suspender" : "Reativar"}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Planos */}
          <TabsContent value="planos">
            <Card className="overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="font-semibold">Planos da plataforma</h2>
                <Button size="sm" onClick={openNewPlan}><Plus className="h-4 w-4 mr-1" /> Novo plano</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="p-3 font-medium">Nome</th>
                      <th className="p-3 font-medium">Cobrança</th>
                      <th className="p-3 font-medium">Mensalidade</th>
                      <th className="p-3 font-medium">% Faturamento</th>
                      <th className="p-3 font-medium">Adesão</th>
                      <th className="p-3 font-medium">Status</th>
                      <th className="p-3 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map(pl => (
                      <tr key={pl.id} className="border-t">
                        <td className="p-3">
                          <div className="font-medium">{pl.name}</div>
                          {pl.description && <div className="text-xs text-muted-foreground">{pl.description}</div>}
                        </td>
                        <td className="p-3"><Badge variant="outline">{pl.billing_type === "fixed" ? "Fixa" : "Percentual"}</Badge></td>
                        <td className="p-3">{fmtBRL(Number(pl.monthly_price))}</td>
                        <td className="p-3">{Number(pl.revenue_percent)}%</td>
                        <td className="p-3">{fmtBRL(Number(pl.adhesion_fee))}</td>
                        <td className="p-3">
                          {pl.active ? <Badge className="bg-emerald-500/15 text-emerald-700">Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}
                        </td>
                        <td className="p-3 text-right space-x-1">
                          <Button size="sm" variant="ghost" onClick={() => openEditPlan(pl)}><Pencil className="h-4 w-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir plano?</AlertdialogTitle>
                                <AlertDialogDescription>Barbearias com este plano ficarão sem plano.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deletePlan(pl.id)}>Excluir</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* Admins */}
          <TabsContent value="admins">
            <Card className="p-6 space-y-4">
              <div>
                <h2 className="font-semibold mb-1">Administradores</h2>
                <p className="text-sm text-muted-foreground">Total: {admins.length}</p>
              </div>
              <div className="rounded-lg border divide-y">
                {admins.map(a => (
                  <div key={a.user_id} className="flex items-center justify-between p-3">
                    <div>
                      <div className="font-mono text-xs">{a.user_id}</div>
                      <div className="text-xs text-muted-foreground">desde {new Date(a.created_at).toLocaleDateString("pt-BR")}</div>
                    </div>
                    {a.user_id !== user?.id ? (
                      <Button size="sm" variant="outline" className="text-destructive" onClick={() => revokeAdmin(a.user_id)}>
                        Revogar
                      </Button>
                    ) : <Badge>você</Badge>}
                  </div>
                ))}
              </div>
              <div className="p-4 rounded-lg bg-muted/40 text-sm space-y-2">
                <p className="font-medium flex items-center gap-2"><UserPlus className="h-4 w-4" /> Promover novo admin</p>
                <p className="text-muted-foreground text-xs">
                  Para promover um usuário, peça que ele se cadastre normalmente em <code>/auth</code> e me envie o e-mail no chat —
                  faço a promoção via banco. Promoção self-service por e-mail requer Edge Function (posso adicionar se quiser).
                </p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Plan dialog */}
      <Dialog open={planDialog} onOpenChange={setPlanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Editar plano" : "Novo plano"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input value={planForm.name} onChange={e => setPlanForm({ ...planForm, name: e.target.value })} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea rows={2} value={planForm.description ?? ""} onChange={e => setPlanForm({ ...planForm, description: e.target.value })} />
            </div>
            <div>
              <Label>Tipo de cobrança</Label>
              <Select value={planForm.billing_type} onValueChange={(v: "fixed" | "percent") => setPlanForm({ ...planForm, billing_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Mensalidade fixa</SelectItem>
                  <SelectItem value="percent">Percentual sobre faturamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Mensalidade (R$)</Label>
                <Input type="number" step="0.01" value={planForm.monthly_price}
                  onChange={e => setPlanForm({ ...planForm, monthly_price: Number(e.target.value) })} />
              </div>
              <div>
                <Label>% Faturamento</Label>
                <Input type="number" step="0.01" value={planForm.revenue_percent}
                  onChange={e => setPlanForm({ ...planForm, revenue_percent: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Adesão (R$)</Label>
                <Input type="number" step="0.01" value={planForm.adhesion_fee}
                  onChange={e => setPlanForm({ ...planForm, adhesion_fee: Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input id="active" type="checkbox" checked={planForm.active}
                onChange={e => setPlanForm({ ...planForm, active: e.target.checked })} />
              <Label htmlFor="active">Plano ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialog(false)}>Cancelar</Button>
            <Button onClick={savePlan}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
