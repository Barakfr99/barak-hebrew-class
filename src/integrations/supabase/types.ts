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
          answer_text: string
          created_at: string
          id: string
          question_id: string
          student_id: string
          task_id: string
          updated_at: string
        }
        Insert: {
          answer_text?: string
          created_at?: string
          id?: string
          question_id: string
          student_id: string
          task_id: string
          updated_at?: string
        }
        Update: {
          answer_text?: string
          created_at?: string
          id?: string
          question_id?: string
          student_id?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          clarity_scale: number | null
          compare_lesson: string | null
          created_at: string
          help_page_usage: string | null
          id: string
          learning_scale: number | null
          still_unclear: string | null
          student_id: string
          task_id: string | null
        }
        Insert: {
          clarity_scale?: number | null
          compare_lesson?: string | null
          created_at?: string
          help_page_usage?: string | null
          id?: string
          learning_scale?: number | null
          still_unclear?: string | null
          student_id: string
          task_id?: string | null
        }
        Update: {
          clarity_scale?: number | null
          compare_lesson?: string | null
          created_at?: string
          help_page_usage?: string | null
          id?: string
          learning_scale?: number | null
          still_unclear?: string | null
          student_id?: string
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
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
      questions: {
        Row: {
          created_at: string
          group_label: string | null
          id: string
          input_size: string
          kind: string
          note: Json | null
          options: Json
          paragraph_refs: Json
          parent_key: string | null
          part_id: string | null
          passage: string | null
          points: number | null
          prompt: string
          sort_order: number
          task_id: string
          weight: number | null
        }
        Insert: {
          created_at?: string
          group_label?: string | null
          id?: string
          input_size?: string
          kind: string
          note?: Json | null
          options?: Json
          paragraph_refs?: Json
          parent_key?: string | null
          part_id?: string | null
          passage?: string | null
          points?: number | null
          prompt: string
          sort_order?: number
          task_id: string
          weight?: number | null
        }
        Update: {
          created_at?: string
          group_label?: string | null
          id?: string
          input_size?: string
          kind?: string
          note?: Json | null
          options?: Json
          paragraph_refs?: Json
          parent_key?: string | null
          part_id?: string | null
          passage?: string | null
          points?: number | null
          prompt?: string
          sort_order?: number
          task_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
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
          choice_slot_1_task_id: string | null
          choice_slot_2_task_id: string | null
          class_name: string | null
          class_slug: string | null
          created_at: string
          finished_at: string | null
          first_name: string
          grade_choice_1: number | null
          grade_choice_2: number | null
          grade_required: number | null
          id: string
          last_name: string
          mode: string
          must_reset_password: boolean
          speech_enabled: boolean
          stage: string
          updated_at: string
        }
        Insert: {
          choice_slot_1_task_id?: string | null
          choice_slot_2_task_id?: string | null
          class_name?: string | null
          class_slug?: string | null
          created_at?: string
          finished_at?: string | null
          first_name: string
          grade_choice_1?: number | null
          grade_choice_2?: number | null
          grade_required?: number | null
          id?: string
          last_name: string
          mode?: string
          must_reset_password?: boolean
          speech_enabled?: boolean
          stage?: string
          updated_at?: string
        }
        Update: {
          choice_slot_1_task_id?: string | null
          choice_slot_2_task_id?: string | null
          class_name?: string | null
          class_slug?: string | null
          created_at?: string
          finished_at?: string | null
          first_name?: string
          grade_choice_1?: number | null
          grade_choice_2?: number | null
          grade_required?: number | null
          id?: string
          last_name?: string
          mode?: string
          must_reset_password?: boolean
          speech_enabled?: boolean
          stage?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_choice_slot_1_task_id_fkey"
            columns: ["choice_slot_1_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_choice_slot_2_task_id_fkey"
            columns: ["choice_slot_2_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_completions: {
        Row: {
          completed_at: string
          id: string
          student_id: string
          task_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          student_id: string
          task_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          student_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_completions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_grades: {
        Row: {
          created_at: string
          grade: number | null
          id: string
          student_id: string
          task_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          grade?: number | null
          id?: string
          student_id: string
          task_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          grade?: number | null
          id?: string
          student_id?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_grades_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          article_title: string | null
          class_slug: string | null
          closes_at: string | null
          created_at: string
          description: string
          footnote: string | null
          grading_mode: string
          help_sections: Json
          id: string
          is_active: boolean
          kind: string
          max_points: number
          opens_at: string | null
          paragraphs: Json
          sort_order: number
          source_note: string | null
          task_parts: Json
          title: string
        }
        Insert: {
          article_title?: string | null
          class_slug?: string | null
          closes_at?: string | null
          created_at?: string
          description?: string
          footnote?: string | null
          grading_mode?: string
          help_sections?: Json
          id?: string
          is_active?: boolean
          kind: string
          max_points?: number
          opens_at?: string | null
          paragraphs?: Json
          sort_order?: number
          source_note?: string | null
          task_parts?: Json
          title: string
        }
        Update: {
          article_title?: string | null
          class_slug?: string | null
          closes_at?: string | null
          created_at?: string
          description?: string
          footnote?: string | null
          grading_mode?: string
          help_sections?: Json
          id?: string
          is_active?: boolean
          kind?: string
          max_points?: number
          opens_at?: string | null
          paragraphs?: Json
          sort_order?: number
          source_note?: string | null
          task_parts?: Json
          title?: string
        }
        Relationships: []
      }
      teacher_notes: {
        Row: {
          created_at: string
          id: string
          note: string
          question_id: string | null
          score: number | null
          student_id: string
          task_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string
          question_id?: string | null
          score?: number | null
          student_id: string
          task_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string
          question_id?: string | null
          score?: number | null
          student_id?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_notes_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_notes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
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
