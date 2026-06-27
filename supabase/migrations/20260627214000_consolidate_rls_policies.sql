-- Consolidate RLS policies on projects and project_areas tables
-- Resolves conflicting policies from multiple previous migrations
-- Ensures Planning users (and any authenticated creator) can create projects

-- =====================================================================
-- PROJECTS TABLE
-- =====================================================================

-- Drop all existing conflicting policies
DROP POLICY IF EXISTS "projects_select" ON public.projects;
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
DROP POLICY IF EXISTS "projects_update" ON public.projects;

-- SELECT: Admins, directors, creators, area members, and demand participants
CREATE POLICY "projects_select" ON public.projects
  FOR SELECT TO authenticated
  USING (public.can_view_project(id));

-- INSERT: Any authenticated user can create a project where they are the creator
CREATE POLICY "projects_insert" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- UPDATE: Admins, directors, and project creators
CREATE POLICY "projects_update" ON public.projects
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_director = true)
    OR created_by = auth.uid()
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_director = true)
    OR created_by = auth.uid()
  );

-- =====================================================================
-- PROJECT_AREAS TABLE
-- =====================================================================

-- Drop all existing conflicting policies
DROP POLICY IF EXISTS "project_areas_select" ON public.project_areas;
DROP POLICY IF EXISTS "project_areas_insert" ON public.project_areas;
DROP POLICY IF EXISTS "project_areas_update" ON public.project_areas;
DROP POLICY IF EXISTS "project_areas_delete" ON public.project_areas;

-- SELECT: Same visibility as projects (via parent project)
CREATE POLICY "project_areas_select" ON public.project_areas
  FOR SELECT TO authenticated
  USING (public.can_view_project(project_id));

-- INSERT: Admins, directors, and project creators
CREATE POLICY "project_areas_insert" ON public.project_areas
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_director = true)
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.created_by = auth.uid()
    )
  );

-- UPDATE: Admins, directors, and project creators
CREATE POLICY "project_areas_update" ON public.project_areas
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_director = true)
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.created_by = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_director = true)
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.created_by = auth.uid()
    )
  );

-- DELETE: Admins, directors, and project creators
CREATE POLICY "project_areas_delete" ON public.project_areas
  FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_director = true)
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.created_by = auth.uid()
    )
  );

-- =====================================================================
-- ENSURE CAN_VIEW_PROJECT INCLUDES CREATOR CHECK
-- =====================================================================

CREATE OR REPLACE FUNCTION public.can_view_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $function$
  SELECT
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_director = true
    )
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
$function$;

-- =====================================================================
-- ENSURE SEED USER IS PROPERLY SET UP
-- =====================================================================

DO $$
DECLARE
  v_user_id UUID;
  v_area_id UUID;
BEGIN
  -- Get or create the auth user
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

  -- Ensure profile exists with admin capabilities
  INSERT INTO public.profiles (id, code, name, is_admin, is_director, is_system, is_active)
  VALUES (v_user_id, 'ADM-MARC', 'Marcelo', true, false, false, true)
  ON CONFLICT (id) DO UPDATE SET
    is_admin = true,
    is_active = true;

  -- Ensure public.users record exists
  INSERT INTO public.users (id, email, full_name, profile_id, is_active)
  VALUES (v_user_id, 'marcelo@side3.com.br', 'Marcelo', v_user_id, true)
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
