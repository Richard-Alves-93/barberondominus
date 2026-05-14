import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Building2, Package, CreditCard,
  TrendingUp, ScrollText, Shield, LogOut, Scissors, Settings,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader,
  SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const items = [
  { title: "Visão Geral", url: "/admin", icon: LayoutDashboard, end: true },
  { title: "Barbearias", url: "/admin/tenants", icon: Building2 },
  { title: "Planos", url: "/admin/planos", icon: Package },
  { title: "Adesões", url: "/admin/adesoes", icon: CreditCard },
  { title: "Faturamento", url: "/admin/faturamento", icon: TrendingUp },
  { title: "Configurações", url: "/admin/configuracoes", icon: Settings },
  { title: "Log de Atividades", url: "/admin/logs", icon: ScrollText },
  { title: "Administradores", url: "/admin/admins", icon: Shield },
];

export const AdminSidebar = () => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { signOut, user } = useAuth();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <Scissors className="h-5 w-5 text-amber-500" />
          </div>
          {!collapsed && (
            <div>
              <p className="font-bold text-sidebar-foreground leading-tight">Barber On</p>
              <Badge variant="outline" className="text-[10px] h-4 border-amber-500/40 text-amber-500">MASTER</Badge>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {items.map((item) => {
                const active = item.end ? pathname === item.url : pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active} className="h-10">
                      <NavLink to={item.url} end={item.end}>
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span className="font-medium">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-10">
                  <NavLink to="/dashboard">
                    <LayoutDashboard className="h-4 w-4" />
                    {!collapsed && <span className="font-medium">Voltar à Loja</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 border-t border-sidebar-border">
        {!collapsed && (
          <div className="px-2 py-2 mb-2 text-xs text-sidebar-foreground/70 truncate">{user?.email}</div>
        )}
        <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start">
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};
