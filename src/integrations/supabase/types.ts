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
      practice_settings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          practice_name: string
          required_choice_count: number
          speech_mode: string
          teacher_code: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          practice_name?: string
          required_choice_count?: number
          speech_mode?: string
          teacher_code?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          practice_name?: string
          required_choice_count?: number
          speech_mode?: string
          teacher_code?: string
        }
        Relationships: []
      }
      runner_answers: {
        Row: {
          answer_text: string
          created_at: string
          id: string
          item_key: string
          student_id: string
          task_id: string
          updated_at: string
        }
        Insert: {
          answer_text?: string
          created_at?: string
          id?: string
          item_key: string
          student_id: string
          task_id: string
          updated_at?: string
        }
        Update: {
          answer_text?: string
          created_at?: string
          id?: string
          item_key?: string
          student_id?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "runner_answers_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runner_answers_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      runner_notes: {
        Row: {
          created_at: string
          id: string
          item_key: string | null
          note: string
          score: number | null
          student_id: string
          task_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_key?: string | null
          note?: string
          score?: number | null
          student_id: string
          task_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_key?: string | null
          note?: string
          score?: number | null
          student_id?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "runner_notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runner_notes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      runner_submissions: {
        Row: {
          id: string
          student_id: string
          submitted_at: string
          task_id: string
        }
        Insert: {
          id?: string
          student_id: string
          submitted_at?: string
          task_id: string
        }
        Update: {
          id?: string
          student_id?: string
          submitted_at?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "runner_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runner_submissions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      spaces: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          subtitle: string
          teacher_code: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          subtitle?: string
          teacher_code?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          subtitle?: string
          teacher_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      student_credentials: {
        Row: {
          created_at: string
          password_hash: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          password_hash: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          password_hash?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_credentials_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_task_speech: {
        Row: {
          allowed: boolean
          created_at: string
          id: string
          student_id: string
          task_id: string
          updated_at: string
        }
        Insert: {
          allowed?: boolean
          created_at?: string
          id?: string
          student_id: string
          task_id: string
          updated_at?: string
        }
        Update: {
          allowed?: boolean
          created_at?: string
          id?: string
          student_id?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_task_speech_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_task_speech_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          class_name: string | null
          class_slug: string | null
          created_at: string
          first_name: string
          id: string
          last_name: string
          mode: string
          must_reset_password: boolean
          speech_enabled: boolean
          updated_at: string
        }
        Insert: {
          class_name?: string | null
          class_slug?: string | null
          created_at?: string
          first_name: string
          id?: string
          last_name: string
          mode?: string
          must_reset_password?: boolean
          speech_enabled?: boolean
          updated_at?: string
        }
        Update: {
          class_name?: string | null
          class_slug?: string | null
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          mode?: string
          must_reset_password?: boolean
          speech_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          article_title: string | null
          class_slug: string | null
          closes_at: string | null
          created_at: string
          definition: Json | null
          description: string
          engine: string
          footnote: string | null
          grading_mode: string
          help_sections: Json
          id: string
          is_active: boolean
          kind: string
          max_points: number
          opens_at: string | null
          paragraphs: Json
          published_at: string | null
          sort_order: number
          source_id: string | null
          source_note: string | null
          space_id: string | null
          task_parts: Json
          title: string
          updated_at: string
        }
        Insert: {
          article_title?: string | null
          class_slug?: string | null
          closes_at?: string | null
          created_at?: string
          definition?: Json | null
          description?: string
          engine?: string
          footnote?: string | null
          grading_mode?: string
          help_sections?: Json
          id?: string
          is_active?: boolean
          kind: string
          max_points?: number
          opens_at?: string | null
          paragraphs?: Json
          published_at?: string | null
          sort_order?: number
          source_id?: string | null
          source_note?: string | null
          space_id?: string | null
          task_parts?: Json
          title: string
          updated_at?: string
        }
        Update: {
          article_title?: string | null
          class_slug?: string | null
          closes_at?: string | null
          created_at?: string
          definition?: Json | null
          description?: string
          engine?: string
          footnote?: string | null
          grading_mode?: string
          help_sections?: Json
          id?: string
          is_active?: boolean
          kind?: string
          max_points?: number
          opens_at?: string | null
          paragraphs?: Json
          published_at?: string | null
          sort_order?: number
          source_id?: string | null
          source_note?: string | null
          space_id?: string | null
          task_parts?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      student_clear_password: {
        Args: { p_student_id: string; p_teacher_code: string }
        Returns: Json
      }
      student_login: {
        Args: { p_password: string; p_student_id: string }
        Returns: Json
      }
      student_register: {
        Args: {
          p_class_name: string
          p_class_slug: string
          p_first_name: string
          p_last_name: string
          p_mode?: string
          p_password: string
          p_speech_enabled?: boolean
        }
        Returns: Json
      }
      student_set_password: {
        Args: { p_password: string; p_student_id: string }
        Returns: Json
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
