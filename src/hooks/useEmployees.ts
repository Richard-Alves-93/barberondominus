import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Employee, EmployeePosition } from "@/contexts/EmployeeContext";

export const useEmployeesList = (ownerId: string) => {
  return useQuery({
    queryKey: ["employees", ownerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("owner_id", ownerId)
        .eq("active", true)
        .order("name");

      if (error) throw error;
      return data as Employee[];
    },
    enabled: !!ownerId,
  });
};

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      ownerId,
      name,
      email,
      phone,
      position,
      salaryType,
      baseSalary,
      commissionEnabled,
      serviceCommissionPercent,
      productCommissionPercent,
      hireDate,
    }: {
      ownerId: string;
      name: string;
      email: string;
      phone?: string;
      position: EmployeePosition;
      salaryType: "fixed" | "commission" | "hybrid";
      baseSalary: number;
      commissionEnabled: boolean;
      serviceCommissionPercent: number;
      productCommissionPercent: number;
      hireDate: string;
    }) => {
      const { data, error } = await supabase
        .from("employees")
        .insert({
          owner_id: ownerId,
          name,
          email,
          phone,
          position,
          salary_type: salaryType,
          base_salary: baseSalary,
          commission_enabled: commissionEnabled,
          service_commission_percent: serviceCommissionPercent,
          product_commission_percent: productCommissionPercent,
          hire_date: hireDate,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["employees", variables.ownerId],
      });
      toast({
        title: "Sucesso",
        description: "Funcionário cadastrado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Erro ao cadastrar funcionário: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      employeeId,
      ownerId,
      ...updates
    }: {
      employeeId: string;
      ownerId: string;
      [key: string]: any;
    }) => {
      const { data, error } = await supabase
        .from("employees")
        .update(updates)
        .eq("id", employeeId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["employees", variables.ownerId],
      });
      toast({
        title: "Sucesso",
        description: "Funcionário atualizado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Erro ao atualizar funcionário: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useDeactivateEmployee = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      employeeId,
      ownerId,
    }: {
      employeeId: string;
      ownerId: string;
    }) => {
      const { data, error } = await supabase
        .from("employees")
        .update({
          active: false,
          termination_date: new Date().toISOString().split("T")[0],
        })
        .eq("id", employeeId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["employees", variables.ownerId],
      });
      toast({
        title: "Sucesso",
        description: "Funcionário desativado",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Erro ao desativar funcionário: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export interface PayrollEntry {
  id: string;
  owner_id: string;
  employee_id: string;
  sale_id?: string;
  appointment_id?: string;
  entry_type: "service" | "product" | "bonus" | "deduction" | "fixed_salary";
  gross_amount: number;
  commission_percent: number;
  commission_amount: number;
  description?: string;
  paid: boolean;
  paid_at?: string;
  payment_method?: string;
  reference_date: string;
  created_at: string;
  updated_at: string;
}

export const usePayrollByPeriod = (
  ownerId: string,
  employeeId: string | null,
  startDate: Date,
  endDate: Date
) => {
  return useQuery({
    queryKey: [
      "payroll-summary",
      ownerId,
      employeeId,
      startDate.toISOString(),
      endDate.toISOString(),
    ],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_payroll_summary_by_period",
        {
          p_owner_id: ownerId,
          p_start_date: startDate.toISOString().split("T")[0],
          p_end_date: endDate.toISOString().split("T")[0],
          p_employee_id: employeeId || null,
        }
      );

      if (error) throw error;
      return data;
    },
    enabled: !!ownerId,
  });
};

export const usePayrollEntries = (employeeId: string) => {
  return useQuery({
    queryKey: ["payroll-entries", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_entries")
        .select("*")
        .eq("employee_id", employeeId)
        .order("reference_date", { ascending: false });

      if (error) throw error;
      return data as PayrollEntry[];
    },
    enabled: !!employeeId,
  });
};

export const useMarkPayrollAsPaid = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      payrollIds,
      paymentMethod,
    }: {
      payrollIds: string[];
      paymentMethod?: string;
    }) => {
      const { data, error } = await supabase
        .from("payroll_entries")
        .update({
          paid: true,
          paid_at: new Date().toISOString(),
          payment_method: paymentMethod || "transfer",
        })
        .in("id", payrollIds)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["payroll"],
      });
      toast({
        title: "Sucesso",
        description: "Folha de pagamento marcada como paga",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Erro ao marcar folha como paga: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};
