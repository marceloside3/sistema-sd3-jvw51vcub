-- Fix the RPC create_paper_version to use direct insert into project_audit_log
CREATE OR REPLACE FUNCTION public.create_paper_version(p_project_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid;
  v_is_allowed boolean;
  v_new_version integer;
  v_new_paper_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  SELECT is_admin INTO v_is_allowed FROM public.profiles WHERE id = v_user_id;
  
  IF NOT v_is_allowed THEN
    SELECT EXISTS (
      SELECT 1 FROM public.area_responsibles ar
      JOIN public.areas a ON a.id = ar.area_id
      WHERE ar.user_id = v_user_id AND lower(a.code) = 'planejamento'
    ) INTO v_is_allowed;
  END IF;
  
  IF NOT v_is_allowed THEN
    RAISE EXCEPTION 'Acesso negado: apenas Administradores ou equipe de Planejamento podem criar papers.';
  END IF;

  UPDATE public.project_papers
  SET status = 'superseded', updated_at = now()
  WHERE project_id = p_project_id AND status != 'superseded';
  
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_new_version
  FROM public.project_papers
  WHERE project_id = p_project_id;
  
  INSERT INTO public.project_papers (project_id, version, status, created_by)
  VALUES (p_project_id, v_new_version, 'draft', v_user_id)
  RETURNING id INTO v_new_paper_id;
  
  -- Direct insertion into project_audit_log to prevent signature mismatch errors
  INSERT INTO public.project_audit_log (
    project_id,
    event_type,
    actor_user_id,
    field_name,
    new_value,
    metadata
  ) VALUES (
    p_project_id,
    'paper_created'::public.audit_event_type,
    v_user_id,
    'version',
    v_new_version::text,
    jsonb_build_object('paper_id', v_new_paper_id)
  );
  
  RETURN v_new_paper_id;
END;
$function$;

-- Fix the RPC schedule_handover_meeting to use direct insert into project_audit_log
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
  v_meeting_id uuid;
  v_part_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  SELECT distributed_at IS NOT NULL INTO v_is_distributed
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
        'Você foi convidado para uma reunião de passagem.', 
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
