import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { MoreHorizontal, Eye, Power, LogIn, Search } from "lucide-react";
import { toast } from "sonner";
import { fmtBRL, STATUS_LABEL, ADHESION_LABEL } from "./lib";
import { logActivity } from "@/lib/audit";

type Profile = {
  id: string; 
  full_name: string | null; 
  barbershop_name: string | null;
  plan_id: string | null; 
  status: string; 
  adhesion_status: string;
  adhesion_paid_at: string | null; 
  asaas_customer_id: string | null;
  created_at: string;
  cnpj?: string | null;
  billing_mode?: string | null;
  adhesion_date?: string | null;
  qtd_barbeiros: number;
  total_usuarios: number;
};
type Plan = { 
  id: string; 
  name: string; 
  monthly_price: number; 
  adhesion_fee: number;
  barber_limit: number;
};

type Employee = {
  id: string;
  name: string;
  position: string;
  service_commission_percent: number;
  active: boolean;
};

type Invoice = {
  id: string;
  type: string;
  amount: number;
  status: string;
  created_at: string;
};

export default function AdminTenants() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [detail, setDetail] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [p, pl, emp] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("plans").select("*"),
      supabase.from("employees").select("owner_id, position"),
    ]);

    const counts: Record<string, { barbers: number; total: number }> = {};
    (emp.data ?? []).forEach(e => {
      if (!counts[e.owner_id]) counts[e.owner_id] = { barbers: 0, total: 0 };
      counts[e.owner_id].total++;
      if (e.position === 'barbeiro') counts[e.owner_id].barbers++;
    });

    setProfiles((p.data ?? []).map(profile => ({
      ...profile,
      qtd_barbeiros: counts[profile.id]?.barbers ?? 0,
      total_usuarios: counts[profile.id]?.total ?? 0
    })) as Profile[]);

    setPlans((pl.data ?? []) as Plan[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const planMap = useMemo(() => Object.fromEntries(plans.map(p => [p.id, p])), [plans]);

  const filtered = profiles.filter(p => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (planFilter !== "all" && p.plan_id !== planFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (p.barbershop_name ?? "").toLowerCase().includes(q)
      || (p.full_name ?? "").toLowerCase().includes(q);
  });

  const updateStatus = async (p: Profile, status: string) => {
    const update: any = { status };
    if (status === "suspended") update.suspended_at = new Date().toISOString();
    if (status === "churned") update.churned_at = new Date().toISOString();
    if (status === "active") { update.suspended_at = null; update.churned_at = null; }
    const { error } = await supabase.from("profiles").update(update).eq("id", p.id);
    if (error) return toast.error(error.message);
    await logActivity({ owner_id: p.id, action: `status:${status}`, entity: "profile", entity_id: p.id });
    toast.success("Status atualizado");
    load();
  };

  const setPlan = async (p: Profile, planId: string | null) => {
    const { error } = await supabase.from("profiles").update({ plan_id: planId }).eq("id", p.id);
    if (error) return toast.error(error.message);
    await logActivity({ owner_id: p.id, action: "plan:change", entity: "profile", entity_id: p.id, metadata: { plan_id: planId } });
    toast.success("Plano atualizado");
    load();
  };

  const impersonate = async (p: Profile) => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-impersonate", {
        body: { user_id: p.id },
      });
      if (error) throw error;
      if (data?.action_link) {
        await logActivity({ owner_id: p.id, action: "impersonate", entity: "profile", entity_id: p.id });
        window.open(data.action_link, "_blank");
      } else {
        toast.error("Link não retornado");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao gerar acesso");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Barbearias</h1>
          <p className="text-muted-foreground">Tenants cadastrados na plataforma</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 w-[220px]" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos planos</SelectItem>
              {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3 font-medium">Barbearia</th>
                <th className="p-3 font-medium">Plano</th>
                <th className="p-3 font-medium text-center">Qtd. Barbeiros</th>
                <th className="p-3 font-medium text-center">Total Usuários</th>
                <th className="p-3 font-medium text-center">Status</th>
                <th className="p-3 font-medium text-center">Adesão</th>
                <th className="p-3 font-medium">Cadastro</th>
                <th className="p-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={9} className="p-12 text-center text-muted-foreground">Carregando…</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={9} className="p-12 text-center text-muted-foreground">Nenhuma barbearia encontrada.</td></tr>}
              {filtered.map(p => {
                const st = STATUS_LABEL[p.status] ?? STATUS_LABEL.pending;
                const ad = ADHESION_LABEL[p.adhesion_status] ?? ADHESION_LABEL.pending;
                const plan = p.plan_id ? planMap[p.plan_id] : null;
                const limitExceeded = plan && p.qtd_barbeiros > (plan.barber_limit || 999);
                return (
                  <tr key={p.id} className="border-t hover:bg-muted/20">
                    <td className="p-3 font-medium">{p.barbershop_name ?? "—"}</td>
                    <td className="p-3">
                      <Select value={p.plan_id ?? "none"} onValueChange={(v) => setPlan(p, v === "none" ? null : v)}>
                        <SelectTrigger className="h-8 w-[170px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem plano</SelectItem>
                          {plans.map(pl => <SelectItem key={pl.id} value={pl.id}>{pl.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3 text-center">
                      <span className={limitExceeded ? "text-red-500 font-bold" : ""}>
                        {p.qtd_barbeiros}
                      </span>
                      {plan && <span className="text-xs text-muted-foreground ml-1">/ {plan.barber_limit}</span>}
                    </td>
                    <td className="p-3 text-center">{p.total_usuarios}</td>
                    <td className="p-3 text-center"><Badge variant="outline" className={st.cls}>{st.label}</Badge></td>
                    <td className="p-3 text-center"><Badge variant="outline" className={ad.cls}>{ad.label}</Badge></td>
                    <td className="p-3 text-muted-foreground whitespace-nowrap">{new Date(p.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="p-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem onClick={() => setDetail(p)}><Eye className="h-4 w-4 mr-2" /> Ver detalhes</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => impersonate(p)}><LogIn className="h-4 w-4 mr-2" /> Login como usuário</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {p.status !== "active" && <DropdownMenuItem onClick={() => updateStatus(p, "active")}>Ativar</DropdownMenuItem>}
                          {p.status !== "overdue" && <DropdownMenuItem onClick={() => updateStatus(p, "overdue")}>Marcar inadimplente</DropdownMenuItem>}
                          {p.status !== "suspended" && <DropdownMenuItem className="text-destructive" onClick={() => updateStatus(p, "suspended")}><Power className="h-4 w-4 mr-2" /> Suspender acesso</DropdownMenuItem>}
                          {p.status !== "churned" && <DropdownMenuItem className="text-destructive" onClick={() => updateStatus(p, "churned")}>Cancelar (churn)</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail?.barbershop_name ?? "Detalhes da Barbearia"}</DialogTitle>
          </DialogHeader>
          {detail && <DetailContent profile={detail} plan={detail.plan_id ? planMap[detail.plan_id] : null} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailContent({ profile, plan }: { profile: Profile; plan: Plan | null }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      const [emp, inv] = await Promise.all([
        supabase.from("employees").select("id, name, position, service_commission_percent, active").eq("owner_id", profile.id).order("name"),
        supabase.from("invoices").select("id, type, amount, status, created_at").eq("owner_id", profile.id).order("created_at", { ascending: false }),
      ]);
      setEmployees((emp.data ?? []) as Employee[]);
      setInvoices((inv.data ?? []) as Invoice[]);
      setLoading(false);
    };
    fetchDetails();
  }, [profile.id]);

  return (
    <Tabs defaultValue="empresa" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="empresa">Dados da Empresa</TabsTrigger>
        <TabsTrigger value="equipe">Equipe ({employees.length})</TabsTrigger>
        <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
      </TabsList>

      <TabsContent value="empresa" className="space-y-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Row k="Nome Fantasia" v={profile.barbershop_name ?? "—"} />
            <Row k="Responsável" v={profile.full_name ?? "—"} />
            <Row k="CNPJ/CPF" v={profile.cnpj ?? "—"} />
            <Row k="Data de Adesão" v={profile.adhesion_date ? new Date(profile.adhesion_date).toLocaleDateString("pt-BR") : "—"} />
          </div>
          <div className="space-y-2">
            <Row k="Plano" v={plan?.name ?? "Sem plano"} />
            <Row k="Modalidade" v={profile.billing_mode === "percent" ? "Percentual" : "Fixo"} />
            <Row k="Status" v={STATUS_LABEL[profile.status]?.label ?? profile.status} />
            <Row k="Asaas ID" v={profile.asaas_customer_id ?? "—"} />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="equipe" className="py-4">
        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Carregando equipe...</p>
        ) : (
          <div className="border rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="p-2 font-medium">Nome</th>
                  <th className="p-2 font-medium">Cargo</th>
                  <th className="p-2 font-medium text-right">Comissão %</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(e => (
                  <tr key={e.id} className="border-t">
                    <td className="p-2">{e.name}</td>
                    <td className="p-2">
                      <Badge variant="outline" className={
                        e.position === 'gerente' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                        e.position === 'barbeiro' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                        'bg-gray-500/10 text-gray-600 border-gray-500/20'
                      }>
                        {e.position.charAt(0).toUpperCase() + e.position.slice(1)}
                      </Badge>
                    </td>
                    <td className="p-2 text-right">
                      {e.position === 'barbeiro' ? `${e.service_commission_percent}%` : "—"}
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">Nenhum colaborador cadastrado</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="financeiro" className="py-4">
        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Carregando financeiro...</p>
        ) : (
          <div className="space-y-4">
            <div className="border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="p-2 font-medium">Data</th>
                    <th className="p-2 font-medium">Tipo</th>
                    <th className="p-2 font-medium">Valor</th>
                    <th className="p-2 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(i => (
                    <tr key={i.id} className="border-t">
                      <td className="p-2">{new Date(i.created_at).toLocaleDateString("pt-BR")}</td>
                      <td className="p-2">{i.type === 'adhesion' ? 'Adesão' : 'Mensalidade'}</td>
                      <td className="p-2">{fmtBRL(i.amount)}</td>
                      <td className="p-2 text-right">
                        <Badge variant="outline" className={
                          i.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600' :
                          i.status === 'overdue' ? 'bg-red-500/10 text-red-600' :
                          'bg-amber-500/10 text-amber-600'
                        }>
                          {i.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">Nenhuma fatura encontrada</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex justify-between gap-4 py-1 border-b border-border/40 last:border-0">
    <span className="text-muted-foreground">{k}</span>
    <span className="font-medium text-right break-all">{v}</span>
  </div>
);
