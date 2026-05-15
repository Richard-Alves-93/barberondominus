import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { BarberProvider } from "@/contexts/BarberContext";
import { EmployeeProvider } from "@/contexts/EmployeeContext";
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
import Assinatura from "./pages/dashboard/Assinatura";
import BarberCommissions from "./pages/dashboard/BarberCommissions";
import CommissionManagement from "./pages/dashboard/CommissionManagement";
import Employees from "./pages/dashboard/Employees";
import Payroll from "./pages/dashboard/Payroll";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminOverview from "./pages/admin/Overview";
import AdminTenants from "./pages/admin/Tenants";
import AdminPlans from "./pages/admin/Plans";
import AdminAdesoes from "./pages/admin/Adesoes";
import AdminFaturamento from "./pages/admin/Faturamento";
import AdminLogs from "./pages/admin/Logs";
import AdminAdmins from "./pages/admin/Admins";
import AdminConfiguracoes from "./pages/admin/Configuracoes";
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
          <BarberProvider>
            <EmployeeProvider>
              <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<DashboardHome />} />
              <Route path="agenda" element={<PermissionRoute require="can_agenda"><Agenda /></PermissionRoute>} />
              <Route path="clientes" element={<PermissionRoute require="can_view_clients"><Clientes /></PermissionRoute>} />
              <Route path="barbeiros" element={<PermissionRoute ownerOnly><Barbeiros /></PermissionRoute>} />
              <Route path="servicos" element={<PermissionRoute require="can_view_services"><Servicos /></PermissionRoute>} />
              <Route path="vendas" element={<PermissionRoute require="can_pdv"><Vendas /></PermissionRoute>} />
              <Route path="caixa" element={<PermissionRoute ownerOnly><Placeholder title="Caixa" description="Controle de entradas, saídas e fechamento de caixa diário." /></PermissionRoute>} />
              <Route path="estoque" element={<PermissionRoute require="can_manage_stock"><Estoque /></PermissionRoute>} />
              <Route path="relatorios" element={<PermissionRoute require="can_view_reports"><Relatorios /></PermissionRoute>} />
              <Route path="assinatura" element={<PermissionRoute ownerOnly><Assinatura /></PermissionRoute>} />
              <Route path="config" element={<PermissionRoute ownerOnly><Placeholder title="Configurações" description="Preferências da sua barbearia, horários de funcionamento e integrações." /></PermissionRoute>} />
              <Route path="comissoes" element={<BarberCommissions />} />
              <Route path="comissoes-manager" element={<PermissionRoute ownerOnly><CommissionManagement /></PermissionRoute>} />
              <Route path="folha-pagamento" element={<PermissionRoute ownerOnly><Payroll /></PermissionRoute>} />
            </Route>
            <Route path="/admin" element={<ProtectedRoute><AdminRoute><AdminLayout /></AdminRoute></ProtectedRoute>}>
              <Route index element={<AdminOverview />} />
              <Route path="tenants" element={<AdminTenants />} />
              <Route path="planos" element={<AdminPlans />} />
              <Route path="adesoes" element={<AdminAdesoes />} />
              <Route path="faturamento" element={<AdminFaturamento />} />
              <Route path="configuracoes" element={<AdminConfiguracoes />} />
              <Route path="logs" element={<AdminLogs />} />
              <Route path="admins" element={<AdminAdmins />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>            </EmployeeProvider>          </BarberProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
