-- System Config
CREATE TABLE IF NOT EXISTS public.system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.system_config (key, value) VALUES ('email_notifications_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

-- Projects
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code TEXT UNIQUE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES public.users(id) ON DELETE RESTRICT DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Project Areas
CREATE TABLE IF NOT EXISTS public.project_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  area_id UUID REFERENCES public.areas(id) ON DELETE CASCADE,
  is_lead BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, area_id)
);

-- Demands
CREATE TABLE IF NOT EXISTS public.demands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES public.users(id) ON DELETE RESTRICT,
  from_area_id UUID REFERENCES public.areas(id) ON DELETE RESTRICT,
  to_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  to_area_id UUID REFERENCES public.areas(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'review', 'done', 'cancelled', 'rejected')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  due_date DATE,
  cancellation_reason TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Demand Comments
CREATE TABLE IF NOT EXISTS public.demand_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id UUID REFERENCES public.demands(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE RESTRICT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Generate Project Code Function
CREATE OR REPLACE FUNCTION public.generate_project_code(p_client_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_code TEXT;
  v_year TEXT;
  v_count INT;
  v_project_code TEXT;
BEGIN
  SELECT code INTO v_client_code
  FROM public.clients
  WHERE id = p_client_id
  FOR UPDATE;

  IF v_client_code IS NULL THEN
    RAISE EXCEPTION 'Client not found';
  END IF;

  v_year := to_char(CURRENT_DATE, 'YYYY');
  
  SELECT COUNT(*) INTO v_count
  FROM public.projects
  WHERE client_id = p_client_id
    AND to_char(created_at, 'YYYY') = v_year;

  v_project_code := v_client_code || '-' || v_year || '-' || LPAD((v_count + 1)::TEXT, 3, '0');
  RETURN v_project_code;
END;
$$;

-- View Permission Function (Security Definer to bypass RLS recursion)
CREATE OR REPLACE FUNCTION public.can_view_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT 
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_director = true
      AND EXISTS (
        SELECT 1 FROM public.project_areas pa
        JOIN public.area_responsibles ar ON ar.area_id = pa.area_id
        WHERE pa.project_id = p_project_id AND ar.user_id = auth.uid()
      )
    ) OR
    EXISTS (
      SELECT 1 FROM public.demands d
      WHERE d.project_id = p_project_id
      AND (d.from_user_id = auth.uid() OR d.to_user_id = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM public.projects p WHERE p.id = p_project_id AND p.created_by = auth.uid()
    );
$$;

-- Triggers for Updated At
DROP TRIGGER IF EXISTS set_projects_updated_at ON public.projects;
CREATE TRIGGER set_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_demands_updated_at ON public.demands;
CREATE TRIGGER set_demands_updated_at BEFORE UPDATE ON public.demands FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_demand_comments_updated_at ON public.demand_comments;
CREATE TRIGGER set_demand_comments_updated_at BEFORE UPDATE ON public.demand_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notification Triggers
CREATE OR REPLACE FUNCTION public.handle_demand_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.to_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      NEW.to_user_id, 'demand_assigned', 'Nova Demanda',
      'Você foi atribuído à demanda: ' || NEW.title, '/demandas/' || NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS demand_insert_trigger ON public.demands;
CREATE TRIGGER demand_insert_trigger AFTER INSERT ON public.demands FOR EACH ROW EXECUTE FUNCTION public.handle_demand_insert();

CREATE OR REPLACE FUNCTION public.handle_demand_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    IF NEW.status = 'done' THEN
      NEW.completed_at = NOW();
    END IF;
    
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (
      NEW.from_user_id, 'demand_status_changed', 'Status Atualizado',
      'A demanda "' || NEW.title || '" mudou para: ' || NEW.status, '/demandas/' || NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS demand_update_trigger ON public.demands;
CREATE TRIGGER demand_update_trigger BEFORE UPDATE ON public.demands FOR EACH ROW EXECUTE FUNCTION public.handle_demand_update();

CREATE OR REPLACE FUNCTION public.handle_demand_comment()
RETURNS TRIGGER AS $$
DECLARE
  v_demand_from UUID;
  v_demand_to UUID;
  v_title TEXT;
BEGIN
  SELECT from_user_id, to_user_id, title INTO v_demand_from, v_demand_to, v_title
  FROM public.demands WHERE id = NEW.demand_id;

  IF NEW.user_id = v_demand_from AND v_demand_to IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (v_demand_to, 'demand_commented', 'Novo Comentário', 'Comentário em: ' || v_title, '/demandas/' || NEW.demand_id);
  ELSIF NEW.user_id = v_demand_to THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (v_demand_from, 'demand_commented', 'Novo Comentário', 'Comentário em: ' || v_title, '/demandas/' || NEW.demand_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS demand_comment_trigger ON public.demand_comments;
CREATE TRIGGER demand_comment_trigger AFTER INSERT ON public.demand_comments FOR EACH ROW EXECUTE FUNCTION public.handle_demand_comment();

-- RLS Policies
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "system_config_select" ON public.system_config;
CREATE POLICY "system_config_select" ON public.system_config FOR SELECT TO authenticated USING (true);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "projects_select" ON public.projects;
CREATE POLICY "projects_select" ON public.projects FOR SELECT TO authenticated USING (public.can_view_project(id));
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
CREATE POLICY "projects_insert" ON public.projects FOR INSERT TO authenticated WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_director = true));
DROP POLICY IF EXISTS "projects_update" ON public.projects;
CREATE POLICY "projects_update" ON public.projects FOR UPDATE TO authenticated USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_director = true));

ALTER TABLE public.project_areas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_areas_select" ON public.project_areas;
CREATE POLICY "project_areas_select" ON public.project_areas FOR SELECT TO authenticated USING (public.can_view_project(project_id));
DROP POLICY IF EXISTS "project_areas_insert" ON public.project_areas;
CREATE POLICY "project_areas_insert" ON public.project_areas FOR INSERT TO authenticated WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_director = true));
DROP POLICY IF EXISTS "project_areas_update" ON public.project_areas;
CREATE POLICY "project_areas_update" ON public.project_areas FOR UPDATE TO authenticated USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_director = true));

ALTER TABLE public.demands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "demands_select" ON public.demands;
CREATE POLICY "demands_select" ON public.demands FOR SELECT TO authenticated USING (public.can_view_project(project_id));
DROP POLICY IF EXISTS "demands_insert" ON public.demands;
CREATE POLICY "demands_insert" ON public.demands FOR INSERT TO authenticated WITH CHECK (public.can_view_project(project_id));
DROP POLICY IF EXISTS "demands_update" ON public.demands;
CREATE POLICY "demands_update" ON public.demands FOR UPDATE TO authenticated USING (public.can_view_project(project_id));

ALTER TABLE public.demand_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "demand_comments_select" ON public.demand_comments;
CREATE POLICY "demand_comments_select" ON public.demand_comments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.demands d WHERE d.id = demand_id AND public.can_view_project(d.project_id)));
DROP POLICY IF EXISTS "demand_comments_insert" ON public.demand_comments;
CREATE POLICY "demand_comments_insert" ON public.demand_comments FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.demands d WHERE d.id = demand_id AND public.can_view_project(d.project_id)));

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
