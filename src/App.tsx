import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import DashboardLayout from "./pages/dashboard/DashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import { Placeholder } from "./pages/dashboard/Placeholder";
import Admin from "./pages/Admin.tsx";
import { AdminRoute } from "@/components/AdminRoute";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<DashboardHome />} />
              <Route path="agenda" element={<Placeholder title="Agenda" description="Visualize e gerencie todos os agendamentos da sua barbearia em um só lugar." />} />
              <Route path="clientes" element={<Placeholder title="Clientes" description="Cadastro completo dos clientes, histórico de visitas e preferências." />} />
              <Route path="barbeiros" element={<Placeholder title="Barbeiros" description="Gerencie sua equipe de profissionais, comissões e horários." />} />
              <Route path="servicos" element={<Placeholder title="Serviços" description="Cadastre cortes, barbas, combos e seus respectivos preços e durações." />} />
              <Route path="vendas" element={<Placeholder title="Vendas" description="Registre vendas de produtos e serviços com poucos cliques." />} />
              <Route path="caixa" element={<Placeholder title="Caixa" description="Controle de entradas, saídas e fechamento de caixa diário." />} />
              <Route path="estoque" element={<Placeholder title="Estoque" description="Gestão de produtos, fornecedores e alertas de baixo estoque." />} />
              <Route path="relatorios" element={<Placeholder title="Relatórios" description="Análises financeiras, operacionais e de desempenho da equipe." />} />
              <Route path="config" element={<Placeholder title="Configurações" description="Preferências da sua barbearia, horários de funcionamento e integrações." />} />
            </Route>
            <Route path="/admin" element={<ProtectedRoute><AdminRoute><Admin /></AdminRoute></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
