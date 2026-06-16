DO $$
BEGIN
  CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS set_users_updated_at ON public.users;
  CREATE TRIGGER set_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

  DROP TRIGGER IF EXISTS set_areas_updated_at ON public.areas;
  CREATE TRIGGER set_areas_updated_at
    BEFORE UPDATE ON public.areas
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

  DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
  CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
END $$;
