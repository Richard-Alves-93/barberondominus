import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
const supabase = supabaseClient as any;

export interface BarberProfile {
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

export interface CommissionSummary {
  total_gross: number;
  total_commission: number;
  commission_count: number;
  pending_commission?: number;
  paid_commission?: number;
}

type BarberContextType = {
  barber: BarberProfile | null;
  isBarber: boolean;
  loading: boolean;
  error: string | null;
  commissionSummary: CommissionSummary | null;
  refreshBarber: () => Promise<void>;
};

const BarberContext = createContext<BarberContextType>({
  barber: null,
  isBarber: false,
  loading: true,
  error: null,
  commissionSummary: null,
  refreshBarber: async () => {},
});

export const BarberProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [barber, setBarber] = useState<BarberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commissionSummary, setCommissionSummary] = useState<CommissionSummary | null>(null);

  const fetchBarberData = async () => {
    if (!user) {
      setBarber(null);
      setCommissionSummary(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch barber profile
      const { data: barberData, error: barberError } = await supabase
        .from("barbers")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (barberError && barberError.code !== "PGRST116") {
        throw barberError;
      }

      if (barberData) {
        setBarber(barberData);

        // Fetch commission summary
        const { data: summaryData, error: summaryError } = await supabase
          .rpc("get_barber_pending_commissions", {
            p_barber_id: barberData.id,
          });

        if (summaryError) {
          console.error("Error fetching commission summary:", summaryError);
        } else if (summaryData) {
          setCommissionSummary(summaryData);
        }
      } else {
        setBarber(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar dados do barbeiro";
      setError(message);
      console.error("Error fetching barber data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchBarberData();
    }
  }, [user, authLoading]);

  const value = {
    barber,
    isBarber: barber !== null,
    loading: loading || authLoading,
    error,
    commissionSummary,
    refreshBarber: fetchBarberData,
  };

  return <BarberContext.Provider value={value}>{children}</BarberContext.Provider>;
};

export const useBarber = () => {
  const context = useContext(BarberContext);
  if (!context) {
    throw new Error("useBarber deve ser usado dentro de BarberProvider");
  }
  return context;
};
