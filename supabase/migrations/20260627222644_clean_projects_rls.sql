-- =====================================================================
-- Clean and unify RLS policies on projects and project_areas tables
-- Resolves ALL conflicting policies from previous migrations
-- Ensures any authenticated user (including Planning) can create projects
-- =====================================================================

-- =====================================================================
-- 1. RECREATE is_admin() — correct join: users.profile_id → profiles.id
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
-- 2. RECREATE is_director() — correct join: users.profile_id → profiles.id
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
-- 3. RECREATE can_view_project() — uses helper functions, no inline joins
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
-- 4. ENABLE RLS ON projects (idempotent)
-- =====================================================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 5. DROP ALL EXISTING POLICIES ON projects TABLE
-- =====================================================================
DROP POLICY IF EXISTS "projects_select" ON public.projects;
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
DROP POLICY IF EXISTS "projects_update" ON public.projects;
DROP POLICY IF EXISTS "projects_delete" ON public.projects;

-- =====================================================================
-- 6. CREATE CLEAN POLICIES ON projects TABLE
-- =====================================================================

-- INSERT: Any authenticated user can create a project where they are the creator
-- NOTE: is_admin() is NOT used here — non-admin users (like Planning) MUST be able to create projects
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

-- =====================================================================
-- 7. DROP ALL EXISTING POLICIES ON project_areas TABLE
-- =====================================================================
DROP POLICY IF EXISTS "project_areas_select" ON public.project_areas;
DROP POLICY IF EXISTS "project_areas_insert" ON public.project_areas;
DROP POLICY IF EXISTS "project_areas_update" ON public.project_areas;
DROP POLICY IF EXISTS "project_areas_delete" ON public.project_areas;

-- =====================================================================
-- 8. CREATE CLEAN POLICIES ON project_areas TABLE
-- =====================================================================

-- SELECT: Same visibility as projects (via parent project)
CREATE POLICY "project_areas_select" ON public.project_areas
  FOR SELECT TO authenticated
  USING (public.can_view_project(project_id));

-- INSERT: Admins, directors, or project creators can add areas to their projects
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

-- UPDATE: Admins, directors, or project creators
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

-- DELETE: Admins, directors, or project creators
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
-- 9. ENSURE SEED USER (Marcelo) IS PROPERLY SET UP
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

  -- Ensure a profile exists and is linked correctly via users.profile_id
  SELECT profile_id INTO v_profile_id FROM public.users WHERE id = v_user_id;

  IF v_profile_id IS NULL THEN
    -- Create a new profile for this user
    v_profile_id := gen_random_uuid();
    INSERT INTO public.profiles (id, code, name, is_admin, is_director, is_system, is_active)
    VALUES (v_profile_id, 'ADM-MARC', 'Marcelo', true, false, false, true)
    ON CONFLICT (id) DO NOTHING;

    -- Link it
    UPDATE public.users SET profile_id = v_profile_id WHERE id = v_user_id;
  ELSE
    -- Ensure the existing profile has admin privileges
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
