import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Barber {
  id: string;
  owner_id: string;
  name: string;
  color: string;
  user_id?: string;
  commission_enabled: boolean;
  service_commission_percent: number;
  product_commission_percent: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const useBarbershopBarbers = (ownerId: string) => {
  return useQuery({
    queryKey: ["barbershop-barbers", ownerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("barbers")
        .select("*")
        .eq("owner_id", ownerId)
        .order("name");

      if (error) throw error;
      return data as Barber[];
    },
    enabled: !!ownerId,
  });
};

export const useBarberDetail = (barberId: string) => {
  return useQuery({
    queryKey: ["barber-detail", barberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("barbers")
        .select("*")
        .eq("id", barberId)
        .single();

      if (error) throw error;
      return data as Barber;
    },
    enabled: !!barberId,
  });
};
