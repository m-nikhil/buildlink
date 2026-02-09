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
      connections: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          recipient_id: string
          recipient_linkedin_requested: boolean | null
          requester_id: string
          requester_linkedin_requested: boolean | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          recipient_id: string
          recipient_linkedin_requested?: boolean | null
          requester_id: string
          requester_linkedin_requested?: boolean | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          recipient_id?: string
          recipient_linkedin_requested?: boolean | null
          requester_id?: string
          requester_linkedin_requested?: boolean | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      daily_swipes: {
        Row: {
          created_at: string | null
          id: string
          last_cursor: string | null
          swipe_count: number | null
          swipe_date: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_cursor?: string | null
          swipe_count?: number | null
          swipe_date?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_cursor?: string | null
          swipe_count?: number | null
          swipe_date?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      dismissed_profiles: {
        Row: {
          created_at: string | null
          dismiss_count: number | null
          dismissed_profile_id: string
          id: string
          last_dismissed_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dismiss_count?: number | null
          dismissed_profile_id: string
          id?: string
          last_dismissed_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dismiss_count?: number | null
          dismissed_profile_id?: string
          id?: string
          last_dismissed_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invitee_email: string | null
          invitee_id: string | null
          inviter_id: string
          referral_code: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invitee_email?: string | null
          invitee_id?: string | null
          inviter_id: string
          referral_code: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invitee_email?: string | null
          invitee_id?: string | null
          inviter_id?: string
          referral_code?: string
          status?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          connection_id: string
          content: string
          created_at: string | null
          id: string
          sender_id: string
        }
        Insert: {
          connection_id: string
          content: string
          created_at?: string | null
          id?: string
          sender_id: string
        }
        Update: {
          connection_id?: string
          content?: string
          created_at?: string | null
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          age_max: number | null
          age_min: number | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string | null
          experience_level: string | null
          full_name: string | null
          headline: string | null
          id: string
          industry: string | null
          industry_other: string | null
          initials: string | null
          is_seed: boolean | null
          last_active: string | null
          linkedin_access_token: string | null
          linkedin_url: string | null
          location: string | null
          looking_for: string[] | null
          looking_for_text: string | null
          preferred_experience_levels: string[] | null
          preferred_goals: string[] | null
          preferred_industries: string[] | null
          preferred_locations: string[] | null
          referral_code: string | null
          referred_by: string | null
          skills: string[] | null
          timezone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          age?: number | null
          age_max?: number | null
          age_min?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          experience_level?: string | null
          full_name?: string | null
          headline?: string | null
          id?: string
          industry?: string | null
          industry_other?: string | null
          initials?: string | null
          is_seed?: boolean | null
          last_active?: string | null
          linkedin_access_token?: string | null
          linkedin_url?: string | null
          location?: string | null
          looking_for?: string[] | null
          looking_for_text?: string | null
          preferred_experience_levels?: string[] | null
          preferred_goals?: string[] | null
          preferred_industries?: string[] | null
          preferred_locations?: string[] | null
          referral_code?: string | null
          referred_by?: string | null
          skills?: string[] | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          age?: number | null
          age_max?: number | null
          age_min?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          experience_level?: string | null
          full_name?: string | null
          headline?: string | null
          id?: string
          industry?: string | null
          industry_other?: string | null
          initials?: string | null
          is_seed?: boolean | null
          last_active?: string | null
          linkedin_access_token?: string | null
          linkedin_url?: string | null
          location?: string | null
          looking_for?: string[] | null
          looking_for_text?: string | null
          preferred_experience_levels?: string[] | null
          preferred_goals?: string[] | null
          preferred_industries?: string[] | null
          preferred_locations?: string[] | null
          referral_code?: string | null
          referred_by?: string | null
          skills?: string[] | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_weekly_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          start_time: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          start_time: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          start_time?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_intros: {
        Row: {
          created_at: string
          id: string
          intro_completed_at: string | null
          match_revealed_at: string | null
          matched_user_id: string
          scheduled_at: string | null
          status: string
          updated_at: string
          user_id: string
          video_call_password: string | null
          video_call_url: string | null
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          intro_completed_at?: string | null
          match_revealed_at?: string | null
          matched_user_id: string
          scheduled_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          video_call_password?: string | null
          video_call_url?: string | null
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          intro_completed_at?: string | null
          match_revealed_at?: string | null
          matched_user_id?: string
          scheduled_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          video_call_password?: string | null
          video_call_url?: string | null
          week_start?: string
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
      connection_goal:
        | "mentorship"
        | "collaboration"
        | "networking"
        | "hiring"
        | "job_seeking"
      experience_level: "entry" | "mid" | "senior" | "executive"
      industry:
        | "tech"
        | "finance"
        | "healthcare"
        | "education"
        | "marketing"
        | "consulting"
        | "other"
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
      connection_goal: [
        "mentorship",
        "collaboration",
        "networking",
        "hiring",
        "job_seeking",
      ],
      experience_level: ["entry", "mid", "senior", "executive"],
      industry: [
        "tech",
        "finance",
        "healthcare",
        "education",
        "marketing",
        "consulting",
        "other",
      ],
    },
  },
} as const
