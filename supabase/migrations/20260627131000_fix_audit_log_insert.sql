-- Redefine audit_log_insert to make sure arguments are named and have defaults
CREATE OR REPLACE FUNCTION public.audit_log_insert(
  p_project_id uuid,
  p_event_type public.audit_event_type,
  p_field_name text DEFAULT NULL,
  p_old_value text DEFAULT NULL,
  p_new_value text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.project_audit_log (
    project_id,
    event_type,
    actor_user_id,
    actor_label,
    field_name,
    old_value,
    new_value,
    metadata
  ) VALUES (
    p_project_id,
    p_event_type,
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    p_field_name,
    p_old_value,
    p_new_value,
    p_metadata
  );
END;
$function$;

-- Update the paper audit trigger to use named arguments to avoid positional errors
CREATE OR REPLACE FUNCTION public.audit_project_papers_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Only log if actual data changed or status changed to prevent spam
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'submitted' THEN
      PERFORM public.audit_log_insert(
        p_project_id := NEW.project_id,
        p_event_type := 'paper_submitted'::public.audit_event_type,
        p_field_name := 'status',
        p_old_value := OLD.status,
        p_new_value := 'submitted'
      );
    ELSE
      PERFORM public.audit_log_insert(
        p_project_id := NEW.project_id,
        p_event_type := 'paper_updated'::public.audit_event_type,
        p_field_name := 'status',
        p_old_value := OLD.status,
        p_new_value := NEW.status
      );
    END IF;
  ELSIF (
    OLD.refined_objective IS DISTINCT FROM NEW.refined_objective OR
    OLD.premises_restrictions IS DISTINCT FROM NEW.premises_restrictions OR
    OLD.personas IS DISTINCT FROM NEW.personas OR
    OLD.kpis IS DISTINCT FROM NEW.kpis OR
    OLD.budget_allocation IS DISTINCT FROM NEW.budget_allocation OR
    OLD.channels_priority IS DISTINCT FROM NEW.channels_priority OR
    OLD.timeline IS DISTINCT FROM NEW.timeline OR
    OLD.key_message IS DISTINCT FROM NEW.key_message
  ) THEN
    PERFORM public.audit_log_insert(
      p_project_id := NEW.project_id,
      p_event_type := 'paper_updated'::public.audit_event_type,
      p_field_name := 'content',
      p_new_value := 'Updated draft content'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS audit_project_papers_updated_trigger ON public.project_papers;
CREATE TRIGGER audit_project_papers_updated_trigger
  AFTER UPDATE ON public.project_papers
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_project_papers_updated();
