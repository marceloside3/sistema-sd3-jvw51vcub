-- Setup for System Config
CREATE TABLE IF NOT EXISTS public.system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Setup for Projects
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code TEXT UNIQUE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Setup for Project Areas
CREATE TABLE IF NOT EXISTS public.project_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  is_lead BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, area_id)
);

-- Setup for Demands
CREATE TABLE IF NOT EXISTS public.demands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  from_area_id UUID REFERENCES public.areas(id) ON DELETE SET NULL,
  to_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  to_area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'review', 'done', 'cancelled', 'rejected')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Setup for Demand Comments
CREATE TABLE IF NOT EXISTS public.demand_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id UUID NOT NULL REFERENCES public.demands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Setup for Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Realtime for notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- Updated at triggers
DROP TRIGGER IF EXISTS set_projects_updated_at ON public.projects;
CREATE TRIGGER set_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_demands_updated_at ON public.demands;
CREATE TRIGGER set_demands_updated_at BEFORE UPDATE ON public.demands FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_system_config_updated_at ON public.system_config;
CREATE TRIGGER set_system_config_updated_at BEFORE UPDATE ON public.system_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Atomic Code Generation Function
CREATE OR REPLACE FUNCTION public.generate_project_code(p_client_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_client_code TEXT;
  v_year TEXT;
  v_count INT;
  v_new_code TEXT;
BEGIN
  SELECT code INTO v_client_code FROM public.clients WHERE id = p_client_id FOR UPDATE;
  IF v_client_code IS NULL THEN
    RAISE EXCEPTION 'Client not found';
  END IF;

  v_year := to_char(NOW(), 'YYYY');

  SELECT COUNT(*) INTO v_count
  FROM public.projects
  WHERE client_id = p_client_id AND to_char(created_at, 'YYYY') = v_year;

  v_new_code := v_client_code || '-' || v_year || '-' || LPAD((v_count + 1)::TEXT, 3, '0');

  RETURN v_new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-generate code on project insert
CREATE OR REPLACE FUNCTION public.set_project_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.project_code IS NULL THEN
    NEW.project_code := public.generate_project_code(NEW.client_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_set_project_code ON public.projects;
CREATE TRIGGER tr_set_project_code BEFORE INSERT ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_project_code();

-- Feature Flag default
INSERT INTO public.system_config (key, value) VALUES ('email_notifications_enabled', 'false') ON CONFLICT (key) DO NOTHING;

-- Trigger functions for Demands
CREATE OR REPLACE FUNCTION public.on_demand_inserted()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.to_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (NEW.to_user_id, 'demand_assigned', 'Nova demanda atribuída', 'Você recebeu a demanda: ' || NEW.title, '/demandas/' || NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_demand_inserted ON public.demands;
CREATE TRIGGER tr_demand_inserted AFTER INSERT ON public.demands FOR EACH ROW EXECUTE FUNCTION public.on_demand_inserted();

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_demand_updated ON public.demands;
CREATE TRIGGER tr_demand_updated BEFORE UPDATE ON public.demands FOR EACH ROW EXECUTE FUNCTION public.on_demand_updated();

CREATE OR REPLACE FUNCTION public.on_demand_commented()
RETURNS TRIGGER AS $$
DECLARE
  v_demand RECORD;
  v_notify_user UUID;
BEGIN
  SELECT * INTO v_demand FROM public.demands WHERE id = NEW.demand_id;
  
  IF NEW.user_id = v_demand.from_user_id THEN
    IF v_demand.to_user_id IS NOT NULL THEN
      v_notify_user := v_demand.to_user_id;
    END IF;
  ELSE
    v_notify_user := v_demand.from_user_id;
  END IF;

  IF v_notify_user IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (v_notify_user, 'demand_commented', 'Novo comentário', 'Sua demanda tem um novo comentário.', '/demandas/' || NEW.demand_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_demand_commented ON public.demand_comments;
CREATE TRIGGER tr_demand_commented AFTER INSERT ON public.demand_comments FOR EACH ROW EXECUTE FUNCTION public.on_demand_commented();

-- Setup RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper function for project visibility logic
CREATE OR REPLACE FUNCTION public.user_can_access_project(p_project_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_profile RECORD;
BEGIN
  SELECT p.is_admin, p.is_director INTO v_user_profile
  FROM public.users u
  JOIN public.profiles p ON p.id = u.profile_id
  WHERE u.id = auth.uid();
  
  IF v_user_profile.is_admin THEN
    RETURN true;
  END IF;

  IF v_user_profile.is_director THEN
    IF EXISTS (
      SELECT 1 FROM public.project_areas pa
      JOIN public.area_responsibles ar ON ar.area_id = pa.area_id
      WHERE pa.project_id = p_project_id AND ar.user_id = auth.uid()
    ) THEN
      RETURN true;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.demands d
    WHERE d.project_id = p_project_id AND (d.from_user_id = auth.uid() OR d.to_user_id = auth.uid())
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies Project
DROP POLICY IF EXISTS "projects_select" ON public.projects;
CREATE POLICY "projects_select" ON public.projects FOR SELECT TO authenticated USING (public.user_can_access_project(id));

DROP POLICY IF EXISTS "projects_insert" ON public.projects;
CREATE POLICY "projects_insert" ON public.projects FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles JOIN users ON profiles.id = users.profile_id WHERE users.id = auth.uid() AND (profiles.is_admin = true OR profiles.is_director = true)));

DROP POLICY IF EXISTS "projects_update" ON public.projects;
CREATE POLICY "projects_update" ON public.projects FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles JOIN users ON profiles.id = users.profile_id WHERE users.id = auth.uid() AND (profiles.is_admin = true OR profiles.is_director = true)));

-- RLS Policies Project Areas
DROP POLICY IF EXISTS "project_areas_select" ON public.project_areas;
CREATE POLICY "project_areas_select" ON public.project_areas FOR SELECT TO authenticated USING (public.user_can_access_project(project_id));

DROP POLICY IF EXISTS "project_areas_insert" ON public.project_areas;
CREATE POLICY "project_areas_insert" ON public.project_areas FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles JOIN users ON profiles.id = users.profile_id WHERE users.id = auth.uid() AND (profiles.is_admin = true OR profiles.is_director = true)));

