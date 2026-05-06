import { useEffect, useMemo, useState } from "react";
import { BarChart3, TrendingUp, TrendingDown } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

type Service = { id: string; name: string; category: string | null; cost: number; price: number };
type Sale = { id: string; items: any; total: number; created_at: string };

type ServiceStat = {
  id: string; name: string; category: string;
  qty: number; revenue: number; cost: number; profit: number; margin: number;
};

export default function Relatorios() {
  const [services, setServices] = useState<Service[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  useEffect(() => {
    (async () => {
      const [s, v] = await Promise.all([
        supabase.from("services").select("id,name,category,cost,price"),
        supabase.from("sales").select("id,items,total,created_at").eq("status", "paid"),
      ]);
      if (s.data) setServices(s.data as any);
      if (v.data) setSales(v.data as any);
    })();
  }, []);

  const serviceStats: ServiceStat[] = useMemo(() => {
    const byName = new Map<string, ServiceStat>();
    for (const sv of services) {
      byName.set(sv.name.toLowerCase(), {
        id: sv.id, name: sv.name, category: sv.category || "Sem categoria",
        qty: 0, revenue: 0, cost: 0, profit: 0, margin: 0,
      });
    }
    for (const sale of sales) {
      const items = Array.isArray(sale.items) ? sale.items : [];
      for (const it of items) {
        const key = String(it.description || "").toLowerCase();
        const stat = byName.get(key);
        if (!stat) continue;
        const sv = services.find((x) => x.id === stat.id)!;
        const qty = Number(it.qty) || 0;
        const price = Number(it.price) || 0;
        stat.qty += qty;
        stat.revenue += qty * price;
        stat.cost += qty * Number(sv.cost);
      }
    }
    const arr = Array.from(byName.values()).map((s) => {
      s.profit = s.revenue - s.cost;
      s.margin = s.revenue > 0 ? (s.profit / s.revenue) * 100 : 0;
      return s;
    });
    return arr.sort((a, b) => b.profit - a.profit);
  }, [services, sales]);

  const categoryStats = useMemo(() => {
    const m = new Map<string, { category: string; qty: number; revenue: number; cost: number; profit: number; margin: number }>();
    for (const s of serviceStats) {
      const c = m.get(s.category) ?? { category: s.category, qty: 0, revenue: 0, cost: 0, profit: 0, margin: 0 };
      c.qty += s.qty; c.revenue += s.revenue; c.cost += s.cost;
      m.set(s.category, c);
    }
    return Array.from(m.values()).map((c) => ({
      ...c, profit: c.revenue - c.cost,
      margin: c.revenue > 0 ? ((c.revenue - c.cost) / c.revenue) * 100 : 0,
    })).sort((a, b) => b.profit - a.profit);
  }, [serviceStats]);

  const totals = useMemo(() => {
    const revenue = serviceStats.reduce((a, s) => a + s.revenue, 0);
    const cost = serviceStats.reduce((a, s) => a + s.cost, 0);
    return { revenue, cost, profit: revenue - cost, margin: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0 };
  }, [serviceStats]);

  return (
    <div className="flex-1 flex flex-col">
      <header className="h-16 border-b bg-card flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40">
        <div className="flex items-center gap-3"><SidebarTrigger /><h1 className="font-display font-bold text-xl">Relatórios</h1></div>
      </header>

      <main className="flex-1 p-4 lg:p-6 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Receita</p>
            <p className="font-display text-2xl font-bold">R$ {totals.revenue.toFixed(2)}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Custo</p>
            <p className="font-display text-2xl font-bold">R$ {totals.cost.toFixed(2)}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Lucro</p>
            <p className={`font-display text-2xl font-bold ${totals.profit >= 0 ? "text-green-600" : "text-destructive"}`}>
              R$ {totals.profit.toFixed(2)}
            </p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Margem</p>
            <p className="font-display text-2xl font-bold">{totals.margin.toFixed(1)}%</p>
          </Card>
        </div>

        <Tabs defaultValue="services">
          <TabsList>
            <TabsTrigger value="services">Por serviço</TabsTrigger>
            <TabsTrigger value="categories">Por categoria</TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="mt-3">
            {!serviceStats.length ? (
              <Card className="p-10 text-center">
                <BarChart3 className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">Sem dados de vendas ainda.</p>
              </Card>
            ) : (
              <Card className="divide-y">
                {serviceStats.map((s) => (
                  <Row key={s.id}
                    title={s.name} subtitle={s.category}
                    qty={s.qty} revenue={s.revenue} cost={s.cost} profit={s.profit} margin={s.margin} />
                ))}
              </Card>
            )}
          </TabsContent>

          <TabsContent value="categories" className="mt-3">
            {!categoryStats.length ? (
              <Card className="p-10 text-center text-muted-foreground">Sem dados.</Card>
            ) : (
              <Card className="divide-y">
                {categoryStats.map((c) => (
                  <Row key={c.category}
                    title={c.category} qty={c.qty}
                    revenue={c.revenue} cost={c.cost} profit={c.profit} margin={c.margin} />
                ))}
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Row({ title, subtitle, qty, revenue, cost, profit, margin }: any) {
  return (
    <div className="p-4 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        <p className="text-xs text-muted-foreground mt-1">
          {qty} venda(s) • Receita R$ {revenue.toFixed(2)} • Custo R$ {cost.toFixed(2)}
        </p>
      </div>
      <div className="text-right">
        <p className={`font-display font-bold ${profit >= 0 ? "text-green-600" : "text-destructive"}`}>
          R$ {profit.toFixed(2)}
        </p>
        <Badge variant={margin >= 50 ? "default" : margin >= 20 ? "secondary" : "outline"} className="gap-1">
          {margin >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {margin.toFixed(1)}%
        </Badge>
      </div>
    </div>
  );
}
