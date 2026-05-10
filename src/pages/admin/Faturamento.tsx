import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { fmtBRL } from "./lib";

type Profile = { id: string; barbershop_name: string | null; status: string; plan_id: string | null };
type Plan = { id: string; name: string; billing_type: string; monthly_price: number; revenue_percent: number };
type Sale = { owner_id: string; total: number; created_at: string };

export default function AdminFaturamento() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [period, setPeriod] = useState("30");

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - Number(period) * 24 * 3600 * 1000).toISOString();
      const [p, pl, s] = await Promise.all([
        supabase.from("profiles").select("id,barbershop_name,status,plan_id"),
        supabase.from("plans").select("id,name,billing_type,monthly_price,revenue_percent"),
        supabase.from("sales").select("owner_id,total,created_at").gte("created_at", since).eq("status", "paid"),
      ]);
      setProfiles((p.data ?? []) as Profile[]);
      setPlans((pl.data ?? []) as Plan[]);
      setSales((s.data ?? []) as Sale[]);
    })();
  }, [period]);

  const planMap = useMemo(() => Object.fromEntries(plans.map(p => [p.id, p])), [plans]);

  const rows = profiles.map(p => {
    const pl = p.plan_id ? planMap[p.plan_id] : null;
    const faturamento = sales.filter(s => s.owner_id === p.id).reduce((sum, s) => sum + Number(s.total || 0), 0);
    const cobrancaFixa = pl ? Number(pl.monthly_price) : 0;
    const cobrancaPct = pl ? faturamento * (Number(pl.revenue_percent) / 100) : 0;
    const cobrancaAsaas = pl?.billing_type === "percent" ? cobrancaPct : cobrancaFixa;
    return {
      ...p, plan: pl, faturamento, cobrancaFixa, cobrancaPct, cobrancaAsaas,
    };
  }).sort((a, b) => b.cobrancaAsaas - a.cobrancaAsaas);

  const totalFaturamento = rows.reduce((s, r) => s + r.faturamento, 0);
  const totalCobranca = rows.reduce((s, r) => s + r.cobrancaAsaas, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Faturamento por tenant</h1>
          <p className="text-muted-foreground">Cobrança Asaas calculada com base no plano e faturamento do período</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5"><p className="text-xs text-muted-foreground">Faturamento agregado das barbearias</p><p className="text-3xl font-bold">{fmtBRL(totalFaturamento)}</p><p className="text-xs text-muted-foreground mt-1">A plataforma NÃO retém esses valores</p></Card>
        <Card className="p-5"><p className="text-xs text-muted-foreground">Cobrança total a gerar no Asaas</p><p className="text-3xl font-bold text-amber-500">{fmtBRL(totalCobranca)}</p><p className="text-xs text-muted-foreground mt-1">Soma das mensalidades / % do período</p></Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b"><h2 className="font-semibold">Detalhamento</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3 font-medium">Barbearia</th>
                <th className="p-3 font-medium">Plano</th>
                <th className="p-3 font-medium">Faturamento</th>
                <th className="p-3 font-medium">Mensalidade</th>
                <th className="p-3 font-medium">% Calculado</th>
                <th className="p-3 font-medium">Cobrança Asaas</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 font-medium">{r.barbershop_name ?? "—"}</td>
                  <td className="p-3">{r.plan?.name ?? <Badge variant="outline">Sem plano</Badge>}</td>
                  <td className="p-3">{fmtBRL(r.faturamento)}</td>
                  <td className="p-3 text-muted-foreground">{fmtBRL(r.cobrancaFixa)}</td>
                  <td className="p-3 text-muted-foreground">{fmtBRL(r.cobrancaPct)}</td>
                  <td className="p-3 font-bold text-amber-500">{fmtBRL(r.cobrancaAsaas)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
