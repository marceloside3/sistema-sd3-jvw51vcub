-- Link marcelo@side3.com.br to the Planejamento area and fix RLS policies
-- This enables Planning area members to create projects without RLS errors

DO $$
DECLARE
  v_user_id UUID;
  v_area_id UUID;
BEGIN
  -- Get the user ID for marcelo@side3.com.br from auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'marcelo@side3.com.br';

  -- Get the planejamento area ID
  SELECT id INTO v_area_id FROM public.areas WHERE code = 'planejamento';

  -- Ensure the user has a public.users record (idempotent)
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.users (id, email, full_name, profile_id)
    VALUES (v_user_id, 'marcelo@side3.com.br', 'Marcelo', v_user_id)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Link user to the planejamento area if both exist (idempotent)
  IF v_user_id IS NOT NULL AND v_area_id IS NOT NULL THEN
    INSERT INTO public.area_responsibles (user_id, area_id, is_principal)
    VALUES (v_user_id, v_area_id, true)
    ON CONFLICT (user_id, area_id) DO NOTHING;
  END IF;
END $$;

-- Simplify the INSERT policy on projects table
-- Allow any authenticated user to create a project where they are the creator
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
CREATE POLICY "projects_insert" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Allow project creators to update their own projects (in addition to admins/directors)
DROP POLICY IF EXISTS "projects_update" ON public.projects;
CREATE POLICY "projects_update" ON public.projects
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_director = true)
    OR created_by = auth.uid()
  );

-- Allow project creators to insert project areas
DROP POLICY IF EXISTS "project_areas_insert" ON public.project_areas;
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

-- Allow project creators to update project areas
DROP POLICY IF EXISTS "project_areas_update" ON public.project_areas;
CREATE POLICY "project_areas_update" ON public.project_areas
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_director = true)
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.created_by = auth.uid()
    )
  );

-- Allow project creators to delete project areas
DROP POLICY IF EXISTS "project_areas_delete" ON public.project_areas;
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
