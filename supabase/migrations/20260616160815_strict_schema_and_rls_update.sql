-- 1. Schema Enforcement
DO $do$
DECLARE
  null_count INT;
BEGIN
    -- Validation Step before applying NOT NULL
    -- Areas code
    SELECT COUNT(*) INTO null_count FROM public.areas WHERE code IS NULL;
    IF null_count > 0 THEN
        RAISE NOTICE 'Fixing % null codes in areas', null_count;
        UPDATE public.areas SET code = 'unknown_' || gen_random_uuid()::text WHERE code IS NULL OR code = '';
    END IF;

    -- Areas display_order
    SELECT COUNT(*) INTO null_count FROM public.areas WHERE display_order IS NULL;
    IF null_count > 0 THEN
        RAISE NOTICE 'Fixing % null display_order in areas', null_count;
        UPDATE public.areas SET display_order = 0 WHERE display_order IS NULL;
    END IF;

    -- Profiles code
    SELECT COUNT(*) INTO null_count FROM public.profiles WHERE code IS NULL;
    IF null_count > 0 THEN
        RAISE NOTICE 'Fixing % null codes in profiles', null_count;
        UPDATE public.profiles SET code = 'unknown_' || gen_random_uuid()::text WHERE code IS NULL OR code = '';
    END IF;

    -- Users full_name
    SELECT COUNT(*) INTO null_count FROM public.users WHERE full_name IS NULL;
    IF null_count > 0 THEN
        RAISE NOTICE 'Fixing % null full_names in users', null_count;
        UPDATE public.users SET full_name = 'User ' || gen_random_uuid()::text WHERE full_name IS NULL OR full_name = '';
    END IF;
END $do$;

ALTER TABLE public.areas ALTER COLUMN code SET NOT NULL;
ALTER TABLE public.areas ALTER COLUMN display_order SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN code SET NOT NULL;
ALTER TABLE public.users ALTER COLUMN full_name SET NOT NULL;

-- 2. Composite Unique Integrity
DO $do$
DECLARE
  dup_count INT;
BEGIN
    SELECT COUNT(*) INTO dup_count FROM (
        SELECT user_id, area_id FROM public.area_responsibles GROUP BY user_id, area_id HAVING COUNT(*) > 1
    ) AS dups;

    IF dup_count > 0 THEN
        RAISE NOTICE 'Removing % duplicate pairs in area_responsibles', dup_count;
        DELETE FROM public.area_responsibles a
        USING public.area_responsibles b
        WHERE a.user_id = b.user_id 
          AND a.area_id = b.area_id 
          AND a.id > b.id;
    END IF;
END $do$;

ALTER TABLE public.area_responsibles DROP CONSTRAINT IF EXISTS area_responsibles_user_area_key;
ALTER TABLE public.area_responsibles DROP CONSTRAINT IF EXISTS uq_user_area;
ALTER TABLE public.area_responsibles ADD CONSTRAINT uq_user_area UNIQUE (user_id, area_id);

-- 3. PostgreSQL Compatible Data Updates & 5. Accurate Seed Data
-- 12 Areas (Atendimento is hub, others sequential)
INSERT INTO public.areas (id, code, name, is_hub, display_order) VALUES
(gen_random_uuid(), 'atendimento', 'Atendimento', true, 1),
(gen_random_uuid(), 'rh', 'RH', false, 2),
(gen_random_uuid(), 'financeiro', 'Financeiro', false, 3),
(gen_random_uuid(), 'marketing', 'Marketing', false, 4),
(gen_random_uuid(), 'ti', 'TI', false, 5),
(gen_random_uuid(), 'juridico', 'Jurídico', false, 6),
(gen_random_uuid(), 'vendas', 'Vendas', false, 7),
(gen_random_uuid(), 'logistica', 'Logística', false, 8),
(gen_random_uuid(), 'operacoes', 'Operações', false, 9),
(gen_random_uuid(), 'administrativo', 'Administrativo', false, 10),
(gen_random_uuid(), 'comercial', 'Comercial', false, 11),
(gen_random_uuid(), 'suporte', 'Suporte', false, 12)
ON CONFLICT (code) DO UPDATE SET 
    name = EXCLUDED.name, 
    is_hub = EXCLUDED.is_hub;

-- Use CTE to reorder display_order sequentially for areas
WITH numbered AS (
    SELECT id, row_number() OVER (ORDER BY (CASE WHEN is_hub THEN 0 ELSE 1 END), created_at) as rn
    FROM public.areas
)
UPDATE public.areas a
SET display_order = numbered.rn
FROM numbered
WHERE a.id = numbered.id;

