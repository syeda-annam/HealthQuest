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
          module_cycle: boolean | null
          module_mood: boolean | null
          name: string | null
          profile_complete: boolean | null
          units: string | null
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          activity_level?: string | null
          biological_sex?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          goal?: string | null
          height?: number | null
          id: string
          module_cycle?: boolean | null
          module_mood?: boolean | null
          name?: string | null
          profile_complete?: boolean | null
          units?: string | null
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          activity_level?: string | null
          biological_sex?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          goal?: string | null
          height?: number | null
          id?: string
          module_cycle?: boolean | null
          module_mood?: boolean | null
          name?: string | null
          profile_complete?: boolean | null
          units?: string | null
          updated_at?: string | null
          weight?: number | null
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
      [_ in never]: never
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
