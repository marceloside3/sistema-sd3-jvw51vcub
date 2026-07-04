-- Add is_locked column to demands table
ALTER TABLE public.demands ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false;

-- Function to notify production responsibles when demand_items change on locked demands
CREATE OR REPLACE FUNCTION public.notify_production_change()
RETURNS TRIGGER AS $$
DECLARE
  v_demand_id uuid;
  v_demand_title text;
  v_demand_to_area uuid;
  v_demand_locked boolean;
  v_responsible record;
BEGIN
  v_demand_id := COALESCE(NEW.demand_id, OLD.demand_id);

  SELECT is_locked, title, to_area_id
  INTO v_demand_locked, v_demand_title, v_demand_to_area
  FROM public.demands
  WHERE id = v_demand_id;

  IF v_demand_locked IS NOT TRUE OR v_demand_to_area IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  FOR v_responsible IN
    SELECT user_id FROM public.area_responsibles WHERE area_id = v_demand_to_area
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, link_to, should_send_email)
    VALUES (
      v_responsible.user_id,
      'alert',
      'Alteração em Demanda em Produção',
      'A demanda ' || v_demand_title || ' foi alterada após o envio para produção.',
      '/demandas/' || v_demand_id,
      true
    );
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers on demand_items for INSERT, UPDATE, DELETE
DROP TRIGGER IF EXISTS trigger_notify_production_change_insert ON public.demand_items;
CREATE TRIGGER trigger_notify_production_change_insert
  AFTER INSERT ON public.demand_items
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_production_change();

DROP TRIGGER IF EXISTS trigger_notify_production_change_update ON public.demand_items;
CREATE TRIGGER trigger_notify_production_change_update
  AFTER UPDATE ON public.demand_items
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_production_change();

DROP TRIGGER IF EXISTS trigger_notify_production_change_delete ON public.demand_items;
CREATE TRIGGER trigger_notify_production_change_delete
  AFTER DELETE ON public.demand_items
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_production_change();
