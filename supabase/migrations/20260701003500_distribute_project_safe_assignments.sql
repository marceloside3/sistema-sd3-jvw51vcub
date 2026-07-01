-- Make distribute_project idempotent regarding area_responsibles unique constraint
-- The function already validates principal status via SELECT; this migration
-- ensures no duplicate demand creation or constraint violations occur.

CREATE OR REPLACE FUNCTION public.distribute_project(
  p_project_id uuid,
  p_assignments jsonb,
  p_override_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_project RECORD;
  v_auth_uid uuid;
  v_auth_area_id uuid;
  v_assignment jsonb;
  v_area_id uuid;
  v_user_id uuid;
  v_is_principal boolean;
  v_demand_id uuid;
  v_count int := 0;
  v_val_result jsonb;
  v_is_valid boolean;
  v_can_override boolean;
  v_existing_demand_count int;
BEGIN
  v_auth_uid := auth.uid();
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT area_id INTO v_auth_area_id
  FROM public.area_responsibles
  WHERE user_id = v_auth_uid
  LIMIT 1;

  SELECT * INTO v_project
  FROM public.projects
  WHERE id = p_project_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  IF v_project.distributed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Project already distributed';
  END IF;

  IF v_project.briefing_completed_at IS NULL THEN
    RAISE EXCEPTION 'Briefing not completed yet';
  END IF;

  v_val_result := public.validate_briefing_for_distribution(p_project_id);
  v_is_valid := (v_val_result->>'is_valid')::boolean;

  IF v_is_valid THEN
    UPDATE public.projects 
    SET g2_status = 'approved', g2_validated_at = NOW() 
    WHERE id = p_project_id;
    
    INSERT INTO public.project_audit_log (project_id, event_type, actor_user_id, metadata)
    VALUES (p_project_id, 'g2_validation_passed'::audit_event_type, v_auth_uid, '{}'::jsonb);
  ELSE
    IF p_override_reason IS NULL OR length(trim(p_override_reason)) < 30 THEN
      RAISE EXCEPTION 'Validation failed. Override reason is required and must be at least 30 characters.';
    END IF;

    v_can_override := public.can_override_g2();
    IF NOT v_can_override THEN
      RAISE EXCEPTION 'User not authorized to override G2 validation.';
    END IF;

    UPDATE public.projects 
    SET g2_status = 'override', 
        g2_validated_at = NOW(), 
        g2_override_reason = p_override_reason, 
        g2_override_by = v_auth_uid 
    WHERE id = p_project_id;

    INSERT INTO public.project_audit_log (project_id, event_type, actor_user_id, metadata)
    VALUES (p_project_id, 'g2_override'::audit_event_type, v_auth_uid, 
      jsonb_build_object('reason', p_override_reason, 'issues', v_val_result->'issues'));
  END IF;

  FOR v_assignment IN SELECT * FROM jsonb_array_elements(p_assignments)
  LOOP
    v_area_id := (v_assignment->>'area_id')::uuid;
    v_user_id := (v_assignment->>'user_id')::uuid;

    SELECT is_principal INTO v_is_principal
    FROM public.area_responsibles
    WHERE area_id = v_area_id AND user_id = v_user_id;

    IF v_is_principal IS NULL OR v_is_principal = false THEN
      RAISE EXCEPTION 'User % is not a principal for area %', v_user_id, v_area_id;
    END IF;

    SELECT count(*) INTO v_existing_demand_count
    FROM public.demands
    WHERE project_id = p_project_id
      AND to_area_id = v_area_id
      AND to_user_id = v_user_id
      AND status = 'pending';

    IF v_existing_demand_count > 0 THEN
      v_count := v_count + 1;
      CONTINUE;
    END IF;

    v_demand_id := gen_random_uuid();
    INSERT INTO public.demands (
      id, project_id, from_user_id, from_area_id,
      to_user_id, to_area_id, title, description,
      status, priority
    ) VALUES (
      v_demand_id, p_project_id, v_auth_uid, v_auth_area_id,
      v_user_id, v_area_id,
      'Trabalho inicial — ' || v_project.name,
      'Demanda criada automaticamente via distribuição do projeto. Briefing disponível no detalhe do projeto.',
      'pending', 'normal'
    );

    INSERT INTO public.notifications (
      user_id, type, title, message, link_to, should_send_email
    ) VALUES (
      v_user_id, 'demand_assigned',
      'Nova demanda atribuída a você',
      'Você foi designado para o trabalho inicial do projeto: ' || v_project.name,
      '/demandas/' || v_demand_id, true
    );

    IF NOT v_is_valid THEN
      INSERT INTO public.notifications (
        user_id, type, title, message, link_to, should_send_email
      ) VALUES (
        v_user_id, 'g2_override_warning',
        'Atenção: Projeto distribuído com pendências',
        'O projeto ' || v_project.name || ' foi distribuído com aprovação excepcional no Gate G2 (Briefing incompleto). Verifique o detalhe do projeto.',
        '/projetos/' || p_project_id, false
      );
    END IF;

    v_count := v_count + 1;
  END LOOP;

  UPDATE public.projects
  SET distributed_at = NOW(), updated_at = NOW()
  WHERE id = p_project_id;

  INSERT INTO public.project_audit_log (
    project_id, event_type, actor_user_id, metadata
  ) VALUES (
    p_project_id, 'project_distributed'::audit_event_type, v_auth_uid,
    jsonb_build_object('assignments_count', v_count, 'assignments', p_assignments)
  );

END;
$function$;

GRANT EXECUTE ON FUNCTION public.distribute_project(uuid, jsonb, text) TO authenticated;
