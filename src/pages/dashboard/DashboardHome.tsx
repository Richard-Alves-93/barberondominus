import { SidebarTrigger } from "@/components/ui/sidebar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Wallet, Package, Calendar, Bell, Store, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from "recharts";
import { useAuth } from "@/contexts/AuthContext";

const chartData = [
  { d: "Seg", v: 2100 }, { d: "Ter", v: 2400 }, { d: "Qua", v: 1900 },
  { d: "Qui", v: 3000 }, { d: "Sex", v: 4500 }, { d: "Sáb", v: 4800 }, { d: "Dom", v: 3200 },
];

const agenda = [
  { time: "09:00", name: "André Martins", barber: "Felipe", status: "Confirmado" },
  { time: "10:00", name: "Carlos Eduardo", barber: "Rafael", status: "Em andamento" },
  { time: "11:00", name: "Bruno Souza", barber: "Felipe", status: "Concluído" },
  { time: "14:00", name: "João Pedro", barber: "Lucas", status: "Confirmado" },
  { time: "15:00", name: "Marcelo Oliveira", barber: "Rafael", status: "Confirmado" },
  { time: "16:00", name: "Rafael Lima", barber: "Lucas", status: "Confirmado" },
];

const Kpi = ({ icon: Icon, label, value, delta, color }: any) => (
  <Card className="p-5 hover:shadow-md transition">
    <div className="flex items-start justify-between mb-3">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      {delta && (
        <Badge variant="secondary" className="gap-1 text-success bg-success/10 border-0">
          <TrendingUp className="h-3 w-3" /> {delta}
        </Badge>
      )}
    </div>
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="text-2xl font-display font-bold">{value}</p>
  </Card>
);

const Row = ({ label, value, color = "", muted = false }: any) => (
  <div className="flex items-center justify-between text-sm">
    <span className={muted ? "text-muted-foreground pl-3" : "font-semibold"}>{label}</span>
    <span className={`font-semibold ${color}`}>{value}</span>
  </div>
);

const DashboardHome = () => {
  const { user } = useAuth();
  return (
    <div className="flex-1 flex flex-col">
      <header className="h-16 border-b bg-card flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <h1 className="font-display font-bold text-xl">Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex rounded-lg border bg-background p-1">
            {["Hoje", "Semana", "Mês"].map((p, i) => (
              <button key={p} className={`px-3 py-1 text-sm rounded-md font-medium ${i === 0 ? "bg-foreground text-background" : "text-muted-foreground"}`}>{p}</button>
            ))}
          </div>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive" />
          </Button>
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-background text-sm">
            <Store className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Minha Barbearia</span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 lg:p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-display font-bold">Bem-vindo de volta 👋</h2>
          <p className="text-muted-foreground text-sm">{user?.email} · Aqui está o resumo da sua barbearia hoje.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi icon={Users} label="Atendimentos Hoje" value="28" delta="+12%" color="bg-primary/10 text-primary" />
          <Kpi icon={Wallet} label="Faturamento do Dia" value="R$ 2.845,50" delta="+18%" color="bg-success/10 text-success" />
          <Kpi icon={Package} label="Estoque Baixo" value="5 itens" color="bg-accent/15 text-accent" />
          <Kpi icon={Calendar} label="Agendamentos" value="34" color="bg-primary/10 text-primary" />
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-bold text-lg">Faturamento Semanal</h3>
                <p className="text-sm text-muted-foreground">Últimos 7 dias</p>
              </div>
              <Badge variant="secondary">Esta semana</Badge>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="d" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v / 1000}k`} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                  <Bar dataKey="v" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg">Agenda do Dia</h3>
              <Button variant="link" size="sm" className="text-primary">Ver tudo</Button>
            </div>
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {agenda.map((a) => (
                <div key={a.time} className="flex items-center gap-3 rounded-lg hover:bg-muted/50 p-2 -m-2 transition">
                  <div className="text-xs font-bold w-12 text-muted-foreground">{a.time}</div>
                  <div className="h-8 w-8 rounded-full bg-gradient-hero flex items-center justify-center text-xs font-bold text-primary-foreground flex-shrink-0">
                    {a.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.barber}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">{a.status}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="p-6">
            <h3 className="font-display font-bold text-lg mb-4">Fluxo de Caixa</h3>
            <div className="space-y-3">
              <Row label="Entradas" value="R$ 3.150,00" color="text-success" />
              <Row label="Serviços" value="R$ 2.540,00" muted />
              <Row label="Vendas de Produtos" value="R$ 610,00" muted />
              <div className="border-t pt-3" />
              <Row label="Saídas" value="R$ 720,50" color="text-destructive" />
              <div className="bg-accent/15 rounded-lg p-3 flex items-center justify-between">
                <span className="font-semibold">Resultado do Dia</span>
                <span className="font-display font-bold text-lg">R$ 2.429,50</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 lg:col-span-2">
            <h3 className="font-display font-bold text-lg mb-4">Top Barbeiros</h3>
            <div className="space-y-3">
              {[
                { rank: 1, name: "Felipe Almeida", v: "R$ 4.980,00" },
                { rank: 2, name: "Rafael Costa", v: "R$ 3.870,00" },
                { rank: 3, name: "Lucas Pereira", v: "R$ 3.210,00" },
                { rank: 4, name: "Gustavo Lima", v: "R$ 2.450,00" },
              ].map((b) => (
                <div key={b.rank} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${b.rank === 1 ? "bg-gradient-gold text-accent-foreground" : "bg-muted"}`}>
                    {b.rank}
                  </div>
                  <div className="h-9 w-9 rounded-full bg-gradient-hero flex items-center justify-center text-sm font-bold text-primary-foreground">
                    {b.name[0]}
                  </div>
                  <p className="flex-1 font-medium">{b.name}</p>
                  <p className="font-display font-bold">{b.v}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default DashboardHome;
