DO $do$
BEGIN
    -- Correction 1: Schema Updates
    ALTER TABLE public.areas 
        ADD COLUMN IF NOT EXISTS code TEXT,
        ADD COLUMN IF NOT EXISTS is_hub BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

    -- Ensure constraints for code
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'areas_code_key'
    ) THEN
        ALTER TABLE public.areas ADD CONSTRAINT areas_code_key UNIQUE (code);
    END IF;

    ALTER TABLE public.profiles 
        ADD COLUMN IF NOT EXISTS code TEXT,
        ADD COLUMN IF NOT EXISTS is_director BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'profiles_code_key'
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_code_key UNIQUE (code);
    END IF;

    ALTER TABLE public.users 
        ADD COLUMN IF NOT EXISTS full_name TEXT NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

    ALTER TABLE public.area_responsibles 
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

    -- Seeds Updates
    UPDATE public.areas SET is_hub = true WHERE code = 'atendimento';
    UPDATE public.areas SET is_hub = false WHERE code != 'atendimento';

    UPDATE public.profiles SET is_director = true WHERE code = 'diretor_area';
    UPDATE public.profiles SET is_director = false WHERE code != 'diretor_area';

    UPDATE public.profiles SET is_admin = true WHERE code = 'super_admin';
    UPDATE public.profiles SET is_admin = false WHERE code != 'super_admin';

    -- Correction 2: Composite Unique Constraint
    ALTER TABLE public.area_responsibles DROP CONSTRAINT IF EXISTS uq_user_area;
    ALTER TABLE public.area_responsibles DROP CONSTRAINT IF EXISTS area_responsibles_user_area_key;
    ALTER TABLE public.area_responsibles ADD CONSTRAINT uq_user_area UNIQUE (user_id, area_id);

    -- Correction 3: Referential Integrity
    ALTER TABLE public.area_responsibles DROP CONSTRAINT IF EXISTS area_responsibles_area_id_fkey;
    ALTER TABLE public.area_responsibles ADD CONSTRAINT area_responsibles_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id) ON DELETE RESTRICT;

END $do$;

-- Correction 4: Security Policies (RLS)
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.area_responsibles ENABLE ROW LEVEL SECURITY;

-- Clean up existing old policies to apply new ones
DROP POLICY IF EXISTS "authenticated_select_areas" ON public.areas;
DROP POLICY IF EXISTS "areas_select" ON public.areas;
DROP POLICY IF EXISTS "areas_insert" ON public.areas;
DROP POLICY IF EXISTS "areas_update" ON public.areas;
DROP POLICY IF EXISTS "areas_delete" ON public.areas;

DROP POLICY IF EXISTS "authenticated_select_profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;

DROP POLICY IF EXISTS "authenticated_select_users" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_select" ON public.users;
DROP POLICY IF EXISTS "users_insert" ON public.users;
DROP POLICY IF EXISTS "users_update" ON public.users;
DROP POLICY IF EXISTS "users_delete" ON public.users;

DROP POLICY IF EXISTS "authenticated_select_area_responsibles" ON public.area_responsibles;
DROP POLICY IF EXISTS "area_responsibles_select" ON public.area_responsibles;
DROP POLICY IF EXISTS "area_responsibles_insert" ON public.area_responsibles;
DROP POLICY IF EXISTS "area_responsibles_update" ON public.area_responsibles;
DROP POLICY IF EXISTS "area_responsibles_delete" ON public.area_responsibles;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN AS $func$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.profiles p ON u.profile_id = p.id
    WHERE u.id = auth.uid() AND p.is_admin = true
  );
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "areas_select" ON public.areas FOR SELECT TO authenticated USING (true);
CREATE POLICY "areas_insert" ON public.areas FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "areas_update" ON public.areas FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "areas_delete" ON public.areas FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "profiles_delete" ON public.profiles FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY "users_select" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_insert" ON public.users FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "users_update" ON public.users FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin()) WITH CHECK (id = auth.uid() OR public.is_admin());
CREATE POLICY "users_delete" ON public.users FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY "area_responsibles_select" ON public.area_responsibles FOR SELECT TO authenticated USING (true);
CREATE POLICY "area_responsibles_insert" ON public.area_responsibles FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "area_responsibles_update" ON public.area_responsibles FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "area_responsibles_delete" ON public.area_responsibles FOR DELETE TO authenticated USING (public.is_admin());
