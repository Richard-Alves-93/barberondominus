import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
const supabase = supabaseClient as any;
import { useToast } from "@/hooks/use-toast";

export const useCreateCommissionFromAppointment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      appointmentId,
      barberId,
      ownerId,
      grossAmount,
    }: {
      appointmentId: string;
      barberId: string;
      ownerId: string;
      grossAmount: number;
    }) => {
      const { data, error } = await supabase.rpc(
        "create_commission_from_appointment",
        {
          p_appointment_id: appointmentId,
          p_barber_id: barberId,
          p_owner_id: ownerId,
          p_gross_amount: grossAmount,
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["commissions"],
      });
      toast({
        title: "Sucesso",
        description: "Comissão criada com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Erro ao criar comissão: ${error.message}`,
        variant: "destructive",
      });
    },
  });
};

export const useCreateMultipleCommissionsPaid = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      commissionIds,
      paidDate,
    }: {
      commissionIds: string[];
      paidDate?: Date;
    }) => {
      const { data, error } = await supabase.rpc(
        "mark_multiple_commissions_paid",
        {
          p_commission_ids: commissionIds,
          p_paid_date: paidDate?.toISOString() || new Date().toISOString(),
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["commissions"],
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

export const useDetailedCommissions = (
  barberId: string,
  startDate: Date,
  endDate: Date
) => {
  return supabase
    .from("commissions_generated")
    .select("*")
    .eq("barber_id", barberId)
    .gte("created_at", startDate.toISOString())
    .lt("created_at", endDate.toISOString())
    .order("created_at", { ascending: false });
};
