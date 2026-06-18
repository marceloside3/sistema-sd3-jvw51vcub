-- Set up transactions and safely handle defaults if needed
DO $$
BEGIN
  -- Safe default update for any possible nulls in created_by before enforcing NOT NULL
  UPDATE public.projects 
  SET created_by = (SELECT id FROM public.users ORDER BY created_at ASC LIMIT 1) 
  WHERE created_by IS NULL;

  -- 1. Database Integrity Constraints (Projects Table)
  ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_created_by_fkey;
  ALTER TABLE public.projects ADD CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;
  
  ALTER TABLE public.projects ALTER COLUMN created_by SET NOT NULL;

  -- 2. Database Integrity Constraints (Demands Table)
  ALTER TABLE public.demands DROP CONSTRAINT IF EXISTS demands_from_area_id_fkey;
  ALTER TABLE public.demands ADD CONSTRAINT demands_from_area_id_fkey FOREIGN KEY (from_area_id) REFERENCES public.areas(id) ON DELETE RESTRICT;
END $$;

-- 3. System Configuration Security (RLS Policies)
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_config_select" ON public.system_config;
CREATE POLICY "system_config_select" ON public.system_config
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "system_config_update" ON public.system_config;
CREATE POLICY "system_config_update" ON public.system_config
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      JOIN public.users ON public.profiles.id = public.users.profile_id
      WHERE public.users.id = auth.uid() AND public.profiles.is_admin = true
    )
  );

-- 4. Secure DB Functions (SECURITY DEFINER SET search_path = public)
CREATE OR REPLACE FUNCTION public.on_demand_inserted()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.to_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (NEW.to_user_id, 'demand_assigned', 'Nova demanda atribuída', 'Você recebeu a demanda: ' || NEW.title, '/demandas/' || NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.on_demand_updated()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'done' AND OLD.status != 'done' THEN
      NEW.completed_at = NOW();
    END IF;
    
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (NEW.from_user_id, 'demand_status_changed', 'Status da demanda alterado', 'A demanda ' || NEW.title || ' mudou para ' || NEW.status, '/demandas/' || NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
