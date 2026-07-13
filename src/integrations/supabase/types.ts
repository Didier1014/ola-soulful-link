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
      customers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string
          purchases_count: number
          total_spent_mzn: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone: string
          purchases_count?: number
          total_spent_mzn?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          purchases_count?: number
          total_spent_mzn?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      integration_logs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          ok: boolean | null
          provider: string
          request_payload: Json | null
          response_body: string | null
          status_code: number | null
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          ok?: boolean | null
          provider: string
          request_payload?: Json | null
          response_body?: string | null
          status_code?: number | null
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          ok?: boolean | null
          provider?: string
          request_payload?: Json | null
          response_body?: string | null
          status_code?: number | null
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      integration_settings: {
        Row: {
          created_at: string
          id: string
          integration_key: string
          mozesms: Json
          push_custom: Json
          pushcut: Json
          settings: Json
          updated_at: string
          user_id: string
          utmify: Json
        }
        Insert: {
          created_at?: string
          id?: string
          integration_key: string
          mozesms?: Json
          push_custom?: Json
          pushcut?: Json
          settings?: Json
          updated_at?: string
          user_id: string
          utmify?: Json
        }
        Update: {
          created_at?: string
          id?: string
          integration_key?: string
          mozesms?: Json
          push_custom?: Json
          pushcut?: Json
          settings?: Json
          updated_at?: string
          user_id?: string
          utmify?: Json
        }
        Relationships: []
      }
      merchant_api_calls: {
        Row: {
          api_key_prefix: string | null
          created_at: string
          duration_ms: number | null
          endpoint: string
          id: string
          ip: string | null
          method: string
          origin: string | null
          origin_host: string | null
          referer: string | null
          status_code: number | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          api_key_prefix?: string | null
          created_at?: string
          duration_ms?: number | null
          endpoint: string
          id?: string
          ip?: string | null
          method: string
          origin?: string | null
          origin_host?: string | null
          referer?: string | null
          status_code?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          api_key_prefix?: string | null
          created_at?: string
          duration_ms?: number | null
          endpoint?: string
          id?: string
          ip?: string | null
          method?: string
          origin?: string | null
          origin_host?: string | null
          referer?: string | null
          status_code?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_links: {
        Row: {
          active: boolean
          amount_mzn: number
          clicks: number
          created_at: string
          description: string | null
          id: string
          payments_count: number
          slug: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          amount_mzn: number
          clicks?: number
          created_at?: string
          description?: string | null
          id?: string
          payments_count?: number
          slug: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          amount_mzn?: number
          clicks?: number
          created_at?: string
          description?: string | null
          id?: string
          payments_count?: number
          slug?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_config: {
        Row: {
          gateway_mode: string
          id: string
          profit_payout_emola: string | null
          profit_payout_mpesa: string | null
          test_mode: string
          updated_at: string
        }
        Insert: {
          gateway_mode?: string
          id?: string
          profit_payout_emola?: string | null
          profit_payout_mpesa?: string | null
          test_mode?: string
          updated_at?: string
        }
        Update: {
          gateway_mode?: string
          id?: string
          profit_payout_emola?: string | null
          profit_payout_mpesa?: string | null
          test_mode?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_clicks: {
        Row: {
          created_at: string
          id: string
          ip_hash: string | null
          product_id: string
          referrer: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_hash?: string | null
          product_id: string
          referrer?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_hash?: string | null
          product_id?: string
          referrer?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_clicks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_history: {
        Row: {
          changed_at: string
          changes: Json
          id: string
          product_id: string
          user_id: string | null
        }
        Insert: {
          changed_at?: string
          changes?: Json
          id?: string
          product_id: string
          user_id?: string | null
        }
        Update: {
          changed_at?: string
          changes?: Json
          id?: string
          product_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          approval_status: string
          config: Json
          cover_url: string | null
          created_at: string
          delivery_url: string | null
          description: string | null
          digital_file_path: string | null
          discount_no_balance: number
          id: string
          lawtracker_id: string | null
          name: string
          pixel_id: string | null
          price_mzn: number
          product_type: string
          rejection_reason: string | null
          slug: string
          sms_sender_id: string | null
          sms_template: string | null
          support_phone: string | null
          thank_you_url: string | null
          updated_at: string
          user_id: string
          utimify_id: string | null
        }
        Insert: {
          active?: boolean
          approval_status?: string
          config?: Json
          cover_url?: string | null
          created_at?: string
          delivery_url?: string | null
          description?: string | null
          digital_file_path?: string | null
          discount_no_balance?: number
          id?: string
          lawtracker_id?: string | null
          name: string
          pixel_id?: string | null
          price_mzn: number
          product_type?: string
          rejection_reason?: string | null
          slug: string
          sms_sender_id?: string | null
          sms_template?: string | null
          support_phone?: string | null
          thank_you_url?: string | null
          updated_at?: string
          user_id: string
          utimify_id?: string | null
        }
        Update: {
          active?: boolean
          approval_status?: string
          config?: Json
          cover_url?: string | null
          created_at?: string
          delivery_url?: string | null
          description?: string | null
          digital_file_path?: string | null
          discount_no_balance?: number
          id?: string
          lawtracker_id?: string | null
          name?: string
          pixel_id?: string | null
          price_mzn?: number
          product_type?: string
          rejection_reason?: string | null
          slug?: string
          sms_sender_id?: string | null
          sms_template?: string | null
          support_phone?: string | null
          thank_you_url?: string | null
          updated_at?: string
          user_id?: string
          utimify_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: string
          api_key: string
          api_key_active: boolean
          balance_mzn: number
          birth_date: string | null
          business_name: string | null
          city: string | null
          created_at: string
          full_name: string | null
          id: string
          is_merchant: boolean
          merchant_fee_fixed: number
          merchant_fee_percent: number
          neighborhood: string | null
          payout_emola_phone: string | null
          payout_mpesa_phone: string | null
          phone: string | null
          province: string | null
          support_phone: string | null
          support_phone2: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          account_type?: string
          api_key?: string
          api_key_active?: boolean
          balance_mzn?: number
          birth_date?: string | null
          business_name?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_merchant?: boolean
          merchant_fee_fixed?: number
          merchant_fee_percent?: number
          neighborhood?: string | null
          payout_emola_phone?: string | null
          payout_mpesa_phone?: string | null
          phone?: string | null
          province?: string | null
          support_phone?: string | null
          support_phone2?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          account_type?: string
          api_key?: string
          api_key_active?: boolean
          balance_mzn?: number
          birth_date?: string | null
          business_name?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_merchant?: boolean
          merchant_fee_fixed?: number
          merchant_fee_percent?: number
          neighborhood?: string | null
          payout_emola_phone?: string | null
          payout_mpesa_phone?: string | null
          phone?: string | null
          province?: string | null
          support_phone?: string | null
          support_phone2?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          invalidated_at: string | null
          last_error: string | null
          p256dh: string
          status: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          invalidated_at?: string | null
          last_error?: string | null
          p256dh: string
          status?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          invalidated_at?: string | null
          last_error?: string | null
          p256dh?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      sale_processing_locks: {
        Row: {
          locked_at: string
          transaction_id: string
        }
        Insert: {
          locked_at?: string
          transaction_id: string
        }
        Update: {
          locked_at?: string
          transaction_id?: string
        }
        Relationships: []
      }
      sms_logs: {
        Row: {
          created_at: string
          id: string
          message: string
          phone: string
          status: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          phone: string
          status?: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          phone?: string
          status?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_logs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount_mzn: number
          created_at: string
          customer_id: string | null
          customer_name: string
          customer_phone: string
          id: string
          interval: string
          next_charge_at: string | null
          plan_name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_mzn: number
          created_at?: string
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          id?: string
          interval?: string
          next_charge_at?: string | null
          plan_name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_mzn?: number
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          id?: string
          interval?: string
          next_charge_at?: string | null
          plan_name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount_mzn: number
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string
          external_ref: string | null
          fee_mzn: number
          id: string
          is_test: boolean
          metadata: Json | null
          method: string
          net_mzn: number
          product_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_mzn: number
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone: string
          external_ref?: string | null
          fee_mzn?: number
          id?: string
          is_test?: boolean
          metadata?: Json | null
          method: string
          net_mzn?: number
          product_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_mzn?: number
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string
          external_ref?: string | null
          fee_mzn?: number
          id?: string
          is_test?: boolean
          metadata?: Json | null
          method?: string
          net_mzn?: number
          product_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_product_id_fkey"
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
          role?: Database["public"]["Enums"]["app_role"]
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
      withdrawals: {
        Row: {
          amount_mzn: number
          created_at: string
          destination: string
          id: string
          method: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_mzn: number
          created_at?: string
          destination: string
          id?: string
          method: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_mzn?: number
          created_at?: string
          destination?: string
          id?: string
          method?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      expire_stuck_pending_transactions: { Args: never; Returns: number }
      gen_api_key: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_balance: {
        Args: { _amount: number; _user_id: string }
        Returns: number
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
