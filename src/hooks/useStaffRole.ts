import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type StaffPermissions = {
  can_pdv: boolean;
  can_agenda: boolean;
  can_view_clients: boolean;
  can_view_services: boolean;
  can_cancel_sales: boolean;
  can_view_reports: boolean;
  can_manage_stock: boolean;
};

export type StaffContext = {
  loading: boolean;
  isOwner: boolean;       // dono da barbearia (admin)
  ownerId: string | null; // id do dono (próprio uid se owner; senão o employer)
  permissions: StaffPermissions;
  staffName: string | null;
};

const FULL: StaffPermissions = {
  can_pdv: true, can_agenda: true, can_view_clients: true, can_view_services: true,
  can_cancel_sales: true, can_view_reports: true, can_manage_stock: true,
};

const NONE: StaffPermissions = {
  can_pdv: false, can_agenda: false, can_view_clients: false, can_view_services: false,
  can_cancel_sales: false, can_view_reports: false, can_manage_stock: false,
};

export const useStaffRole = (): StaffContext => {
  const { user, loading: authLoading } = useAuth();
  const [ctx, setCtx] = useState<StaffContext>({
    loading: true, isOwner: false, ownerId: null, permissions: NONE, staffName: null,
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setCtx({ loading: false, isOwner: false, ownerId: null, permissions: NONE, staffName: null });
      return;
    }
    supabase
      .from("staff_members")
      .select("owner_id,name,active,can_pdv,can_agenda,can_view_clients,can_view_services,can_cancel_sales,can_view_reports,can_manage_stock")
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setCtx({
            loading: false, isOwner: false, ownerId: data.owner_id, staffName: data.name,
            permissions: {
              can_pdv: data.can_pdv, can_agenda: data.can_agenda,
              can_view_clients: data.can_view_clients, can_view_services: data.can_view_services,
              can_cancel_sales: data.can_cancel_sales, can_view_reports: data.can_view_reports,
              can_manage_stock: data.can_manage_stock,
            },
          });
        } else {
          setCtx({ loading: false, isOwner: true, ownerId: user.id, permissions: FULL, staffName: null });
        }
      });
  }, [user, authLoading]);

  return ctx;
};
