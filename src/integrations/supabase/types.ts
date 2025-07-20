export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
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
          invoice_uploaded_at: string | null
          invoice_uploaded_by: string | null
          invoice_url: string | null
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
          invoice_uploaded_at?: string | null
          invoice_uploaded_by?: string | null
          invoice_url?: string | null
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
          invoice_uploaded_at?: string | null
          invoice_uploaded_by?: string | null
          invoice_url?: string | null
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
          {
            foreignKeyName: "booking_equipment_invoice_uploaded_by_fkey"
            columns: ["invoice_uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          invoice_uploaded_at: string | null
          invoice_uploaded_by: string | null
          invoice_url: string | null
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
          invoice_uploaded_at?: string | null
          invoice_uploaded_by?: string | null
          invoice_url?: string | null
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
          invoice_uploaded_at?: string | null
          invoice_uploaded_by?: string | null
          invoice_url?: string | null
          room_id?: string
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_price?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_invoice_uploaded_by_fkey"
            columns: ["invoice_uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
          complement: string | null
      created_at: string
      id: string
      name: string
      neighborhood: string | null
      number: string | null
      phone: string | null
      state: string | null
      street: string | null
      zip_code: string | null
        }
        Insert: {
            city: string
            complement?: string | null
            created_at?: string
            id?: string
            name: string
            neighborhood?: string | null
            number?: string | null
            phone?: string | null
            state?: string | null
            street?: string | null
            zip_code?: string | null
          }
        Update: {
            city?: string
            complement?: string | null
            created_at?: string
            id?: string
            name?: string
            neighborhood?: string | null
            number?: string | null
            phone?: string | null
            state?: string | null
            street?: string | null
            zip_code?: string | null
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
      change_history: {
        Row: {
          branch_id: string
          changed_fields: string[] | null
          created_at: string
          id: string
          ip_address: unknown | null
          new_data: Json | null
          old_data: Json | null
          operation: string
          record_id: string
          table_name: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_role: string | null
        }
        Insert: {
          branch_id: string
          changed_fields?: string[] | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          record_id: string
          table_name: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Update: {
          branch_id?: string
          changed_fields?: string[] | null
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          record_id?: string
          table_name?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_history_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }

      coupon_usage: {
        Row: {
          booking_id: string | null
          branch_id: string
          coupon_id: string
          created_at: string
          discount_applied: number
          equipment_booking_id: string | null
          id: string
          order_id: string | null
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          branch_id: string
          coupon_id: string
          created_at?: string
          discount_applied: number
          equipment_booking_id?: string | null
          id?: string
          order_id?: string | null
          user_id: string
        }
        Update: {
          booking_id?: string | null
          branch_id?: string
          coupon_id?: string
          created_at?: string
          discount_applied?: number
          equipment_booking_id?: string | null
          id?: string
          order_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          applicable_to: string
          branch_id: string
          code: string
          created_at: string
          created_by: string
          cumulative_with_promotions: boolean | null
          description: string | null
          discount_type: string
          discount_value: number
          first_purchase_only: boolean | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          max_uses_per_user: number | null
          minimum_amount: number | null
          minimum_items: number | null
          name: string
          payment_methods: string[] | null
          specific_items: Json | null
          updated_at: string
          valid_days: number[] | null
          valid_from: string
          valid_hours_end: string | null
          valid_hours_start: string | null
          valid_until: string
        }
        Insert: {
          applicable_to?: string
          branch_id: string
          code: string
          created_at?: string
          created_by: string
          cumulative_with_promotions?: boolean | null
          description?: string | null
          discount_type: string
          discount_value: number
          first_purchase_only?: boolean | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          max_uses_per_user?: number | null
          minimum_amount?: number | null
          minimum_items?: number | null
          name: string
          payment_methods?: string[] | null
          specific_items?: Json | null
          updated_at?: string
          valid_days?: number[] | null
          valid_from: string
          valid_hours_end?: string | null
          valid_hours_start?: string | null
          valid_until: string
        }
        Update: {
          applicable_to?: string
          branch_id?: string
          code?: string
          created_at?: string
          created_by?: string
          cumulative_with_promotions?: boolean | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          first_purchase_only?: boolean | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          max_uses_per_user?: number | null
          minimum_amount?: number | null
          minimum_items?: number | null
          name?: string
          payment_methods?: string[] | null
          specific_items?: Json | null
          updated_at?: string
          valid_days?: number[] | null
          valid_from?: string
          valid_hours_end?: string | null
          valid_hours_start?: string | null
          valid_until?: string
        }
        Relationships: []
      }
      equipment: {
        Row: {
          branch_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          price_per_hour: number
          quantity: number
          updated_at: string | null
        }
        Insert: {
          branch_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price_per_hour: number
          quantity?: number
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
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
            foreignKeyName: "equipment_photos_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
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
          booking_id: string | null
          branch_id: string
          content: string
          created_at: string | null
          id: string
          sender_id: string | null
        }
        Insert: {
          booking_id?: string | null
          branch_id: string
          content: string
          created_at?: string | null
          id?: string
          sender_id?: string
        }
        Update: {
          booking_id?: string | null
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
          click2pay_tid: string | null
          created_at: string | null
          expires_at: string | null
          external_identifier: string | null
          id: string
          invoice_uploaded_at: string | null
          invoice_uploaded_by: string | null
          invoice_url: string | null
          payment_data: Json | null
          payment_method: string | null
          refund_amount: number | null
          refund_date: string | null
          refund_status: string | null
          status: string
          total_amount: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          branch_id: string
          click2pay_tid?: string | null
          created_at?: string | null
          expires_at?: string | null
          external_identifier?: string | null
          id?: string
          invoice_uploaded_at?: string | null
          invoice_uploaded_by?: string | null
          invoice_url?: string | null
          payment_data?: Json | null
          payment_method?: string | null
          refund_amount?: number | null
          refund_date?: string | null
          refund_status?: string | null
          status?: string
          total_amount?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          branch_id?: string
          click2pay_tid?: string | null
          created_at?: string | null
          expires_at?: string | null
          external_identifier?: string | null
          id?: string
          invoice_uploaded_at?: string | null
          invoice_uploaded_by?: string | null
          invoice_url?: string | null
          payment_data?: Json | null
          payment_method?: string | null
          refund_amount?: number | null
          refund_date?: string | null
          refund_status?: string | null
          status?: string
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
          {
            foreignKeyName: "orders_invoice_uploaded_by_fkey"
            columns: ["invoice_uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_details: {
        Row: {
          boleto_barcode: string | null
          boleto_due_date: string | null
          boleto_url: string | null
          card_authorization_code: string | null
          card_transaction_id: string | null
          created_at: string
          id: string
          order_id: string
          payment_method: string
          pix_code: string | null
          pix_expiration: string | null
          pix_qr_code: string | null
          updated_at: string
        }
        Insert: {
          boleto_barcode?: string | null
          boleto_due_date?: string | null
          boleto_url?: string | null
          card_authorization_code?: string | null
          card_transaction_id?: string | null
          created_at?: string
          id?: string
          order_id: string
          payment_method: string
          pix_code?: string | null
          pix_expiration?: string | null
          pix_qr_code?: string | null
          updated_at?: string
        }
        Update: {
          boleto_barcode?: string | null
          boleto_due_date?: string | null
          boleto_url?: string | null
          card_authorization_code?: string | null
          card_transaction_id?: string | null
          created_at?: string
          id?: string
          order_id?: string
          payment_method?: string
          pix_code?: string | null
          pix_expiration?: string | null
          pix_qr_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_details_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
          email: string | null
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
          email?: string | null
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
          email?: string | null
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
          price_per_hour: number
          updated_at: string | null
        }
        Insert: {
          branch_id: string
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
          price_per_hour: number
          updated_at?: string | null
        }
        Update: {
          branch_id?: string
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
      [_ in never]: never
    }
    Enums: {
      booking_status: "in_process" | "paid" | "partial_refunded" | "cancelled" | "pre_authorized" | "recused"
      user_role: "user" | "admin" | "super_admin"
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

type PublicSchema = Database[keyof Database]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
