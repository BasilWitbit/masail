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
          body: string
          created_at: string
          id: string
          question_id: string
          shaykh_id: string
          status: Database["public"]["Enums"]["answer_status"]
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          question_id: string
          shaykh_id: string
          status?: Database["public"]["Enums"]["answer_status"]
          updated_at?: string
        }
        Update: {
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
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          is_helpful: boolean
          question_id: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          is_helpful: boolean
          question_id: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          is_helpful?: boolean
          question_id?: string
          user_id?: string
        }
        Relationships: [
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
          address: string
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          address: string
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          address?: string
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      peer_reviews: {
        Row: {
          answer_id: string
          comments: string | null
          created_at: string
          decision: Database["public"]["Enums"]["review_decision"]
          id: string
          reviewer_shaykh_id: string
        }
        Insert: {
          answer_id: string
          comments?: string | null
          created_at?: string
          decision: Database["public"]["Enums"]["review_decision"]
          id?: string
          reviewer_shaykh_id: string
        }
        Update: {
          answer_id?: string
          comments?: string | null
          created_at?: string
          decision?: Database["public"]["Enums"]["review_decision"]
          id?: string
          reviewer_shaykh_id?: string
        }
        Relationships: [
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
          body_font: string
          heading_font: string
          id: string
          logo_url: string | null
          primary_color: string
          secondary_color: string
          updated_at: string
        }
        Insert: {
          body_font?: string
          heading_font?: string
          id?: string
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          updated_at?: string
        }
        Update: {
          body_font?: string
          heading_font?: string
          id?: string
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
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
          created_at: string
          id: string
          notes: string | null
          question_id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reported_by_shaykh_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          question_id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reported_by_shaykh_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          question_id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reported_by_shaykh_id?: string
        }
        Relationships: [
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
          created_at: string
          id: string
          is_active: boolean
          mosque_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          mosque_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          mosque_id?: string
          profile_id?: string
        }
        Relationships: [
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      user_role: "user" | "shaykh" | "mosque_admin" | "super_admin"
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
      user_role: ["user", "shaykh", "mosque_admin", "super_admin"],
    },
  },
} as const
