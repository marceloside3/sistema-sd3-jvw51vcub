-- =====================================================================
-- Final RLS Standardization for public.projects
-- Drops ALL conflicting policies and creates clean, idempotent ones
-- Ensures get_auth_diagnostic() RPC is available
-- Fixes 42501 (Permission Denied) errors on project creation
-- =====================================================================

-- =====================================================================
-- 1. ENSURE HELPER FUNCTIONS EXIST (SECURITY DEFINER, idempotent)
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

-- =====================================================================
-- 2. DROP ALL EXISTING POLICIES ON projects TABLE (Clean Slate)
-- =====================================================================

DROP POLICY IF EXISTS "projects_select" ON public.projects;
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
DROP POLICY IF EXISTS "projects_update" ON public.projects;
DROP POLICY IF EXISTS "projects_delete" ON public.projects;
DROP POLICY IF EXISTS "authenticated_select_projects" ON public.projects;
DROP POLICY IF EXISTS "admin_insert_projects" ON public.projects;
DROP POLICY IF EXISTS "admin_director_insert_projects" ON public.projects;

-- =====================================================================
-- 3. ENABLE RLS ON projects TABLE
-- =====================================================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 4. CREATE CLEAN RLS POLICIES ON projects
-- =====================================================================

-- INSERT: Authenticated users can create projects where they are the creator
CREATE POLICY "projects_insert" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- SELECT: Creators, admins, directors, or those who can_view_project
CREATE POLICY "projects_select" ON public.projects
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR public.is_admin()
    OR public.is_director()
    OR public.can_view_project(id)
  );

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

-- DELETE: Only admins or directors
CREATE POLICY "projects_delete" ON public.projects
  FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR public.is_director()
  );

-- =====================================================================
-- 5. ENSURE get_auth_diagnostic() RPC EXISTS
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

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_auth_diagnostic() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_director() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_project(UUID) TO authenticated;
