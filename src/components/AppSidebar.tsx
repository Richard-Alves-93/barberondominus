import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Calendar, Users, Scissors, ShoppingCart,
  Wallet, Package, ShoppingBag, BarChart3, Settings, LogOut, Shield, UserCog,
} from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useStaffRole, StaffPermissions } from "@/hooks/useStaffRole";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader,
  SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

type Item = {
  title: string; url: string; icon: any;
  ownerOnly?: boolean; require?: keyof StaffPermissions;
};

const items: Item[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Agenda", url: "/dashboard/agenda", icon: Calendar, require: "can_agenda" },
  { title: "Clientes", url: "/dashboard/clientes", icon: Users, require: "can_view_clients" },
  { title: "Barbeiros", url: "/dashboard/barbeiros", icon: Scissors, ownerOnly: true },
  { title: "Serviços", url: "/dashboard/servicos", icon: ShoppingBag, require: "can_view_services" },
  { title: "Vendas", url: "/dashboard/vendas", icon: ShoppingCart, require: "can_pdv" },
  { title: "Caixa", url: "/dashboard/caixa", icon: Wallet, ownerOnly: true },
  { title: "Estoque", url: "/dashboard/estoque", icon: Package, require: "can_manage_stock" },
  { title: "Relatórios", url: "/dashboard/relatorios", icon: BarChart3, require: "can_view_reports" },
  { title: "Funcionários", url: "/dashboard/funcionarios", icon: UserCog, ownerOnly: true },
  { title: "Configurações", url: "/dashboard/config", icon: Settings, ownerOnly: true },
];

export const AppSidebar = () => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { signOut, user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { isOwner, permissions, staffName } = useStaffRole();

  const visible = items.filter((i) => {
    if (isOwner) return true;
    if (i.ownerOnly) return false;
    if (i.require) return permissions[i.require];
    return true;
  });

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        {!collapsed ? <Logo variant="light" /> : (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-hero">
            <Scissors className="h-5 w-5 text-primary-foreground" />
          </div>
        )}
      </SidebarHeader>
      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {visible.map((item) => {
                const active = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active} className="h-10">
                      <NavLink to={item.url} end>
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span className="font-medium">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/admin"} className="h-10">
                    <NavLink to="/admin">
                      <Shield className="h-4 w-4" />
                      {!collapsed && <span className="font-medium">Admin Master</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 border-t border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2 mb-2 px-2 py-2 rounded-lg bg-sidebar-accent">
            <div className="h-8 w-8 rounded-full bg-gradient-hero flex items-center justify-center text-xs font-bold text-primary-foreground">
              {(staffName ?? user?.email)?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="text-xs leading-tight overflow-hidden">
              <p className="font-semibold text-sidebar-foreground truncate">{staffName ?? user?.email}</p>
              <p className="text-sidebar-foreground/60">{isOwner ? "Dono" : "Funcionário"}</p>
            </div>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground">
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};
