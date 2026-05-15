import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type EmployeePosition = "admin" | "gerente" | "atendente" | "barbeiro";
export type SalaryType = "fixed" | "commission" | "hybrid";

export interface Employee {
  id: string;
  owner_id: string;
  user_id?: string;
  name: string;
  email: string;
  phone?: string;
  position: EmployeePosition;
  salary_type: SalaryType;
  base_salary: number;
  commission_enabled: boolean;
  service_commission_percent: number;
  product_commission_percent: number;
  active: boolean;
  hire_date: string;
  termination_date?: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeePermissions {
  can_view_all_appointments: boolean;
  can_manage_all_appointments: boolean;
  can_view_clients: boolean;
  can_manage_clients: boolean;
  can_create_sales: boolean;
  can_view_sales: boolean;
  can_manage_sales: boolean;
  can_view_stock: boolean;
  can_manage_stock: boolean;
  can_view_reports: boolean;
  can_manage_payroll: boolean;
  can_manage_master_plan: boolean;
  can_manage_team: boolean;
}

type EmployeeContextType = {
  employee: Employee | null;
  position: EmployeePosition | null;
  permissions: EmployeePermissions;
  loading: boolean;
  error: string | null;
  refreshEmployee: () => Promise<void>;
};

const EmployeeContext = createContext<EmployeeContextType>({
  employee: null,
  position: null,
  permissions: {} as EmployeePermissions,
  loading: true,
  error: null,
  refreshEmployee: async () => {},
});

const getPermissionsByPosition = (position: EmployeePosition | null): EmployeePermissions => {
  switch (position) {
    case "admin":
      return {
        can_view_all_appointments: true,
        can_manage_all_appointments: true,
        can_view_clients: true,
        can_manage_clients: true,
        can_create_sales: true,
        can_view_sales: true,
        can_manage_sales: true,
        can_view_stock: true,
        can_manage_stock: true,
        can_view_reports: true,
        can_manage_payroll: true,
        can_manage_master_plan: true,
        can_manage_team: true,
      };
    case "gerente":
      return {
        can_view_all_appointments: true,
        can_manage_all_appointments: true,
        can_view_clients: true,
        can_manage_clients: true,
        can_create_sales: true,
        can_view_sales: true,
        can_manage_sales: true,
        can_view_stock: true,
        can_manage_stock: true,
        can_view_reports: true,
        can_manage_payroll: false,
        can_manage_master_plan: false,
        can_manage_team: false,
      };
    case "atendente":
      return {
        can_view_all_appointments: false,
        can_manage_all_appointments: false,
        can_view_clients: true,
        can_manage_clients: true,
        can_create_sales: true,
        can_view_sales: true,
        can_manage_sales: false,
        can_view_stock: true,
        can_manage_stock: false,
        can_view_reports: false,
        can_manage_payroll: false,
        can_manage_master_plan: false,
        can_manage_team: false,
      };
    case "barbeiro":
      return {
        can_view_all_appointments: false,
        can_manage_all_appointments: false,
        can_view_clients: false,
        can_manage_clients: false,
        can_create_sales: false,
        can_view_sales: false,
        can_manage_sales: false,
        can_view_stock: false,
        can_manage_stock: false,
        can_view_reports: false,
        can_manage_payroll: false,
        can_manage_master_plan: false,
        can_manage_team: false,
      };
    default:
      return {
        can_view_all_appointments: false,
        can_manage_all_appointments: false,
        can_view_clients: false,
        can_manage_clients: false,
        can_create_sales: false,
        can_view_sales: false,
        can_manage_sales: false,
        can_view_stock: false,
        can_manage_stock: false,
        can_view_reports: false,
        can_manage_payroll: false,
        can_manage_master_plan: false,
        can_manage_team: false,
      };
  }
};

export const EmployeeProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployeeData = async () => {
    if (!user) {
      setEmployee(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch employee profile
      const { data: employeeData, error: empError } = await supabase
        .from("employees")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (empError && empError.code !== "PGRST116") {
        throw empError;
      }

      setEmployee(employeeData || null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar dados do funcionário";
      setError(message);
      console.error("Error fetching employee data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchEmployeeData();
    }
  }, [user, authLoading]);

  const permissions = getPermissionsByPosition(employee?.position || null);

  const value = {
    employee,
    position: employee?.position || null,
    permissions,
    loading: loading || authLoading,
    error,
    refreshEmployee: fetchEmployeeData,
  };

  return (
    <EmployeeContext.Provider value={value}>
      {children}
    </EmployeeContext.Provider>
  );
};

export const useEmployee = () => {
  const context = useContext(EmployeeContext);
  if (!context) {
    throw new Error("useEmployee deve ser usado dentro de EmployeeProvider");
  }
  return context;
};
