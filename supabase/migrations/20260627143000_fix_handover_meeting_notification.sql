-- Fix the RPC schedule_handover_meeting to include project name and formatted date in notification
CREATE OR REPLACE FUNCTION public.schedule_handover_meeting(
  p_project_id uuid,
  p_scheduled_at timestamptz,
  p_duration_minutes int,
  p_location text,
  p_agenda text,
  p_participant_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid;
  v_is_distributed boolean;
  v_project_name text;
  v_meeting_id uuid;
  v_part_id uuid;
  v_formatted_date text;
BEGIN
  v_user_id := auth.uid();
  
  SELECT distributed_at IS NOT NULL, name INTO v_is_distributed, v_project_name
  FROM public.projects WHERE id = p_project_id;
  
  IF NOT COALESCE(v_is_distributed, false) THEN
    RAISE EXCEPTION 'Projeto ainda não foi distribuído.';
  END IF;
  
  INSERT INTO public.handover_meetings (
    project_id, scheduled_at, duration_minutes, location_or_link, agenda, created_by
  ) VALUES (
    p_project_id, p_scheduled_at, p_duration_minutes, p_location, p_agenda, v_user_id
  ) RETURNING id INTO v_meeting_id;
  
  INSERT INTO public.handover_meeting_participants (meeting_id, user_id, is_organizer, confirmed)
  VALUES (v_meeting_id, v_user_id, true, true);
  
  -- Format date to DD/MM/YYYY às HH24:MI in America/Sao_Paulo
  v_formatted_date := to_char(p_scheduled_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY "às" HH24:MI');
  
  FOREACH v_part_id IN ARRAY p_participant_ids
  LOOP
    IF v_part_id != v_user_id THEN
      INSERT INTO public.handover_meeting_participants (meeting_id, user_id)
      VALUES (v_meeting_id, v_part_id)
      ON CONFLICT (meeting_id, user_id) DO NOTHING;
      
      INSERT INTO public.notifications (user_id, type, title, message, link_to)
      VALUES (
        v_part_id, 
        'meeting_invite', 
        'Convite para Reunião de Passagem', 
        'Você foi convidado para a Reunião de Passagem do projeto: ' || v_project_name || '. Data: ' || v_formatted_date || ' (horário de Brasília).', 
        '/projetos/' || p_project_id || '/paper'
      );
    END IF;
  END LOOP;
  
  -- Direct insertion into project_audit_log to prevent signature mismatch errors
  INSERT INTO public.project_audit_log (
    project_id,
    event_type,
    actor_user_id,
    new_value,
    metadata
  ) VALUES (
    p_project_id,
    'handover_meeting_scheduled'::public.audit_event_type,
    v_user_id,
    p_scheduled_at::text,
    jsonb_build_object('meeting_id', v_meeting_id)
  );
  
  RETURN v_meeting_id;
END;
$function$;
