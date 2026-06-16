DO $do$
BEGIN
    -- 1. Schema Integrity (Populate missing values to avoid constraint violations)
    UPDATE public.areas SET code = 'unknown_' || gen_random_uuid()::text WHERE code IS NULL OR code = '';
    UPDATE public.areas SET display_order = 0 WHERE display_order IS NULL;
    
    UPDATE public.profiles SET code = 'unknown_' || gen_random_uuid()::text WHERE code IS NULL OR code = '';
    
    UPDATE public.users SET full_name = 'User ' || gen_random_uuid()::text WHERE full_name IS NULL OR full_name = '';

    -- 2. Schema Integrity (Apply NOT NULL constraints)
    ALTER TABLE public.areas ALTER COLUMN code SET NOT NULL;
    ALTER TABLE public.areas ALTER COLUMN display_order SET NOT NULL;
    ALTER TABLE public.profiles ALTER COLUMN code SET NOT NULL;
    ALTER TABLE public.users ALTER COLUMN full_name SET NOT NULL;

    -- 3. Composite Unique Constraint
    ALTER TABLE public.area_responsibles DROP CONSTRAINT IF EXISTS uq_user_area;
    ALTER TABLE public.area_responsibles DROP CONSTRAINT IF EXISTS area_responsibles_user_area_key;
    ALTER TABLE public.area_responsibles ADD CONSTRAINT uq_user_area UNIQUE (user_id, area_id);

    -- 4. Referential Integrity
    ALTER TABLE public.area_responsibles DROP CONSTRAINT IF EXISTS area_responsibles_area_id_fkey;
    ALTER TABLE public.area_responsibles ADD CONSTRAINT area_responsibles_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id) ON DELETE RESTRICT;

    -- 5. Seeds Updates & Data Validation
    -- Areas Seed
    INSERT INTO public.areas (id, code, name, is_hub, display_order) VALUES
    (gen_random_uuid(), 'atendimento', 'Atendimento', true, 1),
    (gen_random_uuid(), 'estrategia', 'Estratégia', false, 2),
    (gen_random_uuid(), 'criacao', 'Criação', false, 3),
    (gen_random_uuid(), 'midia', 'Mídia', false, 4),
    (gen_random_uuid(), 'bi', 'BI (Business Intelligence)', false, 5),
    (gen_random_uuid(), 'conteudo', 'Conteúdo / Social Media', false, 6),
    (gen_random_uuid(), 'tecnologia', 'Tecnologia / Web', false, 7),
    (gen_random_uuid(), 'producao', 'Produção', false, 8),
    (gen_random_uuid(), 'projetos', 'Projetos', false, 9),
    (gen_random_uuid(), 'eventos', 'Eventos', false, 10),
    (gen_random_uuid(), 'pr', 'Relações Públicas (PR)', false, 11),
    (gen_random_uuid(), 'rh', 'RH / Administrativo', false, 12)
    ON CONFLICT (code) DO UPDATE SET 
        name = EXCLUDED.name, 
        is_hub = EXCLUDED.is_hub, 
        display_order = EXCLUDED.display_order;

    -- Profiles Seed
    INSERT INTO public.profiles (id, code, name, is_director, is_admin, is_system) VALUES
    (gen_random_uuid(), 'super_admin', 'Super Administrador', true, true, true),
    (gen_random_uuid(), 'diretor_area', 'Diretor de Área', true, false, true),
    (gen_random_uuid(), 'gerente_projetos', 'Gerente de Projetos', false, false, false),
    (gen_random_uuid(), 'atendimento_sr', 'Atendimento Sênior', false, false, false),
    (gen_random_uuid(), 'atendimento_pl', 'Atendimento Pleno', false, false, false),
    (gen_random_uuid(), 'atendimento_jr', 'Atendimento Júnior', false, false, false),
    (gen_random_uuid(), 'criacao_da', 'Diretor de Arte', false, false, false),
    (gen_random_uuid(), 'criacao_redator', 'Redator', false, false, false),
    (gen_random_uuid(), 'midia_sr', 'Mídia Sênior', false, false, false),
    (gen_random_uuid(), 'midia_pl', 'Mídia Pleno', false, false, false),
    (gen_random_uuid(), 'bi_analista', 'Analista de BI', false, false, false),
    (gen_random_uuid(), 'conteudo_cm', 'Community Manager', false, false, false),
    (gen_random_uuid(), 'tecnologia_dev', 'Desenvolvedor', false, false, false),
    (gen_random_uuid(), 'producao_rts', 'RTVC / Produção', false, false, false),
    (gen_random_uuid(), 'eventos_produtor', 'Produtor de Eventos', false, false, false),
    (gen_random_uuid(), 'pr_assessor', 'Assessor de Imprensa', false, false, false),
    (gen_random_uuid(), 'rh_analista', 'Analista de RH', false, false, false)
    ON CONFLICT (code) DO UPDATE SET 
        name = EXCLUDED.name, 
        is_director = EXCLUDED.is_director, 
        is_admin = EXCLUDED.is_admin, 
        is_system = EXCLUDED.is_system;

    -- Update initial user (Marcelo)
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'marcelo@side3.com.br') THEN
        UPDATE public.users 
        SET 
            full_name = 'Marcelo',
            profile_id = (SELECT id FROM public.profiles WHERE code = 'super_admin' LIMIT 1)
        WHERE email = 'marcelo@side3.com.br';
        
        -- Insert into area_responsibles for Marcelo
        INSERT INTO public.area_responsibles (user_id, area_id, is_principal)
        SELECT 
            u.id,
            a.id,
            true
        FROM public.users u
        CROSS JOIN public.areas a
        WHERE u.email = 'marcelo@side3.com.br' AND a.code = 'atendimento'
        ON CONFLICT (user_id, area_id) DO NOTHING;
    END IF;
