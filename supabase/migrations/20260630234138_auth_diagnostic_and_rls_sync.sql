-- =====================================================================
-- Auth Diagnostic & RLS Sync
-- Cleans up all RLS policies on projects and project_areas
-- Adds get_auth_diagnostic() RPC for troubleshooting
-- Ensures SECURITY DEFINER on all helper functions
-- =====================================================================

-- =====================================================================
-- 1. RECREATE HELPER FUNCTIONS (SECURITY DEFINER, idempotent)
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

-- Ensure generate_project_code is SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.generate_project_code(p_client_id UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_client_code TEXT;
  v_year TEXT;
  v_count INT;
  v_project_code TEXT;
BEGIN
  SELECT code INTO v_client_code
  FROM public.clients
  WHERE id = p_client_id
  FOR UPDATE;

  IF v_client_code IS NULL THEN
    RAISE EXCEPTION 'Client not found';
  END IF;

  v_year := to_char(CURRENT_DATE, 'YYYY');

  SELECT COUNT(*) INTO v_count
  FROM public.projects
  WHERE client_id = p_client_id
    AND to_char(created_at, 'YYYY') = v_year;

  v_project_code := v_client_code || '-' || v_year || '-' || LPAD((v_count + 1)::TEXT, 3, '0');
  RETURN v_project_code;
END;
$$;

-- =====================================================================
-- 2. DROP ALL EXISTING POLICIES ON projects TABLE (idempotent)
-- =====================================================================

DROP POLICY IF EXISTS "projects_select" ON public.projects;
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
DROP POLICY IF EXISTS "projects_update" ON public.projects;
DROP POLICY IF EXISTS "projects_delete" ON public.projects;

-- =====================================================================
-- 3. CREATE CLEAN RLS POLICIES ON projects
-- =====================================================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_insert" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "projects_select" ON public.projects
  FOR SELECT TO authenticated
  USING (public.can_view_project(id));

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

CREATE POLICY "projects_delete" ON public.projects
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_admin()
    OR public.is_director()
  );

-- =====================================================================
-- 4. DROP AND RECREATE POLICIES ON project_areas (idempotent)
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
-- 5. CREATE DIAGNOSTIC RPC FUNCTION
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_auth_diagnostic()
RETURNS JSON
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT json_build_object(
    'current_auth_uid', auth.uid(),
    'is_admin', public.is_admin(),
    'is_director', public.is_director(),
    'user_exists_in_public_users', EXISTS(
      SELECT 1 FROM public.users WHERE id = auth.uid()
    )
  );
$$;

-- =====================================================================
-- 6. ENSURE SEED USER (Marcelo) IS PROPERLY CONFIGURED
-- =====================================================================

DO $$
DECLARE
  v_user_id UUID;
  v_profile_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'marcelo@side3.com.br';

  IF v_user_id IS NOT NULL THEN
    -- Ensure public.users record exists
    SELECT profile_id INTO v_profile_id FROM public.users WHERE id = v_user_id;

    IF v_profile_id IS NULL THEN
      v_profile_id := gen_random_uuid();
      INSERT INTO public.profiles (id, code, name, is_admin, is_director, is_system, is_active)
      VALUES (v_profile_id, 'ADM-MARC', 'Marcelo', true, false, false, true)
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO public.users (id, email, full_name, profile_id, is_active)
      VALUES (v_user_id, 'marcelo@side3.com.br', 'Marcelo', v_profile_id, true)
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        profile_id = EXCLUDED.profile_id,
        is_active = true;
    ELSE
      -- Ensure profile has admin flag
      UPDATE public.profiles SET is_admin = true, is_active = true
      WHERE id = v_profile_id AND (is_admin = false OR is_active = false);
    END IF;
  END IF;
END $$;