-- 17 Profiles
INSERT INTO public.profiles (id, code, name, is_director, is_admin, is_system) VALUES
(gen_random_uuid(), 'super_admin', 'Super Admin', true, true, true),
(gen_random_uuid(), 'diretor', 'Diretor', true, false, false),
(gen_random_uuid(), 'social', 'Social', false, false, false),
(gen_random_uuid(), 'midia', 'Mídia', false, false, false),
(gen_random_uuid(), 'influs', 'Influs', false, false, false),
(gen_random_uuid(), 'rh_analista', 'Analista de RH', false, false, false),
(gen_random_uuid(), 'financeiro_analista', 'Analista Financeiro', false, false, false),
(gen_random_uuid(), 'marketing_analista', 'Analista de Marketing', false, false, false),
(gen_random_uuid(), 'ti_suporte', 'Suporte de TI', false, false, false),
(gen_random_uuid(), 'juridico_advogado', 'Advogado', false, false, false),
(gen_random_uuid(), 'vendas_executivo', 'Executivo de Vendas', false, false, false),
(gen_random_uuid(), 'logistica_coordenador', 'Coordenador de Logística', false, false, false),
(gen_random_uuid(), 'operacoes_gerente', 'Gerente de Operações', false, false, false),
(gen_random_uuid(), 'administrativo_assistente', 'Assistente Administrativo', false, false, false),
(gen_random_uuid(), 'comercial_gerente', 'Gerente Comercial', false, false, false),
(gen_random_uuid(), 'suporte_analista', 'Analista de Suporte', false, false, false),
(gen_random_uuid(), 'atendimento_gerente', 'Gerente de Atendimento', false, false, false)
ON CONFLICT (code) DO UPDATE SET 
    name = EXCLUDED.name, 
    is_director = EXCLUDED.is_director, 
    is_admin = EXCLUDED.is_admin, 
    is_system = EXCLUDED.is_system;

-- Update Admin user if exists
DO $do$
BEGIN
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'marcelo@side3.com.br') THEN
        UPDATE public.users 
        SET 
            full_name = 'Marcelo',
            profile_id = (SELECT id FROM public.profiles WHERE code = 'super_admin' LIMIT 1)
        WHERE email = 'marcelo@side3.com.br';
    END IF;
END $do$;

-- 6. Foreign Key Integrity
ALTER TABLE public.area_responsibles DROP CONSTRAINT IF EXISTS area_responsibles_area_id_fkey;
ALTER TABLE public.area_responsibles ADD CONSTRAINT area_responsibles_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id) ON DELETE RESTRICT;

-- 4. Secure RLS Architecture
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN AS $func$
BEGIN
  RETURN (
    current_setting('role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.profiles p ON u.profile_id = p.id
      WHERE u.id = auth.uid() AND p.is_admin = true
    )
  );
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.area_responsibles ENABLE ROW LEVEL SECURITY;

-- Service role bypass policies
DROP POLICY IF EXISTS "service_role_areas" ON public.areas;
CREATE POLICY "service_role_areas" ON public.areas FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_profiles" ON public.profiles;
CREATE POLICY "service_role_profiles" ON public.profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_users" ON public.users;
CREATE POLICY "service_role_users" ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_area_responsibles" ON public.area_responsibles;
CREATE POLICY "service_role_area_responsibles" ON public.area_responsibles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Areas Policies
DROP POLICY IF EXISTS "areas_select" ON public.areas;
CREATE POLICY "areas_select" ON public.areas FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "areas_insert" ON public.areas;
CREATE POLICY "areas_insert" ON public.areas FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "areas_update" ON public.areas;
CREATE POLICY "areas_update" ON public.areas FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "areas_delete" ON public.areas;
CREATE POLICY "areas_delete" ON public.areas FOR DELETE TO authenticated USING (public.is_admin());

-- Profiles Policies
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;
CREATE POLICY "profiles_delete" ON public.profiles FOR DELETE TO authenticated USING (public.is_admin());

-- Users Policies
DROP POLICY IF EXISTS "users_select" ON public.users;
CREATE POLICY "users_select" ON public.users FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "users_insert" ON public.users;
CREATE POLICY "users_insert" ON public.users FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "users_update" ON public.users;
CREATE POLICY "users_update" ON public.users FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin()) WITH CHECK (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "users_delete" ON public.users;
CREATE POLICY "users_delete" ON public.users FOR DELETE TO authenticated USING (public.is_admin());

-- Area Responsibles Policies
DROP POLICY IF EXISTS "area_responsibles_select" ON public.area_responsibles;
CREATE POLICY "area_responsibles_select" ON public.area_responsibles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "area_responsibles_insert" ON public.area_responsibles;
CREATE POLICY "area_responsibles_insert" ON public.area_responsibles FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "area_responsibles_update" ON public.area_responsibles;
CREATE POLICY "area_responsibles_update" ON public.area_responsibles FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "area_responsibles_delete" ON public.area_responsibles;
CREATE POLICY "area_responsibles_delete" ON public.area_responsibles FOR DELETE TO authenticated USING (public.is_admin());

-- 7. Evidence Requirements Output
DO $do$
DECLARE
  area_count INT;
  profile_count INT;
BEGIN
  SELECT count(*) INTO area_count FROM public.areas;
  SELECT count(*) INTO profile_count FROM public.profiles;
  
  RAISE NOTICE 'Migration Success Evidence:';
  RAISE NOTICE 'Areas Count: %', area_count;
  RAISE NOTICE 'Profiles Count: %', profile_count;
END $do$;
