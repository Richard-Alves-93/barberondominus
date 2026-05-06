import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";

const DashboardLayout = () => (
  <SidebarProvider>
    <div className="min-h-screen flex w-full bg-muted/30">
      <AppSidebar />
      <Outlet />
    </div>
  </SidebarProvider>
);

export default DashboardLayout;
