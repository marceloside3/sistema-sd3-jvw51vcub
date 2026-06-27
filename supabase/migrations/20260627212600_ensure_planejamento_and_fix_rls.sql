-- Ensure Planejamento area exists and user marcelo@side3.com.br is properly set up
-- Also fix RLS INSERT policy on projects table

-- 1. Ensure the Planejamento area exists (idempotent)
INSERT INTO public.areas (code, name, display_order, is_active)
VALUES ('planejamento', 'Planejamento', 3, true)
ON CONFLICT (code) DO NOTHING;

-- 2. Ensure auth user, profile, public.users record, and area association (idempotent)
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

  -- Ensure profile exists
  INSERT INTO public.profiles (id, code, name, is_admin, is_system, is_active)
  VALUES (v_user_id, 'ADM-MARC', 'Marcelo', true, false, true)
  ON CONFLICT (id) DO NOTHING;

  -- Ensure public.users record exists with profile link
  INSERT INTO public.users (id, email, full_name, profile_id, is_active)
  VALUES (v_user_id, 'marcelo@side3.com.br', 'Marcelo', v_user_id, true)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    profile_id = COALESCE(public.users.profile_id, EXCLUDED.profile_id);

  -- Link user to planejamento area
  SELECT id INTO v_area_id FROM public.areas WHERE code = 'planejamento';
  IF v_area_id IS NOT NULL THEN
    INSERT INTO public.area_responsibles (user_id, area_id, is_principal)
    VALUES (v_user_id, v_area_id, true)
    ON CONFLICT (user_id, area_id) DO NOTHING;
  END IF;
END $$;

-- 3. Fix RLS INSERT policy on projects table
-- Drop any existing restrictive INSERT policies and create a simple one
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
CREATE POLICY "projects_insert" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- 4. Ensure project creators can update their own projects
DROP POLICY IF EXISTS "projects_update" ON public.projects;
CREATE POLICY "projects_update" ON public.projects
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_director = true)
    OR created_by = auth.uid()
  );

-- 5. Ensure project creators can manage project areas
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
