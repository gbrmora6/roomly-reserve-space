export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_logs: {
        Row: {
          action: string | null
          admin_email: string | null
          admin_id: string | null
          branch_id: string
          created_at: string | null
          details: Json | null
          id: string
        }
        Insert: {
          action?: string | null
          admin_email?: string | null
          admin_id?: string | null
          branch_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
        }
        Update: {
          action?: string | null
          admin_email?: string | null
          admin_id?: string | null
          branch_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_equipment: {
        Row: {
          booking_id: string | null
          branch_id: string
          created_at: string | null
          end_time: string
          equipment_id: string
          id: string
          quantity: number
          start_time: string
          status: Database["public"]["Enums"]["booking_status"] | null
          total_price: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          branch_id: string
          created_at?: string | null
          end_time: string
          equipment_id: string
          id?: string
          quantity?: number
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_price?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          booking_id?: string | null
          branch_id?: string
          created_at?: string | null
          end_time?: string
          equipment_id?: string
          id?: string
          quantity?: number
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_price?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_equipment_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_equipment_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          branch_id: string
          created_at: string | null
          end_time: string
          id: string
          room_id: string
          start_time: string
          status: Database["public"]["Enums"]["booking_status"] | null
          total_price: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          end_time: string
          id?: string
          room_id: string
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_price?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          end_time?: string
          id?: string
          room_id?: string
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_price?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          city: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          city: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          branch_id: string
          created_at: string
          expires_at: string | null
          id: string
          item_id: string
          item_type: string
          metadata: Json
          price: number
          quantity: number
          reserved_booking_id: string | null
          reserved_equipment_booking_id: string | null
          user_id: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          item_id: string
          item_type: string
          metadata?: Json
          price: number
          quantity: number
          reserved_booking_id?: string | null
          reserved_equipment_booking_id?: string | null
          user_id?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          item_id?: string
          item_type?: string
          metadata?: Json
          price?: number
          quantity?: number
          reserved_booking_id?: string | null
          reserved_equipment_booking_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_reserved_booking_id_fkey"
            columns: ["reserved_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_reserved_equipment_booking_id_fkey"
            columns: ["reserved_equipment_booking_id"]
            isOneToOne: false
            referencedRelation: "booking_equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      company_profile: {
        Row: {
          branch_id: string
          city: string | null
          id: string
          name: string | null
          neighborhood: string | null
          number: string | null
          street: string | null
        }
        Insert: {
          branch_id: string
          city?: string | null
          id?: string
          name?: string | null
          neighborhood?: string | null
          number?: string | null
          street?: string | null
        }
        Update: {
          branch_id?: string
          city?: string | null
          id?: string
          name?: string | null
          neighborhood?: string | null
          number?: string | null
          street?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_profile_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          branch_id: string
          close_time: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          open_days: Database["public"]["Enums"]["weekday"][] | null
          open_time: string | null
          price_per_hour: number
          quantity: number
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          close_time?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          open_days?: Database["public"]["Enums"]["weekday"][] | null
          open_time?: string | null
          price_per_hour: number
          quantity?: number
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          close_time?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          open_days?: Database["public"]["Enums"]["weekday"][] | null
          open_time?: string | null
          price_per_hour?: number
          quantity?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      equipment_availability: {
        Row: {
          branch_id: string
          created_at: string | null
          end_time: string
          equipment_id: string
          id: string
          start_time: string
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          end_time: string
          equipment_id: string
          id?: string
          start_time: string
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          end_time?: string
          equipment_id?: string
          id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_availability_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_availability_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_photos: {
        Row: {
          branch_id: string
          created_at: string | null
          equipment_id: string
          id: string
          url: string
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          equipment_id: string
          id?: string
          url: string
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          equipment_id?: string
          id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_photos_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_schedules: {
        Row: {
          branch_id: string
          created_at: string | null
          end_time: string
          equipment_id: string
          id: string
          start_time: string
          updated_at: string | null
          weekday: Database["public"]["Enums"]["weekday"]
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          end_time: string
          equipment_id: string
          id?: string
          start_time: string
          updated_at?: string | null
          weekday: Database["public"]["Enums"]["weekday"]
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          end_time?: string
          equipment_id?: string
          id?: string
          start_time?: string
          updated_at?: string | null
          weekday?: Database["public"]["Enums"]["weekday"]
        }
        Relationships: [
          {
            foreignKeyName: "equipment_schedules_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_schedules_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          booking_id: string
          branch_id: string
          content: string
          created_at: string | null
          id: string
          sender_id: string
        }
        Insert: {
          booking_id: string
          branch_id: string
          content: string
          created_at?: string | null
          id?: string
          sender_id: string
        }
        Update: {
          booking_id?: string
          branch_id?: string
          content?: string
          created_at?: string | null
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          branch_id: string
          created_at: string | null
          id: string
          order_id: string
          price_per_unit: number
          product_id: string
          quantity: number
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          id?: string
          order_id: string
          price_per_unit: number
          product_id: string
          quantity?: number
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          id?: string
          order_id?: string
          price_per_unit?: number
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          branch_id: string
          created_at: string | null
          id: string
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          total_amount: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          id?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          total_amount?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          id?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          total_amount?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_orders_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_photos: {
        Row: {
          branch_id: string
          created_at: string | null
          id: string
          product_id: string
          url: string
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          id?: string
          product_id: string
          url: string
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          id?: string
          product_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_photos_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          branch_id: string
          created_at: string | null
          description: string | null
          equipment_id: string | null
          id: string
          is_active: boolean | null
          model: string | null
          name: string
          price: number
          quantity: number
          stripe_price_id: string | null
          stripe_product_id: string | null
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          description?: string | null
          equipment_id?: string | null
          id?: string
          is_active?: boolean | null
          model?: string | null
          name: string
          price: number
          quantity?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          description?: string | null
          equipment_id?: string | null
          id?: string
          is_active?: boolean | null
          model?: string | null
          name?: string
          price?: number
          quantity?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          branch_id: string | null
          cep: string | null
          city: string | null
          cnpj: string | null
          cpf: string | null
          created_at: string | null
          crp: string | null
          first_name: string | null
          house_number: string | null
          id: string
          last_name: string | null
          neighborhood: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          specialty: string | null
          state: string | null
          street: string | null
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          cep?: string | null
          city?: string | null
          cnpj?: string | null
          cpf?: string | null
          created_at?: string | null
          crp?: string | null
          first_name?: string | null
          house_number?: string | null
          id: string
          last_name?: string | null
          neighborhood?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          specialty?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          cep?: string | null
          city?: string | null
          cnpj?: string | null
          cpf?: string | null
          created_at?: string | null
          crp?: string | null
          first_name?: string | null
          house_number?: string | null
          id?: string
          last_name?: string | null
          neighborhood?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          specialty?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      room_availability: {
        Row: {
          branch_id: string
          created_at: string | null
          end_time: string
          id: string
          room_id: string
          start_time: string
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          end_time: string
          id?: string
          room_id: string
          start_time: string
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          end_time?: string
          id?: string
          room_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_availability_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_availability_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_photos: {
        Row: {
          branch_id: string
          created_at: string | null
          id: string
          room_id: string
          url: string
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          id?: string
          room_id: string
          url: string
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          id?: string
          room_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_photos_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_photos_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_schedules: {
        Row: {
          branch_id: string
          created_at: string | null
          end_time: string
          id: string
          room_id: string
          start_time: string
          updated_at: string | null
          weekday: Database["public"]["Enums"]["weekday"]
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          end_time: string
          id?: string
          room_id: string
          start_time: string
          updated_at?: string | null
          weekday: Database["public"]["Enums"]["weekday"]
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          end_time?: string
          id?: string
          room_id?: string
          start_time?: string
          updated_at?: string | null
          weekday?: Database["public"]["Enums"]["weekday"]
        }
        Relationships: [
          {
            foreignKeyName: "room_schedules_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_schedules_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          branch_id: string
          close_time: string | null
          created_at: string | null
          description: string | null
          has_ac: boolean | null
          has_chairs: boolean | null
          has_private_bathroom: boolean | null
          has_tables: boolean | null
          has_tv: boolean | null
          has_wifi: boolean | null
          id: string
          is_active: boolean | null
          name: string
          open_days: number[] | null
          open_time: string | null
          price_per_hour: number
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          close_time?: string | null
          created_at?: string | null
          description?: string | null
          has_ac?: boolean | null
          has_chairs?: boolean | null
          has_private_bathroom?: boolean | null
          has_tables?: boolean | null
          has_tv?: boolean | null
          has_wifi?: boolean | null
          id?: string
          is_active?: boolean | null
          name: string
          open_days?: number[] | null
          open_time?: string | null
          price_per_hour: number
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          close_time?: string | null
          created_at?: string | null
          description?: string | null
          has_ac?: boolean | null
          has_chairs?: boolean | null
          has_private_bathroom?: boolean | null
          has_tables?: boolean | null
          has_tv?: boolean | null
          has_wifi?: boolean | null
          id?: string
          is_active?: boolean | null
          name?: string
          open_days?: number[] | null
          open_time?: string | null
          price_per_hour?: number
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_to_cart: {
        Args: {
          p_user_id: string
          p_item_type: string
          p_item_id: string
          p_quantity: number
          p_metadata: Json
        }
        Returns: {
          branch_id: string
          created_at: string
          expires_at: string | null
          id: string
          item_id: string
          item_type: string
          metadata: Json
          price: number
          quantity: number
          reserved_booking_id: string | null
          reserved_equipment_booking_id: string | null
          user_id: string | null
        }
      }
      clean_expired_cart_items: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      confirm_cart_payment: {
        Args: { p_user_id: string; p_order_id: string }
        Returns: boolean
      }
      get_cart: {
        Args: { p_user_id: string }
        Returns: {
          branch_id: string
          created_at: string
          expires_at: string | null
          id: string
          item_id: string
          item_type: string
          metadata: Json
          price: number
          quantity: number
          reserved_booking_id: string | null
          reserved_equipment_booking_id: string | null
          user_id: string | null
        }[]
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      booking_status:
        | "pending"
        | "confirmed"
        | "cancelled"
        | "cancelled_unpaid"
        | "pago"
        | "falta pagar"
        | "cancelado por falta de pagamento"
      user_role: "admin" | "client" | "superadmin" | "super_admin"
      weekday:
        | "monday"
        | "tuesday"
        | "wednesday"
        | "thursday"
        | "friday"
        | "saturday"
        | "sunday"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      booking_status: [
        "pending",
        "confirmed",
        "cancelled",
        "cancelled_unpaid",
        "pago",
        "falta pagar",
        "cancelado por falta de pagamento",
      ],
      user_role: ["admin", "client", "superadmin", "super_admin"],
      weekday: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
    },
  },
} as const
