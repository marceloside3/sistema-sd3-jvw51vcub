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
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

// ====== DATABASE EXTENDED CONTEXT (auto-generated) ======
// This section contains actual PostgreSQL column types, constraints, RLS policies,
// functions, triggers, indexes and materialized views not present in the type definitions above.
// IMPORTANT: The TypeScript types above map UUID, TEXT, VARCHAR all to "string".
// Use the COLUMN TYPES section below to know the real PostgreSQL type for each column.
// Always use the correct PostgreSQL type when writing SQL migrations.

// --- COLUMN TYPES (actual PostgreSQL types) ---
// Use this to know the real database type when writing migrations.
// "string" in TypeScript types above may be uuid, text, varchar, timestamptz, etc.
// Table: area_responsibles
//   id: uuid (not null, default: gen_random_uuid())
//   user_id: uuid (not null)
//   area_id: uuid (not null)
//   is_principal: boolean (not null, default: false)
//   created_at: timestamp with time zone (not null, default: now())
//   updated_at: timestamp with time zone (not null, default: now())
// Table: areas
//   id: uuid (not null, default: gen_random_uuid())
//   code: text (not null)
//   name: text (not null)
//   is_hub: boolean (not null, default: false)
//   display_order: integer (not null, default: 0)
//   is_active: boolean (not null, default: true)
//   created_at: timestamp with time zone (not null, default: now())
//   updated_at: timestamp with time zone (not null, default: now())
// Table: profiles
//   id: uuid (not null, default: gen_random_uuid())
//   code: text (not null)
//   name: text (not null)
//   is_director: boolean (not null, default: false)
//   is_admin: boolean (not null, default: false)
//   is_system: boolean (not null, default: true)
//   is_active: boolean (not null, default: true)
//   created_at: timestamp with time zone (not null, default: now())
//   updated_at: timestamp with time zone (not null, default: now())
// Table: users
//   id: uuid (not null)
//   email: text (not null)
//   full_name: text (not null)
//   profile_id: uuid (nullable)
//   is_active: boolean (not null, default: true)
//   last_login_at: timestamp with time zone (nullable)
//   created_at: timestamp with time zone (not null, default: now())
//   updated_at: timestamp with time zone (not null, default: now())

// --- CONSTRAINTS ---
// Table: area_responsibles
//   FOREIGN KEY area_responsibles_area_id_fkey: FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE RESTRICT
//   PRIMARY KEY area_responsibles_pkey: PRIMARY KEY (id)
//   FOREIGN KEY area_responsibles_user_id_fkey: FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
//   UNIQUE uq_user_area: UNIQUE (user_id, area_id)
// Table: areas
//   UNIQUE areas_code_key: UNIQUE (code)
//   PRIMARY KEY areas_pkey: PRIMARY KEY (id)
// Table: profiles
//   UNIQUE profiles_code_key: UNIQUE (code)
//   PRIMARY KEY profiles_pkey: PRIMARY KEY (id)
// Table: users
//   UNIQUE users_email_key: UNIQUE (email)
//   FOREIGN KEY users_id_fkey: FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
//   PRIMARY KEY users_pkey: PRIMARY KEY (id)
//   FOREIGN KEY users_profile_id_fkey: FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE RESTRICT

