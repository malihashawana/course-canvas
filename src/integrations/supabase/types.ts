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
      notices: {
        Row: {
          body: string
          created_at: string
          id: string
          published: boolean
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          published?: boolean
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          published?: boolean
          title?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          contact_number: string
          created_at: string
          email: string | null
          id: string
          name: string
          status: string
          stream: string | null
          student_code: string | null
        }
        Insert: {
          contact_number: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          status?: string
          stream?: string | null
          student_code?: string | null
        }
        Update: {
          contact_number?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          status?: string
          stream?: string | null
          student_code?: string | null
        }
        Relationships: []
      }
      tenms_catalog_cache: {
        Row: {
          fetched_at: string
          payload: Json
          product_id: number
          slug: string | null
          title: string | null
        }
        Insert: {
          fetched_at?: string
          payload: Json
          product_id: number
          slug?: string | null
          title?: string | null
        }
        Update: {
          fetched_at?: string
          payload?: Json
          product_id?: number
          slug?: string | null
          title?: string | null
        }
        Relationships: []
      }
      tenms_classes: {
        Row: {
          class_no: number
          course_id: number
          created_at: string
          id: string
          note: string | null
          resource_url: string | null
          scheduled_on: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          class_no?: number
          course_id: number
          created_at?: string
          id?: string
          note?: string | null
          resource_url?: string | null
          scheduled_on?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          class_no?: number
          course_id?: number
          created_at?: string
          id?: string
          note?: string | null
          resource_url?: string | null
          scheduled_on?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenms_classes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "tenms_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      tenms_courses: {
        Row: {
          created_at: string
          id: number
          name_bn: string
          name_en: string
          program_id: number
          thumbnail: string | null
        }
        Insert: {
          created_at?: string
          id: number
          name_bn: string
          name_en: string
          program_id: number
          thumbnail?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          name_bn?: string
          name_en?: string
          program_id?: number
          thumbnail?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenms_courses_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "tenms_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      tenms_programs: {
        Row: {
          catalog_product_id: number
          created_at: string
          id: number
          slug: string | null
          stream: string
          subject_name_bn: string
          subject_name_en: string
        }
        Insert: {
          catalog_product_id: number
          created_at?: string
          id: number
          slug?: string | null
          stream?: string
          subject_name_bn: string
          subject_name_en: string
        }
        Update: {
          catalog_product_id?: number
          created_at?: string
          id?: number
          slug?: string | null
          stream?: string
          subject_name_bn?: string
          subject_name_en?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          author_name: string | null
          author_type: string
          body: string
          created_at: string
          id: string
          ticket_id: string
        }
        Insert: {
          author_name?: string | null
          author_type: string
          body: string
          created_at?: string
          id?: string
          ticket_id: string
        }
        Update: {
          author_name?: string | null
          author_type?: string
          body?: string
          created_at?: string
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          attachment_url: string | null
          category: string
          class_ref: string | null
          course_id: number | null
          created_at: string
          description: string
          id: string
          is_public: boolean
          status: string
          student_id: string
          ticket_no: string
          title: string
          updated_at: string
        }
        Insert: {
          attachment_url?: string | null
          category: string
          class_ref?: string | null
          course_id?: number | null
          created_at?: string
          description: string
          id?: string
          is_public?: boolean
          status?: string
          student_id: string
          ticket_no?: string
          title: string
          updated_at?: string
        }
        Update: {
          attachment_url?: string | null
          category?: string
          class_ref?: string | null
          course_id?: number | null
          created_at?: string
          description?: string
          id?: string
          is_public?: boolean
          status?: string
          student_id?: string
          ticket_no?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "tenms_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
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
