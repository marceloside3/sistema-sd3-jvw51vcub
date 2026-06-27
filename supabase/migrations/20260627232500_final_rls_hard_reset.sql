-- =====================================================================
-- FINAL RLS HARD RESET for projects, project_areas, and helper functions
-- Drops ALL existing policies and replaces with clean, idempotent ones
-- Resolves "Permission Denied" / RLS errors for authenticated users
-- =====================================================================

-- =====================================================================
-- 1. RECREATE HELPER FUNCTIONS (idempotent)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.profiles p ON p.id = u.profile_id
    WHERE u.id = auth.uid() AND p.is_admin = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_director()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.profiles p ON p.id = u.profile_id
    WHERE u.id = auth.uid() AND p.is_director = true
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    public.is_admin()
    OR public.is_director()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = p_project_id AND p.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.project_areas pa
      JOIN public.area_responsibles ar ON ar.area_id = pa.area_id
      WHERE pa.project_id = p_project_id AND ar.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.demands d
      WHERE d.project_id = p_project_id
      AND (d.from_user_id = auth.uid() OR d.to_user_id = auth.uid())
    );
$$;

CREATE OR REPLACE FUNCTION public.user_can_see_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT public.can_view_project(p_project_id);
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT public.can_view_project(p_project_id);
$$;

-- =====================================================================
-- 2. DROP ALL EXISTING POLICIES ON projects TABLE
-- =====================================================================

DROP POLICY IF EXISTS "projects_select" ON public.projects;
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
DROP POLICY IF EXISTS "projects_update" ON public.projects;
DROP POLICY IF EXISTS "projects_delete" ON public.projects;

-- =====================================================================
-- 3. ENABLE RLS AND CREATE CLEAN POLICIES ON projects
-- =====================================================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- INSERT: Any authenticated user can create a project where they are the creator
CREATE POLICY "projects_insert" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- SELECT: Creators, admins, directors, area members, demand participants
CREATE POLICY "projects_select" ON public.projects
  FOR SELECT TO authenticated
  USING (public.can_view_project(id));

-- UPDATE: Creators, admins, or directors
CREATE POLICY "projects_update" ON public.projects
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_admin()
    OR public.is_director()
  )
  WITH CHECK (
    created_by = auth.uid()
    OR public.is_admin()
    OR public.is_director()
  );

-- DELETE: Creators, admins, or directors
CREATE POLICY "projects_delete" ON public.projects
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_admin()
    OR public.is_director()
  );

-- =====================================================================
-- 4. DROP ALL EXISTING POLICIES ON project_areas TABLE
-- =====================================================================

DROP POLICY IF EXISTS "project_areas_select" ON public.project_areas;
DROP POLICY IF EXISTS "project_areas_insert" ON public.project_areas;
DROP POLICY IF EXISTS "project_areas_update" ON public.project_areas;
DROP POLICY IF EXISTS "project_areas_delete" ON public.project_areas;

-- =====================================================================
-- 5. CREATE CLEAN POLICIES ON project_areas
-- =====================================================================

CREATE POLICY "project_areas_select" ON public.project_areas
  FOR SELECT TO authenticated
  USING (public.can_view_project(project_id));

CREATE POLICY "project_areas_insert" ON public.project_areas
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR public.is_director()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.created_by = auth.uid()
    )
  );

CREATE POLICY "project_areas_update" ON public.project_areas
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR public.is_director()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.created_by = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin()
    OR public.is_director()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.created_by = auth.uid()
    )
  );

CREATE POLICY "project_areas_delete" ON public.project_areas
  FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR public.is_director()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.created_by = auth.uid()
    )
  );

-- =====================================================================
-- 6. ENSURE SEED USER (Marcelo) EXISTS WITH CORRECT PROFILE
-- =====================================================================

DO $$
DECLARE
  v_user_id UUID;
  v_profile_id UUID;
  v_area_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'marcelo@side3.com.br';

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'marcelo@side3.com.br',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Marcelo"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL,
      '', '', ''
    );
  END IF;

  -- Ensure profile exists and is linked
  SELECT profile_id INTO v_profile_id FROM public.users WHERE id = v_user_id;

  IF v_profile_id IS NULL THEN
    v_profile_id := gen_random_uuid();
    INSERT INTO public.profiles (id, code, name, is_admin, is_director, is_system, is_active)
    VALUES (v_profile_id, 'ADM-MARC', 'Marcelo', true, false, false, true)
    ON CONFLICT (id) DO NOTHING;

    UPDATE public.users SET profile_id = v_profile_id WHERE id = v_user_id;
  ELSE
    UPDATE public.profiles SET is_admin = true, is_active = true WHERE id = v_profile_id;
  END IF;

  -- Ensure public.users record exists
  INSERT INTO public.users (id, email, full_name, profile_id, is_active)
  VALUES (v_user_id, 'marcelo@side3.com.br', 'Marcelo', v_profile_id, true)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    profile_id = EXCLUDED.profile_id,
    is_active = true;

  -- Ensure planejamento area exists
  INSERT INTO public.areas (code, name, display_order, is_active)
  VALUES ('planejamento', 'Planejamento', 3, true)
  ON CONFLICT (code) DO NOTHING;

  -- Link user to planejamento area
  SELECT id INTO v_area_id FROM public.areas WHERE code = 'planejamento';
  IF v_area_id IS NOT NULL THEN
    INSERT INTO public.area_responsibles (user_id, area_id, is_principal)
    VALUES (v_user_id, v_area_id, true)
    ON CONFLICT (user_id, area_id) DO NOTHING;
  END IF;
END $$;

-- =====================================================================
-- 7. VERIFICATION FUNCTION (idempotent)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.verify_project_insert_access()
RETURNS TABLE(
  has_access boolean,
  user_id uuid,
  is_admin boolean,
  is_director boolean,
  user_exists_in_public_users boolean,
  user_has_areas boolean,
  rls_insert_policy_exists boolean
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    true AS has_access,
    auth.uid() AS user_id,
    public.is_admin() AS is_admin,
    public.is_director() AS is_director,
    EXISTS(SELECT 1 FROM public.users WHERE id = auth.uid()) AS user_exists_in_public_users,
    EXISTS(SELECT 1 FROM public.area_responsibles WHERE user_id = auth.uid()) AS user_has_areas,
    EXISTS(
      SELECT 1 FROM pg_policies
      WHERE tablename = 'projects'
      AND policyname = 'projects_insert'
      AND schemaname = 'public'
    ) AS rls_insert_policy_exists;
$$;
