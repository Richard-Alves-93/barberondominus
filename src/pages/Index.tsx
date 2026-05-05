import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  Calendar, Users, ShoppingCart, Package, BarChart3, Wallet,
  Check, ArrowRight, Sparkles, Shield, Smartphone, Clock,
  TrendingUp, Star, Crown, ThumbsUp,
} from "lucide-react";

const features = [
  { icon: Users, title: "Cadastro Completo", desc: "Clientes, barbeiros e fornecedores em um só lugar." },
  { icon: Calendar, title: "Agenda Inteligente", desc: "Horários, status e filtros sem complicação." },
  { icon: Wallet, title: "Financeiro & Caixa", desc: "Vendas, pagamentos e fluxo de caixa diário." },
  { icon: Package, title: "Estoque & Compras", desc: "Controle de produtos, alertas e reposição." },
  { icon: BarChart3, title: "Relatórios Avançados", desc: "Faturamento, top barbeiros e indicadores." },
  { icon: Smartphone, title: "Web e Mobile", desc: "Acesso de qualquer dispositivo, com segurança." },
];

const plans = [
  {
    name: "Básico", icon: Star, price: "109,90", percent: "5%", adesao: "150,00",
    items: ["Até 2 barbeiros", "Cadastro de até 50 clientes", "Agendamentos básicos", "Vendas e Fluxo de Caixa", "Relatórios básicos", "Suporte por e-mail"],
  },
  {
    name: "Intermediário", icon: ThumbsUp, price: "209,90", percent: "4%", adesao: "200,00", featured: true,
    items: ["Até 5 barbeiros", "Cadastro de até 150 clientes", "Agendamentos avançados", "Controle de Estoque", "Relatórios padrão", "Suporte prioritário (chat)"],
  },
  {
    name: "Completo", icon: Crown, price: "359,90", percent: "3%", adesao: "300,00",
    items: ["Barbeiros ilimitados", "Clientes ilimitados", "Integrações avançadas", "Gestão completa de produtos", "Relatórios avançados", "Suporte Premium 24/7"],
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition">Funcionalidades</a>
            <a href="#planos" className="hover:text-foreground transition">Planos</a>
            <a href="#beneficios" className="hover:text-foreground transition">Benefícios</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild><Link to="/auth">Entrar</Link></Button>
            <Button asChild className="bg-gradient-hero hover:opacity-90 shadow-glow">
              <Link to="/auth?mode=signup">Começar grátis</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-subtle">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.12),transparent_50%)]" />
        <div className="container relative py-20 lg:py-32 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Badge variant="secondary" className="mb-6 gap-1.5 px-3 py-1.5">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Sistema de Gestão para Barbearias
            </Badge>
            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6">
              A gestão que <span className="text-gradient-hero">transforma</span> a sua barbearia.
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl">
              Centralize agenda, clientes, vendas, estoque e financeiro em uma plataforma simples,
              rápida e feita para o dia a dia da barbearia.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild className="bg-gradient-hero hover:opacity-90 shadow-glow h-12 px-6">
                <Link to="/auth?mode=signup">Criar minha conta <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-12 px-6">
                <a href="#planos">Ver planos</a>
              </Button>
            </div>
            <div className="mt-10 flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-success" /> Backup diário</div>
              <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-success" /> Setup em minutos</div>
              <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-success" /> +18% faturamento</div>
            </div>
          </div>

          {/* Mock dashboard card */}
          <div className="relative">
            <div className="absolute -inset-8 bg-gradient-hero opacity-20 blur-3xl rounded-full" />
            <Card className="relative p-6 shadow-elegant border-2">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs text-muted-foreground">Faturamento de Hoje</p>
                  <p className="text-3xl font-display font-bold">R$ 2.845,50</p>
                </div>
                <Badge className="bg-success/10 text-success hover:bg-success/10 border-0">+18%</Badge>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { l: "Atendimentos", v: "28", c: "bg-primary/10 text-primary" },
                  { l: "Agendamentos", v: "34", c: "bg-accent/15 text-accent" },
                  { l: "Ticket Médio", v: "R$ 101", c: "bg-success/10 text-success" },
                ].map((s) => (
                  <div key={s.l} className={`rounded-xl p-3 ${s.c}`}>
                    <p className="text-[10px] uppercase tracking-wide opacity-80">{s.l}</p>
                    <p className="text-lg font-bold">{s.v}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {["09:00 André Martins · Confirmado", "10:00 Carlos Eduardo · Em andamento", "11:00 Bruno Souza · Concluído"].map((r) => (
                  <div key={r} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                    <span className="truncate">{r}</span>
                    <Check className="h-4 w-4 text-success flex-shrink-0" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container py-20 lg:py-28">
        <div className="max-w-2xl mb-14">
          <Badge variant="outline" className="mb-4">Funcionalidades</Badge>
          <h2 className="text-4xl lg:text-5xl font-extrabold mb-4">Tudo o que sua barbearia precisa</h2>
          <p className="text-muted-foreground text-lg">Módulos integrados que substituem planilhas e organizam a operação completa.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <Card key={f.title} className="p-6 hover:shadow-elegant hover:-translate-y-1 transition-all duration-300 border-2 hover:border-primary/30">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-hero mb-4 shadow-glow">
                <f.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">{f.title}</h3>
              <p className="text-muted-foreground">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Beneficios */}
      <section id="beneficios" className="bg-gradient-subtle py-20 lg:py-28 border-y">
        <div className="container grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Badge variant="outline" className="mb-4">Principais benefícios</Badge>
            <h2 className="text-4xl lg:text-5xl font-extrabold mb-6">Decisões com base em <span className="text-gradient-hero">dados reais</span></h2>
            <ul className="space-y-3">
              {["Mais organização do negócio", "Redução de erros manuais", "Agilidade no atendimento", "Visão clara do faturamento", "Controle de produtos e estoque", "Indicadores de desempenho"].map((b) => (
                <li key={b} className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success/15">
                    <Check className="h-3.5 w-3.5 text-success" />
                  </div>
                  <span className="font-medium">{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <Card className="p-8 shadow-elegant border-2 bg-card">
            <div className="grid grid-cols-2 gap-4">
              {[
                { l: "Atendimentos Hoje", v: "28", icon: Users },
                { l: "Faturamento", v: "R$ 2.845", icon: Wallet },
                { l: "Estoque Baixo", v: "5 itens", icon: Package },
                { l: "Agendamentos", v: "34", icon: Calendar },
              ].map((k) => (
                <div key={k.l} className="rounded-xl border bg-background p-4">
                  <k.icon className="h-5 w-5 text-primary mb-3" />
                  <p className="text-2xl font-bold">{k.v}</p>
                  <p className="text-xs text-muted-foreground">{k.l}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="container py-20 lg:py-28">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <Badge variant="outline" className="mb-4">Planos</Badge>
          <h2 className="text-4xl lg:text-5xl font-extrabold mb-4">Escolha o plano ideal</h2>
          <p className="text-muted-foreground text-lg">Mensalidade fixa ou percentual sobre o faturamento. Você decide.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((p) => (
            <Card key={p.name} className={`relative p-8 border-2 transition-all ${p.featured ? "border-primary shadow-elegant scale-105 lg:scale-110" : "hover:border-primary/30 hover:shadow-md"}`}>
              {p.featured && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-gold text-accent-foreground border-0 px-3 py-1">
                  Mais indicado
                </Badge>
              )}
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl mb-4 ${p.featured ? "bg-gradient-hero shadow-glow" : "bg-muted"}`}>
                <p.icon className={`h-6 w-6 ${p.featured ? "text-primary-foreground" : "text-foreground"}`} />
              </div>
              <h3 className="text-2xl font-bold mb-2">{p.name}</h3>
              <div className="mb-1">
                <span className="text-4xl font-extrabold">R$ {p.price}</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
              <p className="text-sm text-muted-foreground mb-1">ou <span className="font-semibold text-foreground">{p.percent}</span> sobre o faturamento</p>
              <p className="text-xs text-muted-foreground mb-6">Taxa de adesão: R$ {p.adesao}</p>
              <Button asChild className={`w-full mb-6 ${p.featured ? "bg-gradient-hero shadow-glow" : ""}`} variant={p.featured ? "default" : "outline"}>
                <Link to="/auth?mode=signup">Começar agora</Link>
              </Button>
              <ul className="space-y-2.5">
                {p.items.map((i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground mt-8">
          * Implantação inicial, migração de planilhas e treinamento podem ser cobrados separadamente.
        </p>
      </section>

      {/* CTA */}
      <section className="container pb-20">
        <Card className="p-12 lg:p-16 text-center bg-gradient-hero border-0 text-primary-foreground shadow-elegant overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--accent)/0.3),transparent_60%)]" />
          <div className="relative">
            <h2 className="text-4xl lg:text-5xl font-extrabold mb-4">Pronto para profissionalizar sua barbearia?</h2>
            <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">Junte-se às barbearias que já transformaram sua gestão com o Barber On.</p>
            <Button size="lg" asChild className="bg-accent text-accent-foreground hover:bg-accent/90 h-12 px-8 font-semibold">
              <Link to="/auth?mode=signup">Criar conta grátis <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo />
          <p className="text-sm text-muted-foreground">© 2026 Barber On · Gestão que transforma</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
