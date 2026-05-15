import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
const supabase = supabaseClient as any;
import { useToast } from "@/hooks/use-toast";

export interface Commission {
  id: string;
  owner_id: string;
  barber_id: string;
  sale_id?: string;
  appointment_id?: string;
  commission_type: "service" | "product" | "appointment";
  gross_amount: number;
  commission_percent: number;
  commission_amount: number;
  paid: boolean;
  paid_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface BarberCommissionSummary {
  barber_id: string;
  barber_name: string;
  total_gross: number;
  total_commission: number;
  pending_commission: number;
  paid_commission: number;
  commission_count: number;
}

export const useBarberCommissions = (barberId: string) => {
  return useQuery({
    queryKey: ["barber-commissions", barberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commissions_generated")
        .select("*")
        .eq("barber_id", barberId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Commission[];
    },
    enabled: !!barberId,
  });
};

export const useBarberPendingCommissions = (barberId: string) => {
  return useQuery({
    queryKey: ["barber-pending-commissions", barberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commissions_generated")
        .select("*")
        .eq("barber_id", barberId)
        .eq("paid", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Commission[];
    },
    enabled: !!barberId,
  });
};

export const useBarbershipCommissionsSummary = (ownerId: string) => {
  return useQuery({
    queryKey: ["barbershop-commissions-summary", ownerId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_barbershop_commissions_summary",
        {
          p_owner_id: ownerId,
        }
      );

      if (error) throw error;
      return data as BarberCommissionSummary[];
    },
    enabled: !!ownerId,
  });
};

export const useCommissionsByPeriod = (
  barberId: string,
  startDate: Date,
  endDate: Date
) => {
  return useQuery({
    queryKey: ["commissions-by-period", barberId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_barber_commissions_by_period",
        {
          p_barber_id: barberId,
          p_start_date: startDate.toISOString(),
          p_end_date: endDate.toISOString(),
        }
      );

      if (error) throw error;
      return data;
    },
    enabled: !!barberId,
  });
};

export const useMarkCommissionsAsPaid = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      barberId,
      commissionIds,
    }: {
      barberId: string;
      commissionIds: string[];
    }) => {
      const { data, error } = await supabase.rpc("mark_commissions_as_paid", {
        p_barber_id: barberId,
        p_commission_ids: commissionIds,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["barber-commissions", variables.barberId],
      });
      queryClient.invalidateQueries({
        queryKey: ["barber-pending-commissions", variables.barberId],
      });
      toast({
        title: "Sucesso",
        description: "Comissões marcadas como pagas",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Erro ao marcar comissões como pagas: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateCommissionConfig = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      barberId,
      serviceCommissionPercent,
      productCommissionPercent,
      commissionEnabled,
    }: {
      barberId: string;
      serviceCommissionPercent: number;
      productCommissionPercent: number;
      commissionEnabled: boolean;
    }) => {
      const { data, error } = await supabase
        .from("barbers")
        .update({
          service_commission_percent: serviceCommissionPercent,
          product_commission_percent: productCommissionPercent,
          commission_enabled: commissionEnabled,
        })
        .eq("id", barberId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["barbers"],
      });
      toast({
        title: "Sucesso",
        description: "Configuração de comissão atualizada",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Erro ao atualizar configuração: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useCreateServiceCommissionConfig = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      ownerId,
      serviceId,
      barberId,
      commissionPercent,
    }: {
      ownerId: string;
      serviceId: string;
      barberId: string;
      commissionPercent: number;
    }) => {
      const { data, error } = await supabase
        .from("service_commission_configs")
        .upsert({
          owner_id: ownerId,
          service_id: serviceId,
          barber_id: barberId,
          commission_percent: commissionPercent,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["service-commission-configs"],
      });
      toast({
        title: "Sucesso",
        description: "Configuração de comissão por serviço criada",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Erro ao criar configuração: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};
