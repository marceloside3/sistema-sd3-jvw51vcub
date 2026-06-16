-- 1. Create tables with strict constraints
CREATE TABLE IF NOT EXISTS public.areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    is_hub BOOLEAN NOT NULL DEFAULT false,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    is_director BOOLEAN NOT NULL DEFAULT false,
    is_admin BOOLEAN NOT NULL DEFAULT false,
    is_system BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.area_responsibles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
    is_principal BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes and composite constraints
ALTER TABLE public.area_responsibles DROP CONSTRAINT IF EXISTS area_responsibles_user_area_key;
ALTER TABLE public.area_responsibles ADD CONSTRAINT area_responsibles_user_area_key UNIQUE (user_id, area_id);

DROP INDEX IF EXISTS unique_principal_per_area;
CREATE UNIQUE INDEX unique_principal_per_area ON public.area_responsibles (area_id) WHERE is_principal = true;

-- Ensure constraints are there for seeds
ALTER TABLE public.areas DROP CONSTRAINT IF EXISTS areas_code_key;
ALTER TABLE public.areas ADD CONSTRAINT areas_code_key UNIQUE (code);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_code_key;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_code_key UNIQUE (code);

-- 3. Row Level Security Policies
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.area_responsibles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_areas" ON public.areas;
CREATE POLICY "authenticated_select_areas" ON public.areas FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_select_profiles" ON public.profiles;
CREATE POLICY "authenticated_select_profiles" ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_select_users" ON public.users;
CREATE POLICY "authenticated_select_users" ON public.users FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "authenticated_select_area_responsibles" ON public.area_responsibles;
CREATE POLICY "authenticated_select_area_responsibles" ON public.area_responsibles FOR SELECT TO authenticated USING (true);

-- 4. Seed Block
DO $seed$
DECLARE
    super_admin_profile_id UUID;
    new_user_id UUID;
    rec RECORD;
BEGIN
    -- Seed 12 Areas
    INSERT INTO public.areas (code, name, is_hub, display_order) VALUES
        ('comercial', 'Comercial', false, 1),
        ('atendimento', 'Atendimento', true, 2),
        ('planejamento', 'Planejamento', false, 3),
        ('criacao', 'Criação', false, 4),
        ('social', 'Social', false, 5),
        ('midia', 'Mídia', false, 6),
        ('influs', 'Influs', false, 7),
        ('producao', 'Produção', false, 8),
        ('financeiro', 'Financeiro', false, 9),
        ('fiscal_contabil', 'Fiscal e Contábil', false, 10),
        ('juridico', 'Jurídico', false, 11),
        ('administrativo_rh', 'Administrativo e RH', false, 12)
    ON CONFLICT (code) DO NOTHING;

    -- Seed 17 Profiles
    INSERT INTO public.profiles (code, name, is_admin, is_director) VALUES
        ('super_admin', 'Super Admin', true, false),
        ('diretor_area', 'Diretor de Área', false, true),
        ('gerente', 'Gerente', false, false),
        ('coordenador', 'Coordenador', false, false),
        ('supervisor', 'Supervisor', false, false),
        ('analista_senior', 'Analista Sênior', false, false),
        ('analista_pleno', 'Analista Pleno', false, false),
        ('analista_junior', 'Analista Júnior', false, false),
        ('assistente', 'Assistente', false, false),
        ('estagiario', 'Estagiário', false, false),
        ('redator', 'Redator', false, false),
        ('designer', 'Designer', false, false),
        ('desenvolvedor', 'Desenvolvedor', false, false),
        ('videomaker', 'Videomaker', false, false),
        ('atendimento_perfil', 'Atendimento', false, false),
        ('rh_perfil', 'Recursos Humanos', false, false),
        ('financeiro_analista', 'Analista Financeiro', false, false)
    ON CONFLICT (code) DO NOTHING;

    SELECT id INTO super_admin_profile_id FROM public.profiles WHERE code = 'super_admin' LIMIT 1;

    -- Seed Initial Super Admin User
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'marcelo@side3.com.br') THEN
        new_user_id := gen_random_uuid();
        INSERT INTO auth.users (
            id, instance_id, email, encrypted_password, email_confirmed_at,
            created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
            is_super_admin, role, aud,
            confirmation_token, recovery_token, email_change_token_new,
            email_change, email_change_token_current,
            phone, phone_change, phone_change_token, reauthentication_token
        ) VALUES (
            new_user_id,
            '00000000-0000-0000-0000-000000000000',
            'marcelo@side3.com.br',
            crypt('Side3@2026', gen_salt('bf')),
            NOW(), NOW(), NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{"name": "Marcelo"}',
            false, 'authenticated', 'authenticated',
            '', '', '', '', '', NULL, '', '', ''
        );

        INSERT INTO public.users (id, email, full_name, profile_id)
        VALUES (new_user_id, 'marcelo@side3.com.br', 'Marcelo', super_admin_profile_id)
        ON CONFLICT (id) DO UPDATE SET 
            full_name = EXCLUDED.full_name, 
            profile_id = EXCLUDED.profile_id;
    END IF;

    -- Fetch the exact user ID for Marcel to assign areas
    SELECT id INTO new_user_id FROM auth.users WHERE email = 'marcelo@side3.com.br' LIMIT 1;
    
    IF new_user_id IS NOT NULL THEN
        FOR rec IN SELECT id FROM public.areas LOOP
            INSERT INTO public.area_responsibles (user_id, area_id, is_principal)
            VALUES (new_user_id, rec.id, false)
            ON CONFLICT (user_id, area_id) DO NOTHING;
        END LOOP;
    END IF;
END $seed$;
