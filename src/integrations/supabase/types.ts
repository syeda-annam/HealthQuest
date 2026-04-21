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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          seen: boolean
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          seen?: boolean
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          seen?: boolean
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      cycle_logs: {
        Row: {
          bbt: number | null
          created_at: string | null
          flow: string | null
          id: string
          is_period_day: boolean
          logged_date: string
          symptoms: string[] | null
          user_id: string
        }
        Insert: {
          bbt?: number | null
          created_at?: string | null
          flow?: string | null
          id?: string
          is_period_day?: boolean
          logged_date?: string
          symptoms?: string[] | null
          user_id: string
        }
        Update: {
          bbt?: number | null
          created_at?: string | null
          flow?: string | null
          id?: string
          is_period_day?: boolean
          logged_date?: string
          symptoms?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      friends: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string | null
          current_value: number
          id: string
          milestones: Json
          module: string
          start_date: string
          status: string
          target_date: string | null
          target_value: number
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_value?: number
          id?: string
          milestones?: Json
          module: string
          start_date?: string
          status?: string
          target_date?: string | null
          target_value?: number
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_value?: number
          id?: string
          milestones?: Json
          module?: string
          start_date?: string
          status?: string
          target_date?: string | null
          target_value?: number
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      mood_logs: {
        Row: {
          created_at: string | null
          id: string
          journal: string | null
          logged_date: string
          mood: number | null
          stress: number | null
          tags: string[] | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          journal?: string | null
          logged_date?: string
          mood?: number | null
          stress?: number | null
          tags?: string[] | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          journal?: string | null
          logged_date?: string
          mood?: number | null
          stress?: number | null
          tags?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      nutrition_logs: {
        Row: {
          created_at: string | null
          id: string
          logged_date: string
          meals: Json
          total_calories: number
          total_carbs: number
          total_fat: number
          total_protein: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          logged_date?: string
          meals?: Json
          total_calories?: number
          total_carbs?: number
          total_fat?: number
          total_protein?: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          logged_date?: string
          meals?: Json
          total_calories?: number
          total_carbs?: number
          total_fat?: number
          total_protein?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_level: string | null
          biological_sex: string | null
          created_at: string | null
          date_of_birth: string | null
          goal: string | null
          height: number | null
          id: string
          leaderboard_opt_in: boolean
          level: number
          module_cycle: boolean | null
          module_mood: boolean | null
          name: string | null
          profile_complete: boolean | null
          total_xp_earned: number
          units: string | null
          updated_at: string | null
          weight: number | null
          xp: number
        }
        Insert: {
          activity_level?: string | null
          biological_sex?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          goal?: string | null
          height?: number | null
          id: string
          leaderboard_opt_in?: boolean
          level?: number
          module_cycle?: boolean | null
          module_mood?: boolean | null
          name?: string | null
          profile_complete?: boolean | null
          total_xp_earned?: number
          units?: string | null
          updated_at?: string | null
          weight?: number | null
          xp?: number
        }
        Update: {
          activity_level?: string | null
          biological_sex?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          goal?: string | null
          height?: number | null
          id?: string
          leaderboard_opt_in?: boolean
          level?: number
          module_cycle?: boolean | null
          module_mood?: boolean | null
          name?: string | null
          profile_complete?: boolean | null
          total_xp_earned?: number
          units?: string | null
          updated_at?: string | null
          weight?: number | null
          xp?: number
        }
        Relationships: []
      }
      sleep_logs: {
        Row: {
          bedtime: string | null
          created_at: string | null
          duration_hours: number | null
          id: string
          logged_date: string
          notes: string | null
          quality: number | null
          tags: string[] | null
          user_id: string
          wake_time: string | null
        }
        Insert: {
          bedtime?: string | null
          created_at?: string | null
          duration_hours?: number | null
          id?: string
          logged_date?: string
          notes?: string | null
          quality?: number | null
          tags?: string[] | null
          user_id: string
          wake_time?: string | null
        }
        Update: {
          bedtime?: string | null
          created_at?: string | null
          duration_hours?: number | null
          id?: string
          logged_date?: string
          notes?: string | null
          quality?: number | null
          tags?: string[] | null
          user_id?: string
          wake_time?: string | null
        }
        Relationships: []
      }
      streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_logged_date: string | null
          longest_streak: number
          module: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_logged_date?: string | null
          longest_streak?: number
          module: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_logged_date?: string | null
          longest_streak?: number
          module?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      targets: {
        Row: {
          calories: number | null
          carbs: number | null
          fat: number | null
          id: string
          protein: number | null
          sleep: number | null
          updated_at: string | null
          user_id: string
          water: number | null
        }
        Insert: {
          calories?: number | null
          carbs?: number | null
          fat?: number | null
          id?: string
          protein?: number | null
          sleep?: number | null
          updated_at?: string | null
          user_id: string
          water?: number | null
        }
        Update: {
          calories?: number | null
          carbs?: number | null
          fat?: number | null
          id?: string
          protein?: number | null
          sleep?: number | null
          updated_at?: string | null
          user_id?: string
          water?: number | null
        }
        Relationships: []
      }
      user_challenges: {
        Row: {
          challenge_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          current_value: number
          id: string
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          challenge_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_value?: number
          id?: string
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          challenge_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_value?: number
          id?: string
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      water_logs: {
        Row: {
          created_at: string | null
          daily_total: number
          entries: Json
          id: string
          logged_date: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          daily_total?: number
          entries?: Json
          id?: string
          logged_date?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          daily_total?: number
          entries?: Json
          id?: string
          logged_date?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_challenges: {
        Row: {
          challenges: Json
          created_at: string
          id: string
          week_start: string
        }
        Insert: {
          challenges?: Json
          created_at?: string
          id?: string
          week_start: string
        }
        Update: {
          challenges?: Json
          created_at?: string
          id?: string
          week_start?: string
        }
        Relationships: []
      }
      workout_logs: {
        Row: {
          created_at: string | null
          duration: number | null
          exercises: Json
          id: string
          logged_date: string
          notes: string | null
          total_volume: number
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration?: number | null
          exercises?: Json
          id?: string
          logged_date?: string
          notes?: string | null
          total_volume?: number
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration?: number | null
          exercises?: Json
          id?: string
          logged_date?: string
          notes?: string | null
          total_volume?: number
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      workout_templates: {
        Row: {
          created_at: string | null
          exercises: Json
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          exercises?: Json
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          exercises?: Json
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_friends_leaderboard: {
        Args: never
        Returns: {
          badge_count: number
          display_name: string
          level: number
          streak_sum: number
          total_xp_earned: number
          user_id: string
        }[]
      }
      get_global_leaderboard: {
        Args: never
        Returns: {
          badge_count: number
          display_name: string
          level: number
          total_xp_earned: number
          user_id: string
          weekly_xp: number
        }[]
      }
      get_my_global_rank: { Args: never; Returns: number }
      get_pending_friend_requests: {
        Args: never
        Returns: {
          created_at: string
          request_id: string
          sender_id: string
          sender_name: string
        }[]
      }
      search_users_for_friend: {
        Args: { _query: string }
        Returns: {
          display_name: string
          user_id: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
