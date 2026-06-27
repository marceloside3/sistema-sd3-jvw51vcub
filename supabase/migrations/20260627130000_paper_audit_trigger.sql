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
        'paper_submitted'::public.audit_event_type,
        'status',
        null,
        'submitted',
        OLD.status,
        NEW.project_id
      );
    ELSE
      PERFORM public.audit_log_insert(
        'paper_updated'::public.audit_event_type,
        'status',
        null,
        NEW.status,
        OLD.status,
        NEW.project_id
      );
    END IF;
  ELSIF (
    OLD.refined_objective IS DISTINCT FROM NEW.refined_objective OR
    OLD.premises_restrictions IS DISTINCT FROM NEW.premises_restrictions OR
    OLD.personas IS DISTINCT FROM NEW.personas OR
    OLD.kpis IS DISTINCT FROM NEW.kpis OR
    OLD.budget_allocation IS DISTINCT FROM NEW.budget_allocation OR
    OLD.channels_priority IS DISTINCT FROM NEW.channels_priority OR
    OLD.timeline IS DISTINCT FROM NEW.timeline
  ) THEN
    PERFORM public.audit_log_insert(
      'paper_updated'::public.audit_event_type,
      'content',
      null,
      'Updated draft content',
      null,
      NEW.project_id
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
