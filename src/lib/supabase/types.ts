// AVOID UPDATING THIS FILE DIRECTLY. It is automatically generated.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      area_responsibles: {
        Row: {
          area_id: string
          created_at: string
          id: string
          is_principal: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          area_id: string
          created_at?: string
          id?: string
          is_principal?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          area_id?: string
          created_at?: string
          id?: string
          is_principal?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'area_responsibles_area_id_fkey'
            columns: ['area_id']
            isOneToOne: false
            referencedRelation: 'areas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'area_responsibles_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      areas: {
        Row: {
          code: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          is_hub: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_hub?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_hub?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          cnpj: string | null
          code: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string
          has_lpu: boolean
          honorario_percentage: number | null
          id: string
          name: string
          segment: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          code: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string
          has_lpu?: boolean
          honorario_percentage?: number | null
          id?: string
          name: string
          segment?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          code?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string
          has_lpu?: boolean
          honorario_percentage?: number | null
          id?: string
          name?: string
          segment?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'clients_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      demand_attachments: {
        Row: {
          created_at: string
          demand_id: string
          file_name: string
          file_size: number
          id: string
          mime_type: string | null
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          demand_id: string
          file_name: string
          file_size: number
          id?: string
          mime_type?: string | null
          storage_path: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          demand_id?: string
          file_name?: string
          file_size?: number
          id?: string
          mime_type?: string | null
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: 'demand_attachments_demand_id_fkey'
            columns: ['demand_id']
            isOneToOne: false
            referencedRelation: 'demands'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'demand_attachments_uploaded_by_fkey'
            columns: ['uploaded_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      demand_comments: {
        Row: {
          content: string
          created_at: string
          demand_id: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          demand_id: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          demand_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'demand_comments_demand_id_fkey'
            columns: ['demand_id']
            isOneToOne: false
            referencedRelation: 'demands'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'demand_comments_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      demands: {
        Row: {
          cancellation_reason: string | null
          completed_at: string | null
          created_at: string
          description: string
          due_date: string | null
          from_area_id: string | null
          from_user_id: string
          id: string
          priority: string
          project_id: string
          status: string
          title: string
          to_area_id: string
          to_user_id: string | null
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          completed_at?: string | null
          created_at?: string
          description: string
          due_date?: string | null
          from_area_id?: string | null
          from_user_id: string
          id?: string
          priority?: string
          project_id: string
          status?: string
          title: string
          to_area_id: string
          to_user_id?: string | null
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          from_area_id?: string | null
          from_user_id?: string
          id?: string
          priority?: string
          project_id?: string
          status?: string
          title?: string
          to_area_id?: string
          to_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'demands_from_area_id_fkey'
            columns: ['from_area_id']
            isOneToOne: false
            referencedRelation: 'areas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'demands_from_user_id_fkey'
            columns: ['from_user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'demands_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'demands_to_area_id_fkey'
            columns: ['to_area_id']
            isOneToOne: false
            referencedRelation: 'areas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'demands_to_user_id_fkey'
            columns: ['to_user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link_to: string | null
          message: string
          should_send_email: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link_to?: string | null
          message: string
          should_send_email?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link_to?: string | null
          message?: string
          should_send_email?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          is_admin: boolean
          is_director: boolean
          is_system: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_admin?: boolean
          is_director?: boolean
          is_system?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_admin?: boolean
          is_director?: boolean
          is_system?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_areas: {
        Row: {
          area_id: string
          created_at: string
          id: string
          is_lead: boolean
          project_id: string
        }
        Insert: {
          area_id: string
          created_at?: string
          id?: string
          is_lead?: boolean
          project_id: string
        }
        Update: {
          area_id?: string
          created_at?: string
          id?: string
          is_lead?: boolean
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'project_areas_area_id_fkey'
            columns: ['area_id']
            isOneToOne: false
            referencedRelation: 'areas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'project_areas_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      project_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number
          id: string
          mime_type: string | null
          project_id: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size: number
          id?: string
          mime_type?: string | null
          project_id: string
          storage_path: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number
          id?: string
          mime_type?: string | null
          project_id?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: 'project_attachments_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'project_attachments_uploaded_by_fkey'
            columns: ['uploaded_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      project_audit_log: {
        Row: {
          actor_label: string | null
          actor_user_id: string | null
          created_at: string
          event_type: Database['public']['Enums']['audit_event_type']
          field_name: string | null
          id: string
          metadata: Json | null
          new_value: string | null
          old_value: string | null
          project_id: string
        }
        Insert: {
          actor_label?: string | null
          actor_user_id?: string | null
          created_at?: string
          event_type: Database['public']['Enums']['audit_event_type']
          field_name?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          project_id: string
        }
        Update: {
          actor_label?: string | null
          actor_user_id?: string | null
          created_at?: string
          event_type?: Database['public']['Enums']['audit_event_type']
          field_name?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'project_audit_log_actor_user_id_fkey'
            columns: ['actor_user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'project_audit_log_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
        ]
      }
      projects: {
        Row: {
          briefing_completed_at: string | null
          briefing_data: Json
          client_id: string
          created_at: string
          created_by: string
          description: string | null
          end_date: string
          id: string
          name: string
          origin_type: string
          project_code: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          briefing_completed_at?: string | null
          briefing_data?: Json
          client_id: string
          created_at?: string
          created_by: string
          description?: string | null
          end_date: string
          id?: string
          name: string
          origin_type?: string
          project_code?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          briefing_completed_at?: string | null
          briefing_data?: Json
          client_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string
          id?: string
          name?: string
          origin_type?: string
          project_code?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'projects_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'projects_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      system_config: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          last_login_at: string | null
          profile_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          last_login_at?: string | null
          profile_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          profile_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'users_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      audit_log_insert: {
        Args: {
          p_event_type: Database['public']['Enums']['audit_event_type']
          p_field_name?: string
          p_metadata?: Json
          p_new_value?: string
          p_old_value?: string
          p_project_id: string
        }
        Returns: undefined
      }
      can_view_project: { Args: { p_project_id: string }; Returns: boolean }
      generate_project_code: { Args: { p_client_id: string }; Returns: string }
      get_project_audit_log: {
        Args: {
          p_event_types?: Database['public']['Enums']['audit_event_type'][]
          p_limit?: number
          p_project_id: string
          p_since?: string
        }
        Returns: {
          actor_name: string
          actor_user_id: string
          created_at: string
          event_type: Database['public']['Enums']['audit_event_type']
          field_name: string
          id: string
          metadata: Json
          new_value: string
          old_value: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      mark_overdue_projects: {
        Args: never
        Returns: {
          old_status: string
          project_name: string
          updated_project_id: string
        }[]
      }
      user_can_access_project: {
        Args: { p_project_id: string }
        Returns: boolean
      }
      user_can_see_project: { Args: { p_project_id: string }; Returns: boolean }
    }
    Enums: {
      audit_event_type:
        | 'project_created'
        | 'project_status_changed'
        | 'project_end_date_changed'
        | 'project_start_date_changed'
        | 'project_name_changed'
        | 'project_client_changed'
        | 'project_priority_changed'
        | 'project_area_added'
        | 'project_area_removed'
        | 'project_area_lead_changed'
        | 'project_completed'
        | 'project_reopened'
        | 'project_overdue_auto'
        | 'project_overdue_resolved_auto'
        | 'gate_override_executed'
        | 'gate_blocked'
        | 'feedback_received'
        | 'version_created'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      audit_event_type: [
        'project_created',
        'project_status_changed',
        'project_end_date_changed',
        'project_start_date_changed',
        'project_name_changed',
        'project_client_changed',
        'project_priority_changed',
        'project_area_added',
        'project_area_removed',
        'project_area_lead_changed',
        'project_completed',
        'project_reopened',
        'project_overdue_auto',
        'project_overdue_resolved_auto',
        'gate_override_executed',
        'gate_blocked',
        'feedback_received',
        'version_created',
      ],
    },
  },
} as const
