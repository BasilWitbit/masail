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
      answers: {
        Row: {
          tenant_id: string | null
          body: string
          created_at: string
          id: string
          question_id: string
          shaykh_id: string
          status: Database["public"]["Enums"]["answer_status"]
          updated_at: string
        }
        Insert: {
          tenant_id?: string | null
          body: string
          created_at?: string
          id?: string
          question_id: string
          shaykh_id: string
          status?: Database["public"]["Enums"]["answer_status"]
          updated_at?: string
        }
        Update: {
          tenant_id?: string | null
          body?: string
          created_at?: string
          id?: string
          question_id?: string
          shaykh_id?: string
          status?: Database["public"]["Enums"]["answer_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "answers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: true
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_shaykh_id_fkey"
            columns: ["shaykh_id"]
            isOneToOne: false
            referencedRelation: "shaykhs"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          tenant_id: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          tenant_id?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          tenant_id?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          tenant_id: string | null
          comment: string | null
          created_at: string
          id: string
          is_helpful: boolean
          question_id: string
          user_id: string
        }
        Insert: {
          tenant_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          is_helpful: boolean
          question_id: string
          user_id: string
        }
        Update: {
          tenant_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          is_helpful?: boolean
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mosques: {
        Row: {
          tenant_id: string
          address: string
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          id: string
          name: string
          slug: string | null
        }
        Insert: {
          tenant_id?: string | null
          address: string
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name: string
          slug?: string | null
        }
        Update: {
          tenant_id?: string | null
          address?: string
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name?: string
          slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mosques_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          tenant_id: string | null
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          related_question_id: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          tenant_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          related_question_id?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          tenant_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          related_question_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_question_id_fkey"
            columns: ["related_question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      peer_reviews: {
        Row: {
          tenant_id: string | null
          answer_id: string
          comments: string | null
          created_at: string
          decision: Database["public"]["Enums"]["review_decision"]
          id: string
          reviewer_shaykh_id: string
        }
        Insert: {
          tenant_id?: string | null
          answer_id: string
          comments?: string | null
          created_at?: string
          decision: Database["public"]["Enums"]["review_decision"]
          id?: string
          reviewer_shaykh_id: string
        }
        Update: {
          tenant_id?: string | null
          answer_id?: string
          comments?: string | null
          created_at?: string
          decision?: Database["public"]["Enums"]["review_decision"]
          id?: string
          reviewer_shaykh_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_reviews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_reviews_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_reviews_reviewer_shaykh_id_fkey"
            columns: ["reviewer_shaykh_id"]
            isOneToOne: false
            referencedRelation: "shaykhs"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          tenant_id: string | null
          body_font: string
          heading_font: string
          id: string
          logo_url: string | null
          mosque_id: string | null
          primary_color: string
          secondary_color: string
          updated_at: string
        }
        Insert: {
          tenant_id?: string | null
          body_font?: string
          heading_font?: string
          id?: string
          logo_url?: string | null
          mosque_id?: string | null
          primary_color?: string
          secondary_color?: string
          updated_at?: string
        }
        Update: {
          tenant_id?: string | null
          body_font?: string
          heading_font?: string
          id?: string
          logo_url?: string | null
          mosque_id?: string | null
          primary_color?: string
          secondary_color?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_settings_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: true
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          tenant_id: string | null
          approval_status: Database["public"]["Enums"]["approval_status"]
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          mosque_id: string | null
          must_change_password: boolean
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          tenant_id?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          mosque_id?: string | null
          must_change_password?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          tenant_id?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          mosque_id?: string | null
          must_change_password?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
        ]
      }
      published_qa: {
        Row: {
          tenant_id: string | null
          category_id: string | null
          created_at: string
          generic_answer: string
          generic_question: string
          id: string
          mosque_id: string | null
          published_by_shaykh_id: string
          question_id: string
        }
        Insert: {
          tenant_id?: string | null
          category_id?: string | null
          created_at?: string
          generic_answer: string
          generic_question: string
          id?: string
          mosque_id?: string | null
          published_by_shaykh_id: string
          question_id: string
        }
        Update: {
          tenant_id?: string | null
          category_id?: string | null
          created_at?: string
          generic_answer?: string
          generic_question?: string
          id?: string
          mosque_id?: string | null
          published_by_shaykh_id?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "published_qa_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "published_qa_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "published_qa_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "published_qa_published_by_shaykh_id_fkey"
            columns: ["published_by_shaykh_id"]
            isOneToOne: false
            referencedRelation: "shaykhs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "published_qa_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          tenant_id: string | null
          asker_id: string | null
          attachment_urls: string[] | null
          body: string
          category_id: string | null
          claimed_by: string | null
          created_at: string
          id: string
          is_anonymous: boolean
          is_private: boolean
          is_urgent: boolean
          mosque_id: string
          status: Database["public"]["Enums"]["question_status"]
          title: string | null
          updated_at: string
        }
        Insert: {
          tenant_id?: string | null
          asker_id?: string | null
          attachment_urls?: string[] | null
          body: string
          category_id?: string | null
          claimed_by?: string | null
          created_at?: string
          id?: string
          is_anonymous?: boolean
          is_private?: boolean
          is_urgent?: boolean
          mosque_id: string
          status?: Database["public"]["Enums"]["question_status"]
          title?: string | null
          updated_at?: string
        }
        Update: {
          tenant_id?: string | null
          asker_id?: string | null
          attachment_urls?: string[] | null
          body?: string
          category_id?: string | null
          claimed_by?: string | null
          created_at?: string
          id?: string
          is_anonymous?: boolean
          is_private?: boolean
          is_urgent?: boolean
          mosque_id?: string
          status?: Database["public"]["Enums"]["question_status"]
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_asker_id_fkey"
            columns: ["asker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "shaykhs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          tenant_id: string | null
          created_at: string
          id: string
          notes: string | null
          question_id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reported_by_shaykh_id: string
        }
        Insert: {
          tenant_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          question_id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reported_by_shaykh_id: string
        }
        Update: {
          tenant_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          question_id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reported_by_shaykh_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_by_shaykh_id_fkey"
            columns: ["reported_by_shaykh_id"]
            isOneToOne: false
            referencedRelation: "shaykhs"
            referencedColumns: ["id"]
          },
        ]
      }
      shaykhs: {
        Row: {
          tenant_id: string | null
          created_at: string
          id: string
          is_active: boolean
          mosque_id: string
          profile_id: string
        }
        Insert: {
          tenant_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          mosque_id: string
          profile_id: string
        }
        Update: {
          tenant_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          mosque_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shaykhs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shaykhs_mosque_id_fkey"
            columns: ["mosque_id"]
            isOneToOne: false
            referencedRelation: "mosques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shaykhs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
          target_table: string | null
          tenant_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_table?: string | null
          tenant_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_table?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          body_font: string
          created_at: string
          created_by: string | null
          deactivated_at: string | null
          deactivated_by: string | null
          heading_font: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          primary_color: string
          secondary_color: string
          slug: string
          updated_at: string
        }
        Insert: {
          body_font?: string
          created_at?: string
          created_by?: string | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          heading_font?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          primary_color?: string
          secondary_color?: string
          slug: string
          updated_at?: string
        }
        Update: {
          body_font?: string
          created_at?: string
          created_by?: string | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          heading_font?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          primary_color?: string
          secondary_color?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_deactivated_by_fkey"
            columns: ["deactivated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_branding: {
        Args: never
        Returns: {
          body_font: string
          heading_font: string
          logo_url: string
          primary_color: string
          secondary_color: string
          source: string
        }[]
      }
      get_platform_branding: {
        Args: never
        Returns: {
          body_font: string
          heading_font: string
          logo_url: string
          primary_color: string
          secondary_color: string
        }[]
      }
      is_ssa: { Args: never; Returns: boolean }
      list_active_signup_mosques: {
        Args: never
        Returns: {
          mosque_id: string
          mosque_name: string
          mosque_slug: string
          tenant_id: string
          tenant_name: string
          tenant_slug: string
        }[]
      }
      my_tenant_id: { Args: never; Returns: string }
      my_tenant_is_active: { Args: never; Returns: boolean }
      resolve_mosque_by_slug: {
        Args: { p_mosque_slug: string }
        Returns: {
          body_font: string
          heading_font: string
          logo_url: string
          mosque_id: string
          mosque_name: string
          mosque_slug: string
          primary_color: string
          secondary_color: string
          tenant_id: string
          tenant_name: string
          tenant_slug: string
        }[]
      }
      resolve_mosque_by_slugs: {
        Args: { p_mosque_slug: string; p_tenant_slug: string }
        Returns: {
          body_font: string
          heading_font: string
          logo_url: string
          mosque_id: string
          mosque_name: string
          mosque_slug: string
          primary_color: string
          secondary_color: string
          tenant_id: string
          tenant_name: string
          tenant_slug: string
        }[]
      }
      tenant_is_active: { Args: { p_tenant_id: string }; Returns: boolean }
      mosque_in_my_tenant: { Args: { p_mosque_id: string }; Returns: boolean }
      get_my_effective_mosque_id: { Args: never; Returns: string }
      get_my_mosque_id: { Args: never; Returns: string }
      get_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      answer_status:
        | "draft"
        | "submitted"
        | "under_peer_review"
        | "peer_approved"
        | "sent_to_user"
      approval_status: "pending_approval" | "approved" | "rejected"
      notification_type:
        | "question_answered"
        | "question_rejected"
        | "answer_approved"
        | "answer_needs_revision"
        | "question_reported"
      question_status:
        | "submitted"
        | "in_pool"
        | "claimed"
        | "pending_peer_review"
        | "peer_approved"
        | "sent_to_user"
        | "reported"
        | "approved_for_publishing"
        | "published"
        | "rejected"
        | "needs_revision"
      report_reason: "spam" | "abusive" | "other"
      review_decision: "approved" | "sent_back"
      user_role:
        | "user"
        | "shaykh"
        | "mosque_admin"
        | "super_admin"
        | "super_super_admin"
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
      answer_status: [
        "draft",
        "submitted",
        "under_peer_review",
        "peer_approved",
        "sent_to_user",
      ],
      approval_status: ["pending_approval", "approved", "rejected"],
      notification_type: [
        "question_answered",
        "question_rejected",
        "answer_approved",
        "answer_needs_revision",
        "question_reported",
      ],
      question_status: [
        "submitted",
        "in_pool",
        "claimed",
        "pending_peer_review",
        "peer_approved",
        "sent_to_user",
        "reported",
        "approved_for_publishing",
        "published",
        "rejected",
        "needs_revision",
      ],
      report_reason: ["spam", "abusive", "other"],
      review_decision: ["approved", "sent_back"],
      user_role: [
        "user",
        "shaykh",
        "mosque_admin",
        "super_admin",
        "super_super_admin",
      ],
    },
  },
} as const
