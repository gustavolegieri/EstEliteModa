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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      analysis_visual_assets: {
        Row: {
          category: string
          created_at: string | null
          id: string
          image_url: string
          value: string
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          image_url: string
          value: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          image_url?: string
          value?: string
        }
        Relationships: []
      }
      clothing_images: {
        Row: {
          category: string | null
          color: string | null
          created_at: string
          description: string | null
          diagnosis_id: string
          fabric: string | null
          id: string
          image_url: string
          normalized_key: string | null
          piece_key: string
          prompt_used: string | null
          style: string | null
        }
        Insert: {
          category?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          diagnosis_id: string
          fabric?: string | null
          id?: string
          image_url: string
          normalized_key?: string | null
          piece_key: string
          prompt_used?: string | null
          style?: string | null
        }
        Update: {
          category?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          diagnosis_id?: string
          fabric?: string | null
          id?: string
          image_url?: string
          normalized_key?: string | null
          piece_key?: string
          prompt_used?: string | null
          style?: string | null
        }
        Relationships: []
      }
      diagnoses: {
        Row: {
          body_analysis: Json | null
          body_balance_score: Json | null
          body_notes: string | null
          bottom_size: string | null
          capsule_wardrobe: Json | null
          color_analysis: Json | null
          created_at: string | null
          eye_color: string | null
          final_diagnosis: Json | null
          fit_preference: string | null
          formality_level: string | null
          generated_images: Json | null
          hair_color: string | null
          height_cm: number | null
          id: string
          modeling_analysis: Json | null
          photo_back_url: string | null
          photo_face_url: string | null
          photo_front_url: string | null
          photo_side_url: string | null
          processing_step: string | null
          questionnaire: Json | null
          share_token: string | null
          shoe_size: string | null
          skin_tone: string | null
          status: string
          style_analysis: Json | null
          style_intensity_score: Json | null
          top_size: string | null
          updated_at: string | null
          user_id: string
          wardrobe_essentials: Json | null
          weight_kg: number | null
        }
        Insert: {
          body_analysis?: Json | null
          body_balance_score?: Json | null
          body_notes?: string | null
          bottom_size?: string | null
          capsule_wardrobe?: Json | null
          color_analysis?: Json | null
          created_at?: string | null
          eye_color?: string | null
          final_diagnosis?: Json | null
          fit_preference?: string | null
          formality_level?: string | null
          generated_images?: Json | null
          hair_color?: string | null
          height_cm?: number | null
          id?: string
          modeling_analysis?: Json | null
          photo_back_url?: string | null
          photo_face_url?: string | null
          photo_front_url?: string | null
          photo_side_url?: string | null
          processing_step?: string | null
          questionnaire?: Json | null
          share_token?: string | null
          shoe_size?: string | null
          skin_tone?: string | null
          status?: string
          style_analysis?: Json | null
          style_intensity_score?: Json | null
          top_size?: string | null
          updated_at?: string | null
          user_id: string
          wardrobe_essentials?: Json | null
          weight_kg?: number | null
        }
        Update: {
          body_analysis?: Json | null
          body_balance_score?: Json | null
          body_notes?: string | null
          bottom_size?: string | null
          capsule_wardrobe?: Json | null
          color_analysis?: Json | null
          created_at?: string | null
          eye_color?: string | null
          final_diagnosis?: Json | null
          fit_preference?: string | null
          formality_level?: string | null
          generated_images?: Json | null
          hair_color?: string | null
          height_cm?: number | null
          id?: string
          modeling_analysis?: Json | null
          photo_back_url?: string | null
          photo_face_url?: string | null
          photo_front_url?: string | null
          photo_side_url?: string | null
          processing_step?: string | null
          questionnaire?: Json | null
          share_token?: string | null
          shoe_size?: string | null
          skin_tone?: string | null
          status?: string
          style_analysis?: Json | null
          style_intensity_score?: Json | null
          top_size?: string | null
          updated_at?: string | null
          user_id?: string
          wardrobe_essentials?: Json | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      library_assets: {
        Row: {
          attempts: number
          body_type: string
          category: string
          color_season: string
          created_at: string
          id: string
          image_url: string | null
          last_error: string | null
          prompt: string
          source: string | null
          status: string
          style: string
          tags: string[]
          updated_at: string
          variant_index: number
        }
        Insert: {
          attempts?: number
          body_type: string
          category: string
          color_season: string
          created_at?: string
          id?: string
          image_url?: string | null
          last_error?: string | null
          prompt: string
          source?: string | null
          status?: string
          style: string
          tags?: string[]
          updated_at?: string
          variant_index?: number
        }
        Update: {
          attempts?: number
          body_type?: string
          category?: string
          color_season?: string
          created_at?: string
          id?: string
          image_url?: string | null
          last_error?: string | null
          prompt?: string
          source?: string | null
          status?: string
          style?: string
          tags?: string[]
          updated_at?: string
          variant_index?: number
        }
        Relationships: []
      }
      look_images: {
        Row: {
          created_at: string
          diagnosis_id: string
          id: string
          image_url: string
          look_name: string
        }
        Insert: {
          created_at?: string
          diagnosis_id: string
          id?: string
          image_url: string
          look_name: string
        }
        Update: {
          created_at?: string
          diagnosis_id?: string
          id?: string
          image_url?: string
          look_name?: string
        }
        Relationships: []
      }
      look_recommendations: {
        Row: {
          created_at: string
          diagnosis_id: string
          id: string
          image_url: string | null
          look_name: string
          metadata: Json | null
          occasion: string
          occasion_description: string | null
          pieces: Json
          styling_tips: Json | null
        }
        Insert: {
          created_at?: string
          diagnosis_id: string
          id?: string
          image_url?: string | null
          look_name: string
          metadata?: Json | null
          occasion: string
          occasion_description?: string | null
          pieces?: Json
          styling_tips?: Json | null
        }
        Update: {
          created_at?: string
          diagnosis_id?: string
          id?: string
          image_url?: string | null
          look_name?: string
          metadata?: Json | null
          occasion?: string
          occasion_description?: string | null
          pieces?: Json
          styling_tips?: Json | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          payment_method: string | null
          plan_id: string | null
          provider: string
          provider_payment_id: string | null
          provider_preapproval_id: string | null
          raw_payload: Json | null
          status: string
          subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string | null
          plan_id?: string | null
          provider?: string
          provider_payment_id?: string | null
          provider_preapproval_id?: string | null
          raw_payload?: Json | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string | null
          plan_id?: string | null
          provider?: string
          provider_payment_id?: string | null
          provider_preapproval_id?: string | null
          raw_payload?: Json | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          can_download_pdf: boolean
          can_share: boolean
          created_at: string
          currency: string
          description: string | null
          features: Json
          id: string
          interval: string
          is_active: boolean
          is_popular: boolean
          looks_per_month: number
          name: string
          price_cents: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          can_download_pdf?: boolean
          can_share?: boolean
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          interval?: string
          is_active?: boolean
          is_popular?: boolean
          looks_per_month?: number
          name: string
          price_cents?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          can_download_pdf?: boolean
          can_share?: boolean
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          interval?: string
          is_active?: boolean
          is_popular?: boolean
          looks_per_month?: number
          name?: string
          price_cents?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          body_notes: string | null
          body_type: string | null
          bottom_size: string | null
          created_at: string | null
          eye_color: string | null
          fit_preference: string | null
          formality_level: string | null
          full_name: string | null
          hair_color: string | null
          height_cm: number | null
          id: string
          preferences: Json | null
          shoe_size: string | null
          skin_tone: string | null
          top_size: string | null
          updated_at: string | null
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          avatar_url?: string | null
          body_notes?: string | null
          body_type?: string | null
          bottom_size?: string | null
          created_at?: string | null
          eye_color?: string | null
          fit_preference?: string | null
          formality_level?: string | null
          full_name?: string | null
          hair_color?: string | null
          height_cm?: number | null
          id?: string
          preferences?: Json | null
          shoe_size?: string | null
          skin_tone?: string | null
          top_size?: string | null
          updated_at?: string | null
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          avatar_url?: string | null
          body_notes?: string | null
          body_type?: string | null
          bottom_size?: string | null
          created_at?: string | null
          eye_color?: string | null
          fit_preference?: string | null
          formality_level?: string | null
          full_name?: string | null
          hair_color?: string | null
          height_cm?: number | null
          id?: string
          preferences?: Json | null
          shoe_size?: string | null
          skin_tone?: string | null
          top_size?: string | null
          updated_at?: string | null
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          last_payment_date: string | null
          mp_payer_id: string | null
          mp_subscription_id: string | null
          next_billing_date: string | null
          plan: string | null
          plan_id: string | null
          recurring_amount: number | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string | null
          plan_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string | null
          plan_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string
          error: string | null
          event_type: string | null
          headers: Json | null
          id: string
          payload: Json | null
          processed: boolean
          provider: string
          status: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          provider: string
          status?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          provider?: string
          status?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_financial_stats: { Args: never; Returns: Json }
      admin_list_subscriptions: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          last_payment_date: string
          mp_subscription_id: string
          next_billing_date: string
          plan_name: string
          recurring_amount: number
          status: string
          user_id: string
        }[]
      }
      admin_get_stats: { Args: never; Returns: Json }
      admin_growth_series: { Args: never; Returns: Json }
      admin_list_profiles: {
        Args: never
        Returns: {
          avatar_url: string | null
          body_notes: string | null
          body_type: string | null
          bottom_size: string | null
          created_at: string | null
          eye_color: string | null
          fit_preference: string | null
          formality_level: string | null
          full_name: string | null
          hair_color: string | null
          height_cm: number | null
          id: string
          preferences: Json | null
          shoe_size: string | null
          skin_tone: string | null
          top_size: string | null
          updated_at: string | null
          user_id: string
          weight_kg: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_list_users_full: {
        Args: never
        Returns: {
          created_at: string
          diagnoses_count: number
          email: string
          full_name: string
          last_sign_in_at: string
          plan_name: string
          subscription_status: string
          total_spent_cents: number
          user_id: string
        }[]
      }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      get_shared_diagnosis: {
        Args: { _token: string }
        Returns: {
          body_analysis: Json
          capsule_wardrobe: Json
          color_analysis: Json
          created_at: string
          final_diagnosis: Json
          id: string
          modeling_analysis: Json
          style_analysis: Json
          wardrobe_essentials: Json
        }[]
      }
      get_user_plan_access: { Args: { _user_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
