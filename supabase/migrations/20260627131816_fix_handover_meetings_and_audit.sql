-- Ensure audit_log_insert function exists and is properly configured
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
AS $$
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
$$;

-- Fix handover_meeting_participants foreign key to allow proper joins with public.users
ALTER TABLE public.handover_meeting_participants
  DROP CONSTRAINT IF EXISTS handover_meeting_participants_user_id_fkey;

ALTER TABLE public.handover_meeting_participants
  ADD CONSTRAINT handover_meeting_participants_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
