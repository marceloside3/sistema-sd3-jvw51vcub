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
      handover_meeting_participants: {
        Row: {
          confirmed: boolean | null
          created_at: string
          id: string
          is_organizer: boolean
          meeting_id: string
          user_id: string
        }
        Insert: {
          confirmed?: boolean | null
          created_at?: string
          id?: string
          is_organizer?: boolean
          meeting_id: string
          user_id: string
        }
        Update: {
          confirmed?: boolean | null
          created_at?: string
          id?: string
          is_organizer?: boolean
          meeting_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'handover_meeting_participants_meeting_id_fkey'
            columns: ['meeting_id']
            isOneToOne: false
            referencedRelation: 'handover_meetings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'handover_meeting_participants_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      handover_meetings: {
        Row: {
          agenda: string | null
          created_at: string
          created_by: string | null
          duration_minutes: number
          id: string
          location_or_link: string | null
          notes: string | null
          project_id: string
          scheduled_at: string
          status: string
          updated_at: string
        }
        Insert: {
          agenda?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          location_or_link?: string | null
          notes?: string | null
          project_id: string
          scheduled_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          agenda?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          location_or_link?: string | null
          notes?: string | null
          project_id?: string
          scheduled_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'handover_meetings_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
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
      paper_g3_reviews: {
        Row: {
          comment: string | null
          created_at: string
          decision: string
          id: string
          paper_id: string
          project_id: string
          reviewer_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          decision: string
          id?: string
          paper_id: string
          project_id: string
          reviewer_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          decision?: string
          id?: string
          paper_id?: string
          project_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'paper_g3_reviews_paper_id_fkey'
            columns: ['paper_id']
            isOneToOne: false
            referencedRelation: 'project_papers'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'paper_g3_reviews_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'paper_g3_reviews_reviewer_id_fkey'
            columns: ['reviewer_id']
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
      project_papers: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          budget_allocation: Json | null
          channels_priority: Json | null
          created_at: string
          created_by: string | null
          id: string
          key_message: string | null
          kpis: Json | null
          override_at: string | null
          override_by: string | null
          override_reason: string | null
          personas: Json | null
          premises_restrictions: string | null
          project_id: string
          refined_objective: string | null
          status: string
          timeline: Json | null
          updated_at: string
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          budget_allocation?: Json | null
          channels_priority?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          key_message?: string | null
          kpis?: Json | null
          override_at?: string | null
          override_by?: string | null
          override_reason?: string | null
          personas?: Json | null
          premises_restrictions?: string | null
          project_id: string
          refined_objective?: string | null
          status?: string
          timeline?: Json | null
          updated_at?: string
          version?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          budget_allocation?: Json | null
          channels_priority?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          key_message?: string | null
          kpis?: Json | null
          override_at?: string | null
          override_by?: string | null
          override_reason?: string | null
          personas?: Json | null
          premises_restrictions?: string | null
          project_id?: string
          refined_objective?: string | null
          status?: string
          timeline?: Json | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'project_papers_approved_by_fkey'
            columns: ['approved_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'project_papers_override_by_fkey'
            columns: ['override_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'project_papers_project_id_fkey'
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
          distributed_at: string | null
          end_date: string
          g2_override_by: string | null
          g2_override_reason: string | null
          g2_status: string | null
          g2_validated_at: string | null
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
          distributed_at?: string | null
          end_date: string
          g2_override_by?: string | null
          g2_override_reason?: string | null
          g2_status?: string | null
          g2_validated_at?: string | null
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
          distributed_at?: string | null
          end_date?: string
          g2_override_by?: string | null
          g2_override_reason?: string | null
          g2_status?: string | null
          g2_validated_at?: string | null
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
          {
            foreignKeyName: 'projects_g2_override_by_fkey'
            columns: ['g2_override_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      sla_configs: {
        Row: {
          created_at: string | null
          description: string | null
          hours_limit: number
          id: string
          is_active: boolean | null
          stage_code: string
          stage_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          hours_limit: number
          id?: string
          is_active?: boolean | null
          stage_code: string
          stage_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          hours_limit?: number
          id?: string
          is_active?: boolean | null
          stage_code?: string
          stage_name?: string
          updated_at?: string | null
        }
        Relationships: []
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
      can_override_g2: { Args: never; Returns: boolean }
      can_view_project: { Args: { p_project_id: string }; Returns: boolean }
      create_paper_version: { Args: { p_project_id: string }; Returns: string }
      distribute_project: {
        Args: {
          p_assignments: Json
          p_override_reason?: string
          p_project_id: string
        }
        Returns: undefined
      }
      generate_project_code: { Args: { p_client_id: string }; Returns: string }
      get_auth_diagnostic: { Args: never; Returns: Json }
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
      is_director: { Args: never; Returns: boolean }
      mark_overdue_projects: {
        Args: never
        Returns: {
          old_status: string
          project_name: string
          updated_project_id: string
        }[]
      }
      override_paper_g3: {
        Args: { p_justification: string; p_paper_id: string }
        Returns: undefined
      }
      review_paper_g3: {
        Args: { p_comment?: string; p_decision: string; p_paper_id: string }
        Returns: undefined
      }
      schedule_handover_meeting: {
        Args: {
          p_agenda: string
          p_duration_minutes: number
          p_location: string
          p_participant_ids: string[]
          p_project_id: string
          p_scheduled_at: string
        }
        Returns: string
      }
      submit_paper_to_g3: { Args: { p_paper_id: string }; Returns: undefined }
      user_can_access_project: {
        Args: { p_project_id: string }
        Returns: boolean
      }
      user_can_see_project: { Args: { p_project_id: string }; Returns: boolean }
      validate_briefing_for_distribution: {
        Args: { p_project_id: string }
        Returns: Json
      }
      verify_project_insert_access: {
        Args: never
        Returns: {
          has_access: boolean
          is_admin: boolean
          is_director: boolean
          rls_insert_policy_exists: boolean
          user_exists_in_public_users: boolean
          user_has_areas: boolean
          user_id: string
        }[]
      }
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
        | 'project_distributed'
        | 'g2_validation_passed'
        | 'g2_validation_failed'
        | 'g2_override'
        | 'paper_created'
        | 'paper_updated'
        | 'paper_submitted'
        | 'paper_new_version'
        | 'handover_meeting_scheduled'
        | 'handover_meeting_completed'
        | 'g3_submitted'
        | 'g3_approved'
        | 'g3_rejected'
        | 'g3_override'
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
        'project_distributed',
        'g2_validation_passed',
        'g2_validation_failed',
        'g2_override',
        'paper_created',
        'paper_updated',
        'paper_submitted',
        'paper_new_version',
        'handover_meeting_scheduled',
        'handover_meeting_completed',
        'g3_submitted',
        'g3_approved',
        'g3_rejected',
        'g3_override',
      ],
    },
  },
} as const
