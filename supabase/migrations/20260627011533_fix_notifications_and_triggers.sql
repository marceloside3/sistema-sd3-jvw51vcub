DO $$
BEGIN
  -- Data fix: Correct broken project links if any exist. Some systems might have used '/project/' or similar
  UPDATE public.notifications 
  SET link_to = REPLACE(link_to, '/project/', '/projetos/') 
  WHERE link_to LIKE '/project/%';
END $$;

-- Fix the existing triggers that inserted into 'link' instead of 'link_to'
CREATE OR REPLACE FUNCTION public.on_demand_inserted()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.to_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, link_to)
    VALUES (
      NEW.to_user_id, 
      'demand_assigned', 
      'Nova demanda atribuída', 
      'Você recebeu a demanda: ' || NEW.title, 
      '/demandas/' || NEW.id
    );
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
    
    INSERT INTO public.notifications (user_id, type, title, message, link_to)
    VALUES (
      NEW.from_user_id, 
      'demand_status_changed', 
      'Status da demanda alterado', 
      'A demanda ' || NEW.title || ' mudou para ' || NEW.status, 
      '/demandas/' || NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Feature: Project Creation Notifications (Trigger on project_areas insert)
CREATE OR REPLACE FUNCTION public.on_project_area_inserted()
RETURNS TRIGGER AS $$
DECLARE
  v_project_name text;
  v_area_name text;
  v_user_id uuid;
BEGIN
  -- Get project name
  SELECT name INTO v_project_name FROM public.projects WHERE id = NEW.project_id;
  -- Get area name
  SELECT name INTO v_area_name FROM public.areas WHERE id = NEW.area_id;

  -- Insert notifications for all users responsible for this area
  FOR v_user_id IN
    SELECT user_id FROM public.area_responsibles WHERE area_id = NEW.area_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, link_to)
    VALUES (
      v_user_id,
      'project_assigned',
      'Novo Projeto Atribuído',
      'O projeto "' || v_project_name || '" foi atribuído à área ' || v_area_name || '.',
      '/projetos/' || NEW.project_id
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_on_project_area_inserted ON public.project_areas;
CREATE TRIGGER trigger_on_project_area_inserted
  AFTER INSERT ON public.project_areas
  FOR EACH ROW
  EXECUTE FUNCTION public.on_project_area_inserted();
