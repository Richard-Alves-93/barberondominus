import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { fmtBRL } from "./lib";

type Profile = { id: string; barbershop_name: string | null; status: string; plan_id: string | null; billing_mode: string | null };
type Plan = { id: string; name: string; monthly_price: number; revenue_percent: number; adhesion_link: string | null; monthly_link: string | null };
type Sale = { owner_id: string; total: number; created_at: string };
type Invoice = { id: string; owner_id: string; type: string; amount: number; status: string; billing_type: string | null; created_at: string; manual: boolean; invoice_url: string | null };

export default function AdminFaturamento() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [period, setPeriod] = useState("30");
  const [filter, setFilter] = useState<"all" | "fixed" | "percent">("all");

  const load = async () => {
    const since = new Date(Date.now() - Number(period) * 24 * 3600 * 1000).toISOString();
    const [p, pl, s, inv] = await Promise.all([
      supabase.from("profiles").select("id,barbershop_name,status,plan_id,billing_mode"),
      supabase.from("plans").select("id,name,monthly_price,revenue_percent,adhesion_link,monthly_link"),
      supabase.from("sales").select("owner_id,total,created_at").gte("created_at", since).eq("status", "paid"),
      supabase.from("invoices").select("id,owner_id,type,amount,status,billing_type,created_at,manual,invoice_url").gte("created_at", since).order("created_at", { ascending: false }),
    ]);
    setProfiles((p.data ?? []) as Profile[]);
    setPlans((pl.data ?? []) as Plan[]);
    setSales((s.data ?? []) as Sale[]);
    setInvoices((inv.data ?? []) as Invoice[]);
  };
  useEffect(() => { load(); }, [period]);

  const planMap = useMemo(() => Object.fromEntries(plans.map(p => [p.id, p])), [plans]);

  const rows = profiles
    .filter(p => filter === "all" || (p.billing_mode ?? "fixed") === filter)
    .map(p => {
      const pl = p.plan_id ? planMap[p.plan_id] : null;
      const faturamento = sales.filter(s => s.owner_id === p.id).reduce((sum, s) => sum + Number(s.total || 0), 0);
      const mode = (p.billing_mode ?? "fixed") as "fixed" | "percent";
      const cobranca = pl ? (mode === "percent" ? faturamento * (Number(pl.revenue_percent) / 100) : Number(pl.monthly_price)) : 0;
      return { ...p, plan: pl, faturamento, mode, cobranca };
    })
    .sort((a, b) => b.cobranca - a.cobranca);

  const totalFaturamento = rows.reduce((s, r) => s + r.faturamento, 0);
  const totalCobranca = rows.reduce((s, r) => s + r.cobranca, 0);
  const fixedCount = profiles.filter(p => (p.billing_mode ?? "fixed") === "fixed").length;
  const percentCount = profiles.filter(p => p.billing_mode === "percent").length;

  const pendingInvoices = invoices.filter(i => i.status === "pending" || i.status === "overdue");
  const paidInvoices = invoices.filter(i => i.status === "paid");

  const activate = async (invoice_id: string) => {
    const { data, error } = await supabase.functions.invoke("asaas-mark-paid", { body: { invoice_id } });
    if (error || data?.error) return toast.error((data?.error || error?.message) ?? "Falha");
    toast.success("Fatura marcada como paga"); load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
          <p className="text-muted-foreground">Cobrança, modalidade e status dos pagamentos das barbearias</p>
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas modalidades</SelectItem>
              <SelectItem value="fixed">Apenas Fixo</SelectItem>
              <SelectItem value="percent">Apenas Percentual</SelectItem>
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="p-5"><p className="text-xs text-muted-foreground">Faturamento das barbearias</p><p className="text-2xl font-bold">{fmtBRL(totalFaturamento)}</p><p className="text-xs text-muted-foreground mt-1">A plataforma NÃO retém</p></Card>
        <Card className="p-5"><p className="text-xs text-muted-foreground">Cobrança devida</p><p className="text-2xl font-bold text-amber-500">{fmtBRL(totalCobranca)}</p></Card>
        <Card className="p-5"><p className="text-xs text-muted-foreground">Modalidade Fixa</p><p className="text-2xl font-bold">{fixedCount}</p></Card>
        <Card className="p-5"><p className="text-xs text-muted-foreground">Modalidade Percentual</p><p className="text-2xl font-bold">{percentCount}</p></Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b"><h2 className="font-semibold">Detalhamento por barbearia</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3 font-medium">Barbearia</th>
                <th className="p-3 font-medium">Plano</th>
                <th className="p-3 font-medium">Modalidade</th>
                <th className="p-3 font-medium">Faturamento</th>
                <th className="p-3 font-medium">Cobrança devida</th>
                <th className="p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 font-medium">{r.barbershop_name ?? "—"}</td>
                  <td className="p-3">{r.plan?.name ?? <Badge variant="outline">Sem plano</Badge>}</td>
                  <td className="p-3">
                    {r.mode === "percent"
                      ? <Badge className="bg-blue-500/15 text-blue-700">Percentual {r.plan?.revenue_percent ?? 0}%</Badge>
                      : <Badge variant="secondary">Fixo</Badge>}
                  </td>
                  <td className="p-3">{fmtBRL(r.faturamento)}</td>
                  <td className="p-3 font-bold text-amber-500">{fmtBRL(r.cobranca)}</td>
                  <td className="p-3 capitalize text-xs">{r.status}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhuma barbearia para o filtro atual</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="p-4 border-b"><h2 className="font-semibold">Faturas em aberto</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3 font-medium">Barbearia</th>
                <th className="p-3 font-medium">Tipo</th>
                <th className="p-3 font-medium">Valor</th>
                <th className="p-3 font-medium">Forma</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pendingInvoices.map(i => {
                const owner = profiles.find(p => p.id === i.owner_id);
                return (
                  <tr key={i.id} className="border-t">
                    <td className="p-3">{owner?.barbershop_name ?? "—"}</td>
                    <td className="p-3">{i.type === "adhesion" ? "Adesão" : "Mensalidade"}</td>
                    <td className="p-3 font-medium">{fmtBRL(Number(i.amount))}</td>
                    <td className="p-3"><Badge variant="outline">{i.billing_type ?? "—"}</Badge></td>
                    <td className="p-3"><Badge variant="outline" className={i.status === "overdue" ? "bg-red-500/15 text-red-700 border-red-500/30" : "bg-amber-500/15 text-amber-700 border-amber-500/30"}>{i.status}</Badge></td>
                    <td className="p-3">
                      <div className="flex gap-1 justify-end">
                        {i.invoice_url && (
                          <Button size="sm" variant="ghost" asChild><a href={i.invoice_url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a></Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline"><CheckCircle2 className="h-4 w-4 mr-1" /> Ativar manualmente</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Marcar como paga?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Use quando o pagamento foi confirmado fora do Asaas (ex.: link externo, transferência).
                                A barbearia será ativada imediatamente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => activate(i.id)}>Confirmar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {pendingInvoices.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhuma fatura em aberto</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="p-4 border-b"><h2 className="font-semibold">Histórico de pagamentos confirmados</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3 font-medium">Barbearia</th>
                <th className="p-3 font-medium">Tipo</th>
                <th className="p-3 font-medium">Valor</th>
                <th className="p-3 font-medium">Forma</th>
                <th className="p-3 font-medium">Origem</th>
              </tr>
            </thead>
            <tbody>
              {paidInvoices.map(i => {
                const owner = profiles.find(p => p.id === i.owner_id);
                return (
                  <tr key={i.id} className="border-t">
                    <td className="p-3">{owner?.barbershop_name ?? "—"}</td>
                    <td className="p-3">{i.type === "adhesion" ? "Adesão" : "Mensalidade"}</td>
                    <td className="p-3 font-medium">{fmtBRL(Number(i.amount))}</td>
                    <td className="p-3"><Badge variant="outline">{i.billing_type ?? "—"}</Badge></td>
                    <td className="p-3 text-xs">{i.manual ? <Badge variant="secondary">Manual</Badge> : <Badge variant="outline">Asaas</Badge>}</td>
                  </tr>
                );
              })}
              {paidInvoices.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Sem pagamentos no período</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