DROP POLICY IF EXISTS "project_areas_delete" ON public.project_areas;
CREATE POLICY "project_areas_delete" ON public.project_areas FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles JOIN users ON profiles.id = users.profile_id WHERE users.id = auth.uid() AND (profiles.is_admin = true OR profiles.is_director = true)));

-- RLS Policies Demands
DROP POLICY IF EXISTS "demands_select" ON public.demands;
CREATE POLICY "demands_select" ON public.demands FOR SELECT TO authenticated USING (public.user_can_access_project(project_id));

DROP POLICY IF EXISTS "demands_insert" ON public.demands;
CREATE POLICY "demands_insert" ON public.demands FOR INSERT TO authenticated WITH CHECK (from_user_id = auth.uid());

DROP POLICY IF EXISTS "demands_update" ON public.demands;
CREATE POLICY "demands_update" ON public.demands FOR UPDATE TO authenticated USING (public.user_can_access_project(project_id));

-- RLS Policies Demand Comments
DROP POLICY IF EXISTS "demand_comments_select" ON public.demand_comments;
CREATE POLICY "demand_comments_select" ON public.demand_comments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM demands WHERE demands.id = demand_comments.demand_id AND public.user_can_access_project(demands.project_id)));

DROP POLICY IF EXISTS "demand_comments_insert" ON public.demand_comments;
CREATE POLICY "demand_comments_insert" ON public.demand_comments FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM demands WHERE demands.id = demand_comments.demand_id AND public.user_can_access_project(demands.project_id)));

-- RLS Policies Notifications
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_delete" ON public.notifications;
CREATE POLICY "notifications_delete" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

