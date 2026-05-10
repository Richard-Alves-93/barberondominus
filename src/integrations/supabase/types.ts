export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          barber_id: string
          client_id: string | null
          created_at: string
          ends_at: string
          id: string
          notes: string | null
          owner_id: string
          service_id: string | null
          starts_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          barber_id: string
          client_id?: string | null
          created_at?: string
          ends_at: string
          id?: string
          notes?: string | null
          owner_id: string
          service_id?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          barber_id?: string
          client_id?: string | null
          created_at?: string
          ends_at?: string
          id?: string
          notes?: string | null
          owner_id?: string
          service_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          metadata: Json
          owner_id: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json
          owner_id: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          metadata?: Json
          owner_id?: string
        }
        Relationships: []
      }
      barbers: {
        Row: {
          active: boolean
          color: string
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          color?: string
          created_at?: string
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          color?: string
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          owner_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          owner_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          active: boolean
          adhesion_fee: number
          billing_type: string
          created_at: string
          description: string | null
          id: string
          monthly_price: number
          name: string
          revenue_percent: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          adhesion_fee?: number
          billing_type: string
          created_at?: string
          description?: string | null
          id?: string
          monthly_price?: number
          name: string
          revenue_percent?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          adhesion_fee?: number
          billing_type?: string
          created_at?: string
          description?: string | null
          id?: string
          monthly_price?: number
          name?: string
          revenue_percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          category: string | null
          cost: number
          created_at: string
          id: string
          min_stock: number
          name: string
          owner_id: string
          price: number
          stock: number
          unit: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          cost?: number
          created_at?: string
          id?: string
          min_stock?: number
          name: string
          owner_id: string
          price?: number
          stock?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string | null
          cost?: number
          created_at?: string
          id?: string
          min_stock?: number
          name?: string
          owner_id?: string
          price?: number
          stock?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          adhesion_paid_at: string | null
          adhesion_status: string
          asaas_customer_id: string | null
          barbershop_name: string | null
          churned_at: string | null
          created_at: string
          full_name: string | null
          id: string
          plan: string | null
          plan_id: string | null
          status: string
          suspended_at: string | null
          updated_at: string
        }
        Insert: {
          adhesion_paid_at?: string | null
          adhesion_status?: string
          asaas_customer_id?: string | null
          barbershop_name?: string | null
          churned_at?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          plan?: string | null
          plan_id?: string | null
          status?: string
          suspended_at?: string | null
          updated_at?: string
        }
        Update: {
          adhesion_paid_at?: string | null
          adhesion_status?: string
          asaas_customer_id?: string | null
          barbershop_name?: string | null
          churned_at?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          plan?: string | null
          plan_id?: string | null
          status?: string
          suspended_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          appointment_id: string | null
          barber_id: string | null
          client_id: string | null
          created_at: string
          id: string
          items: Json
          notes: string | null
          owner_id: string
          payment_method: string | null
          status: string
          total: number
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          barber_id?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          items?: Json
          notes?: string | null
          owner_id: string
          payment_method?: string | null
          status?: string
          total?: number
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          barber_id?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          items?: Json
          notes?: string | null
          owner_id?: string
          payment_method?: string | null
          status?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      service_products: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          product_id: string
          quantity: number
          service_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          product_id: string
          quantity?: number
          service_id: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          product_id?: string
          quantity?: number
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_products_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          category: string | null
          cost: number
          created_at: string
          duration_minutes: number
          id: string
          name: string
          owner_id: string
          price: number
          profit_margin: number
          subcategory: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          cost?: number
          created_at?: string
          duration_minutes?: number
          id?: string
          name: string
          owner_id: string
          price?: number
          profit_margin?: number
          subcategory?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string | null
          cost?: number
          created_at?: string
          duration_minutes?: number
          id?: string
          name?: string
          owner_id?: string
          price?: number
          profit_margin?: number
          subcategory?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      staff_members: {
        Row: {
          active: boolean
          can_agenda: boolean
          can_cancel_sales: boolean
          can_manage_stock: boolean
          can_pdv: boolean
          can_view_clients: boolean
          can_view_reports: boolean
          can_view_services: boolean
          created_at: string
          email: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          can_agenda?: boolean
          can_cancel_sales?: boolean
          can_manage_stock?: boolean
          can_pdv?: boolean
          can_view_clients?: boolean
          can_view_reports?: boolean
          can_view_services?: boolean
          created_at?: string
          email?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          can_agenda?: boolean
          can_cancel_sales?: boolean
          can_manage_stock?: boolean
          can_pdv?: boolean
          can_view_clients?: boolean
          can_view_reports?: boolean
          can_view_services?: boolean
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          id: string
          movement_type: string
          owner_id: string
          product_id: string
          quantity: number
          reason: string | null
          reference_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          movement_type: string
          owner_id: string
          product_id: string
          quantity: number
          reason?: string | null
          reference_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          movement_type?: string
          owner_id?: string
          product_id?: string
          quantity?: number
          reason?: string | null
          reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_owner_for: { Args: { uid: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_member_of: { Args: { oid: string; uid: string }; Returns: boolean }
      is_owner: { Args: { oid: string; uid: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "owner" | "barber"
      appointment_status:
        | "scheduled"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "no_show"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "owner", "barber"],
      appointment_status: [
        "scheduled",
        "confirmed",
        "in_progress",
        "completed",
        "no_show",
        "cancelled",
      ],
    },
  },
} as const
