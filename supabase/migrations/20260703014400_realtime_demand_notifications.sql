-- 1. Enable Supabase Realtime for the notifications table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'notifications'
    AND schemaname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- 2. Drop ALL non-internal triggers on demands to prevent duplicate notifications
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT tgname FROM pg_trigger
    WHERE tgrelid = 'public.demands'::regclass
    AND NOT tgisinternal
  ) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.demands', r.tgname);
  END LOOP;
END $$;

-- 3. Recreate the updated_at trigger (BEFORE UPDATE)
CREATE TRIGGER set_demands_updated_at
  BEFORE UPDATE ON public.demands
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Demand INSERT notification: specific user OR area-wide distribution
CREATE OR REPLACE FUNCTION public.on_demand_inserted()
RETURNS TRIGGER AS $$
DECLARE
  v_area_user_id uuid;
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
  ELSIF NEW.to_area_id IS NOT NULL THEN
    FOR v_area_user_id IN
      SELECT user_id FROM public.area_responsibles WHERE area_id = NEW.to_area_id
    LOOP
      INSERT INTO public.notifications (user_id, type, title, message, link_to)
      VALUES (
        v_area_user_id,
        'demand_assigned',
        'Nova demanda atribuída à área',
        'Nova demanda recebida para sua área: ' || NEW.title,
        '/demandas/' || NEW.id
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Demand UPDATE notification: use link_to (not link)
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

-- 6. Neutralize any older conflicting trigger functions
CREATE OR REPLACE FUNCTION public.notify_demand_assigned()
RETURNS TRIGGER AS $$
BEGIN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.notify_demand_status_changed()
RETURNS TRIGGER AS $$
BEGIN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Recreate demand triggers
CREATE TRIGGER trigger_on_demand_inserted
  AFTER INSERT ON public.demands
  FOR EACH ROW
  EXECUTE FUNCTION public.on_demand_inserted();

CREATE TRIGGER trigger_on_demand_updated
  BEFORE UPDATE ON public.demands
  FOR EACH ROW
  EXECUTE FUNCTION public.on_demand_updated();

-- 8. Fix demand_comments trigger to use link_to
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT tgname FROM pg_trigger
    WHERE tgrelid = 'public.demand_comments'::regclass
    AND NOT tgisinternal
  ) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.demand_comments', r.tgname);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.notify_demand_commented()
RETURNS TRIGGER AS $$
DECLARE
  v_demand_from uuid;
  v_demand_to uuid;
  v_title text;
BEGIN
  SELECT from_user_id, to_user_id, title INTO v_demand_from, v_demand_to, v_title
  FROM public.demands WHERE id = NEW.demand_id;

  IF NEW.user_id = v_demand_from AND v_demand_to IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, link_to)
    VALUES (v_demand_to, 'demand_commented', 'Novo Comentário', 'Comentário em: ' || v_title, '/demandas/' || NEW.demand_id);
  ELSIF NEW.user_id = v_demand_to THEN
    INSERT INTO public.notifications (user_id, type, title, message, link_to)
    VALUES (v_demand_from, 'demand_commented', 'Novo Comentário', 'Comentário em: ' || v_title, '/demandas/' || NEW.demand_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_demand_comment()
RETURNS TRIGGER AS $$
BEGIN
  RETURN public.notify_demand_commented();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_on_demand_commented
  AFTER INSERT ON public.demand_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_demand_commented();