END $do$;

-- 6. RLS Refactor (Recursion Prevention & Granularity)

-- Ensure SECURITY DEFINER function is robust
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN AS $func$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.profiles p ON u.profile_id = p.id
    WHERE u.id = auth.uid() AND p.is_admin = true
  );
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS safely
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.area_responsibles ENABLE ROW LEVEL SECURITY;

-- Areas Policies
DROP POLICY IF EXISTS "areas_select" ON public.areas;
DROP POLICY IF EXISTS "areas_insert" ON public.areas;
DROP POLICY IF EXISTS "areas_update" ON public.areas;
DROP POLICY IF EXISTS "areas_delete" ON public.areas;

CREATE POLICY "areas_select" ON public.areas FOR SELECT TO authenticated USING (true);
CREATE POLICY "areas_insert" ON public.areas FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "areas_update" ON public.areas FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "areas_delete" ON public.areas FOR DELETE TO authenticated USING (public.is_admin());

-- Profiles Policies
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "profiles_delete" ON public.profiles FOR DELETE TO authenticated USING (public.is_admin());

-- Users Policies
DROP POLICY IF EXISTS "users_select" ON public.users;
DROP POLICY IF EXISTS "users_insert" ON public.users;
DROP POLICY IF EXISTS "users_update" ON public.users;
DROP POLICY IF EXISTS "users_delete" ON public.users;

-- User self-access and admin full access
CREATE POLICY "users_select" ON public.users FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "users_insert" ON public.users FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "users_update" ON public.users FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin()) WITH CHECK (id = auth.uid() OR public.is_admin());
CREATE POLICY "users_delete" ON public.users FOR DELETE TO authenticated USING (public.is_admin());

-- Area Responsibles Policies
DROP POLICY IF EXISTS "area_responsibles_select" ON public.area_responsibles;
DROP POLICY IF EXISTS "area_responsibles_insert" ON public.area_responsibles;
DROP POLICY IF EXISTS "area_responsibles_update" ON public.area_responsibles;
DROP POLICY IF EXISTS "area_responsibles_delete" ON public.area_responsibles;

CREATE POLICY "area_responsibles_select" ON public.area_responsibles FOR SELECT TO authenticated USING (true);
CREATE POLICY "area_responsibles_insert" ON public.area_responsibles FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "area_responsibles_update" ON public.area_responsibles FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "area_responsibles_delete" ON public.area_responsibles FOR DELETE TO authenticated USING (public.is_admin());
