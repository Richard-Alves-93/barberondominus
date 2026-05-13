import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet, useLocation } from "react-router-dom";
import PaywallGate from "@/components/PaywallGate";

const DashboardLayout = () => {
  const { pathname } = useLocation();
  // Permite acessar /dashboard/assinatura mesmo bloqueado (mesma página)
  const bypass = pathname.startsWith("/dashboard/assinatura");
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/30">
        <AppSidebar />
        {bypass ? <Outlet /> : <PaywallGate><Outlet /></PaywallGate>}
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
