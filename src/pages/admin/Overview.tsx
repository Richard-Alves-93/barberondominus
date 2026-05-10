import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import {
  Building2, Power, DollarSign, TrendingUp, TrendingDown,
  CreditCard, AlertCircle,
} from "lucide-react";
import { fmtBRL, fmtPct } from "./lib";

type Profile = {
  id: string; status: string; plan_id: string | null;
  adhesion_status: string; created_at: string; churned_at: string | null;
};
type Plan = { id: string; monthly_price: number; revenue_percent: number; adhesion_fee: number };

export default function AdminOverview() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [revenueLast30, setRevenueLast30] = useState(0);

  useEffect(() => {
    (async () => {
      const [pRes, plRes, sRes] = await Promise.all([
        supabase.from("profiles").select("id,status,plan_id,adhesion_status,created_at,churned_at"),
        supabase.from("plans").select("id,monthly_price,revenue_percent,adhesion_fee"),
        supabase.from("sales").select("total,created_at")
          .gte("created_at", new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString())
          .eq("status", "paid"),
      ]);
      setProfiles((pRes.data ?? []) as Profile[]);
      setPlans((plRes.data ?? []) as Plan[]);
      setRevenueLast30((sRes.data ?? []).reduce((s, r: any) => s + Number(r.total || 0), 0));
    })();
  }, []);

  const planMap = Object.fromEntries(plans.map(p => [p.id, p]));
  const total = profiles.length;
  const ativas = profiles.filter(p => p.status === "active").length;
  const pendentes = profiles.filter(p => p.status === "pending").length;
  const inadimplentes = profiles.filter(p => p.status === "overdue").length;
  const churned = profiles.filter(p => p.status === "churned").length;

  const mrr = profiles.reduce((s, p) => {
    const pl = p.plan_id ? planMap[p.plan_id] : null;
    if (!pl || p.status !== "active") return s;
    return s + Number(pl.monthly_price);
  }, 0);
  const adesoesPagas = profiles.reduce((s, p) => {
    if (p.adhesion_status !== "paid") return s;
    const pl = p.plan_id ? planMap[p.plan_id] : null;
    return s + (pl ? Number(pl.adhesion_fee) : 0);
  }, 0);
  const percentRevenue = profiles.reduce((s, p) => {
    const pl = p.plan_id ? planMap[p.plan_id] : null;
    if (!pl || p.status !== "active") return s;
    // estimativa: % sobre faturamento total da plataforma rateado por barbearia ativa
    return s + (revenueLast30 / Math.max(ativas, 1)) * (Number(pl.revenue_percent) / 100);
  }, 0);
  const churnRate = total > 0 ? (churned / total) * 100 : 0;
  const totalFaturamentoPlat = mrr + adesoesPagas + percentRevenue;

  const cards = [
    { label: "Faturamento total", value: fmtBRL(totalFaturamentoPlat), sub: "Adesões + MRR + %", icon: DollarSign, tone: "amber" },
    { label: "MRR (Mensalidades)", value: fmtBRL(mrr), sub: `${ativas} ativas`, icon: TrendingUp, tone: "emerald" },
    { label: "Adesões pagas", value: fmtBRL(adesoesPagas), sub: "Acumulado", icon: CreditCard, tone: "blue" },
    { label: "% sobre vendas (est.)", value: fmtBRL(percentRevenue), sub: "Últimos 30 dias", icon: TrendingUp, tone: "violet" },
    { label: "Barbearias ativas", value: String(ativas), sub: `${total} total`, icon: Building2, tone: "emerald" },
    { label: "Pendentes", value: String(pendentes), sub: "Aguardando ativação", icon: AlertCircle, tone: "amber" },
    { label: "Inadimplentes", value: String(inadimplentes), sub: "Cobrança vencida", icon: Power, tone: "orange" },
    { label: "Churn", value: fmtPct(churnRate), sub: `${churned} canceladas`, icon: TrendingDown, tone: "red" },
  ];

  const toneCls: Record<string, string> = {
    amber: "bg-amber-500/15 text-amber-500",
    emerald: "bg-emerald-500/15 text-emerald-600",
    blue: "bg-blue-500/15 text-blue-600",
    violet: "bg-violet-500/15 text-violet-600",
    orange: "bg-orange-500/15 text-orange-600",
    red: "bg-red-500/15 text-red-600",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Visão Geral</h1>
        <p className="text-muted-foreground">Saúde financeira e operacional da plataforma</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(c => (
          <Card key={c.label} className="p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-lg ${toneCls[c.tone]}`}>
                <c.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-2xl font-bold truncate">{c.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{c.sub}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Card className="p-5">
        <h2 className="font-semibold mb-2">Regra de cobrança</h2>
        <p className="text-sm text-muted-foreground">
          A plataforma cobra apenas a <strong>taxa de adesão</strong> e a <strong>mensalidade fixa</strong> ou <strong>percentual sobre o faturamento</strong>,
          de acordo com o plano contratado pela barbearia. Os valores dos serviços realizados pelas barbearias <strong>não são retidos</strong> —
          permanecem integralmente com a barbearia. Cobranças são geradas no Asaas.
        </p>
      </Card>
    </div>
  );
}
