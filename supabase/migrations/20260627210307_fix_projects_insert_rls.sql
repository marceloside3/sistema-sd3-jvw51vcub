-- Fix RLS INSERT policy on projects table
-- Allow authenticated users to create projects where created_by = auth.uid()
-- This enables Planning area members (non-director, non-admin) to create projects

DROP POLICY IF EXISTS "projects_insert" ON public.projects;

CREATE POLICY "projects_insert" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
