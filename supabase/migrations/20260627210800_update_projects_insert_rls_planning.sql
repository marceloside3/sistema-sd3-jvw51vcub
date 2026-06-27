-- Update RLS INSERT policy on projects table
-- Allow authenticated users who are Admins, Directors, or Planning area members to create projects
-- This resolves the "new row violates row-level security policy for table projects" error

DROP POLICY IF EXISTS "projects_insert" ON public.projects;

CREATE POLICY "projects_insert" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      -- Is Admin
      EXISTS (
        SELECT 1 FROM public.users u
        JOIN public.profiles p ON p.id = u.profile_id
        WHERE u.id = auth.uid() AND p.is_admin = true
      )
      -- Is Director
      OR EXISTS (
        SELECT 1 FROM public.users u
        JOIN public.profiles p ON p.id = u.profile_id
        WHERE u.id = auth.uid() AND p.is_director = true
      )
      -- Is linked to the Planning area
      OR EXISTS (
        SELECT 1 FROM public.area_responsibles ar
        JOIN public.areas a ON a.id = ar.area_id
        WHERE ar.user_id = auth.uid() AND a.code = 'planejamento'
      )
    )
  );
