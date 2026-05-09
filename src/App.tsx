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
import Agenda from "./pages/dashboard/Agenda";
import Barbeiros from "./pages/dashboard/Barbeiros";
import Servicos from "./pages/dashboard/Servicos";
import Clientes from "./pages/dashboard/Clientes";
import Vendas from "./pages/dashboard/Vendas";
import Estoque from "./pages/dashboard/Estoque";
import Relatorios from "./pages/dashboard/Relatorios";
import Funcionarios from "./pages/dashboard/Funcionarios";
import Admin from "./pages/Admin.tsx";
import { AdminRoute } from "@/components/AdminRoute";
import { PermissionRoute } from "@/components/PermissionRoute";
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
              <Route path="agenda" element={<Agenda />} />
              <Route path="clientes" element={<Clientes />} />
              <Route path="barbeiros" element={<Barbeiros />} />
              <Route path="servicos" element={<Servicos />} />
              <Route path="vendas" element={<Vendas />} />
              <Route path="caixa" element={<Placeholder title="Caixa" description="Controle de entradas, saídas e fechamento de caixa diário." />} />
              <Route path="estoque" element={<Estoque />} />
              <Route path="relatorios" element={<Relatorios />} />
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
