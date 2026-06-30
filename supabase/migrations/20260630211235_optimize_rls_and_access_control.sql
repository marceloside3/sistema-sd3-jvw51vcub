-- =====================================================================
-- RLS Policy Optimization for users, profiles, areas, area_responsibles
-- Consolidates and simplifies SELECT policies to prevent conflicts
-- =====================================================================

-- =====================================================================
-- 1. users table: drop conflicting policies, keep single clean SELECT policy
-- =====================================================================

DROP POLICY IF EXISTS "users_select" ON public.users;
DROP POLICY IF EXISTS "authenticated_select_users" ON public.users;

CREATE POLICY "authenticated_select_users" ON public.users
  FOR SELECT TO authenticated USING (true);

-- =====================================================================
-- 2. profiles table: ensure authenticated SELECT policy
-- =====================================================================

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_select_profiles" ON public.profiles;

CREATE POLICY "authenticated_select_profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

-- =====================================================================
-- 3. areas table: ensure authenticated SELECT policy
-- =====================================================================

DROP POLICY IF EXISTS "areas_select" ON public.areas;
DROP POLICY IF EXISTS "authenticated_select_areas" ON public.areas;

CREATE POLICY "authenticated_select_areas" ON public.areas
  FOR SELECT TO authenticated USING (true);

-- =====================================================================
-- 4. area_responsibles table: ensure authenticated SELECT policy
-- =====================================================================

DROP POLICY IF EXISTS "area_responsibles_select" ON public.area_responsibles;
DROP POLICY IF EXISTS "authenticated_select_area_responsibles" ON public.area_responsibles;

CREATE POLICY "authenticated_select_area_responsibles" ON public.area_responsibles
  FOR SELECT TO authenticated USING (true);
