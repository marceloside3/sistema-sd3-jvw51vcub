-- Final RLS fix for projects table
-- Drops ALL conflicting policies, creates clean ones, ensures is_admin() works properly

-- =====================================================================
-- 1. CREATE/REPLACE is_admin() FUNCTION
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

-- =====================================================================
-- 2. CREATE/REPLACE is_director() FUNCTION
-- =====================================================================

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

-- =====================================================================
-- 3. CREATE/REPLACE can_view_project() FUNCTION
-- =====================================================================

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

-- =====================================================================
-- 4. DROP ALL EXISTING POLICIES ON projects TABLE
-- =====================================================================

DROP POLICY IF EXISTS "projects_select" ON public.projects;
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
DROP POLICY IF EXISTS "projects_update" ON public.projects;

-- =====================================================================
-- 5. ENABLE RLS ON projects TABLE
-- =====================================================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 6. CREATE CLEAN POLICIES ON projects TABLE
-- =====================================================================

-- INSERT: Only authenticated users creating their own project
CREATE POLICY "projects_insert" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- SELECT: Creators, admins, directors, area members, demand participants
CREATE POLICY "projects_select" ON public.projects
  FOR SELECT TO authenticated
  USING (public.can_view_project(id));

-- UPDATE: Creators or administrators
CREATE POLICY "projects_update" ON public.projects
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin())
  WITH CHECK (created_by = auth.uid() OR public.is_admin());

-- =====================================================================
-- 7. UPDATE project_areas POLICIES TO USE is_admin() AND is_director()
-- =====================================================================

DROP POLICY IF EXISTS "project_areas_select" ON public.project_areas;
DROP POLICY IF EXISTS "project_areas_insert" ON public.project_areas;
DROP POLICY IF EXISTS "project_areas_update" ON public.project_areas;
DROP POLICY IF EXISTS "project_areas_delete" ON public.project_areas;

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
-- 8. ENSURE SEED USER EXISTS
-- =====================================================================

DO $$
DECLARE
  v_user_id UUID;
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

  INSERT INTO public.profiles (id, code, name, is_admin, is_director, is_system, is_active)
  VALUES (v_user_id, 'ADM-MARC', 'Marcelo', true, false, false, true)
  ON CONFLICT (id) DO UPDATE SET
    is_admin = true,
    is_active = true;

  INSERT INTO public.users (id, email, full_name, profile_id, is_active)
  VALUES (v_user_id, 'marcelo@side3.com.br', 'Marcelo', v_user_id, true)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    profile_id = EXCLUDED.profile_id,
    is_active = true;

  INSERT INTO public.areas (code, name, display_order, is_active)
  VALUES ('planejamento', 'Planejamento', 3, true)
  ON CONFLICT (code) DO NOTHING;

  SELECT id INTO v_area_id FROM public.areas WHERE code = 'planejamento';
  IF v_area_id IS NOT NULL THEN
    INSERT INTO public.area_responsibles (user_id, area_id, is_principal)
    VALUES (v_user_id, v_area_id, true)
    ON CONFLICT (user_id, area_id) DO NOTHING;
  END IF;
END $$;
