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
import { MoreHorizontal, Eye, Power, LogIn, Search } from "lucide-react";
import { toast } from "sonner";
import { fmtBRL, STATUS_LABEL, ADHESION_LABEL } from "./lib";
import { logActivity } from "@/lib/audit";

type Profile = {
  id: string; full_name: string | null; barbershop_name: string | null;
  plan_id: string | null; status: string; adhesion_status: string;
  adhesion_paid_at: string | null; asaas_customer_id: string | null;
  created_at: string;
};
type Plan = { id: string; name: string; monthly_price: number; adhesion_fee: number };

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
    const [p, pl] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("plans").select("id,name,monthly_price,adhesion_fee"),
    ]);
    setProfiles((p.data ?? []) as Profile[]);
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
                <th className="p-3 font-medium">Responsável</th>
                <th className="p-3 font-medium">Plano</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Adesão</th>
                <th className="p-3 font-medium">Cadastro</th>
                <th className="p-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="p-12 text-center text-muted-foreground">Carregando…</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={7} className="p-12 text-center text-muted-foreground">Nenhuma barbearia encontrada.</td></tr>}
              {filtered.map(p => {
                const st = STATUS_LABEL[p.status] ?? STATUS_LABEL.pending;
                const ad = ADHESION_LABEL[p.adhesion_status] ?? ADHESION_LABEL.pending;
                return (
                  <tr key={p.id} className="border-t hover:bg-muted/20">
                    <td className="p-3 font-medium">{p.barbershop_name ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{p.full_name ?? "—"}</td>
                    <td className="p-3">
                      <Select value={p.plan_id ?? "none"} onValueChange={(v) => setPlan(p, v === "none" ? null : v)}>
                        <SelectTrigger className="h-8 w-[170px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem plano</SelectItem>
                          {plans.map(pl => <SelectItem key={pl.id} value={pl.id}>{pl.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3"><Badge variant="outline" className={st.cls}>{st.label}</Badge></td>
                    <td className="p-3"><Badge variant="outline" className={ad.cls}>{ad.label}</Badge></td>
                    <td className="p-3 text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pt-BR")}</td>
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
        <DialogContent>
          <DialogHeader><DialogTitle>{detail?.barbershop_name ?? "Detalhes"}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-2 text-sm">
              <Row k="ID" v={detail.id} />
              <Row k="Responsável" v={detail.full_name ?? "—"} />
              <Row k="Status" v={STATUS_LABEL[detail.status]?.label ?? detail.status} />
              <Row k="Adesão" v={ADHESION_LABEL[detail.adhesion_status]?.label ?? detail.adhesion_status} />
              <Row k="Adesão paga em" v={detail.adhesion_paid_at ? new Date(detail.adhesion_paid_at).toLocaleString("pt-BR") : "—"} />
              <Row k="Plano" v={detail.plan_id ? planMap[detail.plan_id]?.name ?? "?" : "Sem plano"} />
              {detail.plan_id && planMap[detail.plan_id] && (
                <>
                  <Row k="Mensalidade" v={fmtBRL(Number(planMap[detail.plan_id].monthly_price))} />
                  <Row k="Adesão" v={fmtBRL(Number(planMap[detail.plan_id].adhesion_fee))} />
                </>
              )}
              <Row k="Asaas customer" v={detail.asaas_customer_id ?? "—"} />
              <Row k="Cadastro" v={new Date(detail.created_at).toLocaleString("pt-BR")} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex justify-between gap-4 py-1 border-b border-border/40 last:border-0">
    <span className="text-muted-foreground">{k}</span>
    <span className="font-medium text-right break-all">{v}</span>
  </div>
);