// --- ROW LEVEL SECURITY POLICIES ---
// Table: area_responsibles
//   Policy "area_responsibles_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: is_admin()
//   Policy "area_responsibles_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: is_admin()
//   Policy "area_responsibles_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "area_responsibles_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: is_admin()
//     WITH CHECK: is_admin()
//   Policy "service_role_area_responsibles" (ALL, PERMISSIVE) roles={service_role}
//     USING: true
//     WITH CHECK: true
// Table: areas
//   Policy "areas_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: is_admin()
//   Policy "areas_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: is_admin()
//   Policy "areas_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "areas_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: is_admin()
//     WITH CHECK: is_admin()
//   Policy "service_role_areas" (ALL, PERMISSIVE) roles={service_role}
//     USING: true
//     WITH CHECK: true
// Table: profiles
//   Policy "profiles_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: is_admin()
//   Policy "profiles_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: is_admin()
//   Policy "profiles_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: true
//   Policy "profiles_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: is_admin()
//     WITH CHECK: is_admin()
//   Policy "service_role_profiles" (ALL, PERMISSIVE) roles={service_role}
//     USING: true
//     WITH CHECK: true
// Table: users
//   Policy "service_role_users" (ALL, PERMISSIVE) roles={service_role}
//     USING: true
//     WITH CHECK: true
//   Policy "users_delete" (DELETE, PERMISSIVE) roles={authenticated}
//     USING: is_admin()
//   Policy "users_insert" (INSERT, PERMISSIVE) roles={authenticated}
//     WITH CHECK: is_admin()
//   Policy "users_select" (SELECT, PERMISSIVE) roles={authenticated}
//     USING: ((id = auth.uid()) OR is_admin())
//   Policy "users_update" (UPDATE, PERMISSIVE) roles={authenticated}
//     USING: ((id = auth.uid()) OR is_admin())
//     WITH CHECK: ((id = auth.uid()) OR is_admin())

// --- DATABASE FUNCTIONS ---
// FUNCTION is_admin()
//   CREATE OR REPLACE FUNCTION public.is_admin()
//    RETURNS boolean
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//   AS $function$
//   BEGIN
//     RETURN (
//       current_setting('role') = 'service_role' OR
//       EXISTS (
//         SELECT 1 FROM public.users u
//         JOIN public.profiles p ON u.profile_id = p.id
//         WHERE u.id = auth.uid() AND p.is_admin = true
//       )
//     );
//   END;
//   $function$
//
// FUNCTION set_updated_at()
//   CREATE OR REPLACE FUNCTION public.set_updated_at()
//    RETURNS trigger
//    LANGUAGE plpgsql
//   AS $function$
//   BEGIN
//     NEW.updated_at = NOW();
//     RETURN NEW;
//   END;
//   $function$
//
// FUNCTION sync_last_login()
//   CREATE OR REPLACE FUNCTION public.sync_last_login()
//    RETURNS trigger
//    LANGUAGE plpgsql
//    SECURITY DEFINER
//    SET search_path TO 'public', 'auth'
//   AS $function$
//   BEGIN
//     -- Quando last_sign_in_at é atualizado em auth.users, copia para public.users
//     IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
//       UPDATE public.users
//       SET last_login_at = NEW.last_sign_in_at
//       WHERE id = NEW.id;
//     END IF;
//     RETURN NEW;
//   END;
//   $function$
//
// FUNCTION update_updated_at_column()
//   CREATE OR REPLACE FUNCTION public.update_updated_at_column()
//    RETURNS trigger
//    LANGUAGE plpgsql
//   AS $function$
//   BEGIN
//     NEW.updated_at = NOW();
//     RETURN NEW;
//   END;
//   $function$
//

// --- TRIGGERS ---
// Table: areas
//   set_areas_updated_at: CREATE TRIGGER set_areas_updated_at BEFORE UPDATE ON public.areas FOR EACH ROW EXECUTE FUNCTION set_updated_at()
//   set_updated_at: CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.areas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
// Table: profiles
//   set_profiles_updated_at: CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at()
//   set_updated_at: CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
// Table: users
//   set_updated_at: CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
//   set_users_updated_at: CREATE TRIGGER set_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION set_updated_at()

// --- INDEXES ---
// Table: area_responsibles
//   CREATE UNIQUE INDEX unique_principal_per_area ON public.area_responsibles USING btree (area_id) WHERE (is_principal = true)
//   CREATE UNIQUE INDEX uq_user_area ON public.area_responsibles USING btree (user_id, area_id)
// Table: areas
//   CREATE UNIQUE INDEX areas_code_key ON public.areas USING btree (code)
// Table: profiles
//   CREATE UNIQUE INDEX profiles_code_key ON public.profiles USING btree (code)
// Table: users
//   CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email)
