-- Gate G2 Validation migration

-- Add Enum values
ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'g2_validation_passed';
ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'g2_validation_failed';
ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'g2_override';

-- Alter projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS g2_status text DEFAULT 'pending' CHECK (g2_status IN ('pending', 'approved', 'override'));
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS g2_validated_at TIMESTAMPTZ;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS g2_override_reason text;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS g2_override_by uuid;

-- Drop foreign key if exists and recreate
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_g2_override_by_fkey;
ALTER TABLE public.projects ADD CONSTRAINT projects_g2_override_by_fkey FOREIGN KEY (g2_override_by) REFERENCES public.users(id);

CREATE INDEX IF NOT EXISTS idx_projects_g2_status ON public.projects(g2_status);

-- can_override_g2 function
CREATE OR REPLACE FUNCTION public.can_override_g2()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_admin boolean;
  v_is_hub_director boolean;
BEGIN
  IF v_user_id IS NULL THEN RETURN false; END IF;

  -- Check if user is admin
  SELECT p.is_admin INTO v_is_admin
  FROM public.users u
  JOIN public.profiles p ON u.profile_id = p.id
  WHERE u.id = v_user_id;

  IF v_is_admin THEN RETURN true; END IF;

  -- Check if user is director of a hub area
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.profiles p ON u.profile_id = p.id
    JOIN public.area_responsibles ar ON ar.user_id = u.id
    JOIN public.areas a ON a.id = ar.area_id
    WHERE u.id = v_user_id AND p.is_director = true AND a.is_hub = true
  ) INTO v_is_hub_director;

  RETURN v_is_hub_director;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.can_override_g2() TO authenticated;

-- validate_briefing_for_distribution function
CREATE OR REPLACE FUNCTION public.validate_briefing_for_distribution(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_project RECORD;
  v_areas_count int;
  v_issues jsonb := '[]'::jsonb;
  v_is_valid boolean := true;
  v_val text;
  v_budget numeric;
BEGIN
  SELECT * INTO v_project FROM public.projects WHERE id = p_project_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Project not found'; END IF;

  -- Rule 1: Content
  v_val := v_project.briefing_data->>'objective';
  IF v_val IS NULL OR length(trim(v_val)) <= 10 THEN
    v_issues := v_issues || jsonb_build_object('rule', 'Conteúdo do Briefing', 'message', 'Objetivo deve ter mais de 10 caracteres.');
  END IF;
  
  v_val := v_project.briefing_data->>'target_audience';
  IF v_val IS NULL OR length(trim(v_val)) <= 10 THEN
    v_issues := v_issues || jsonb_build_object('rule', 'Conteúdo do Briefing', 'message', 'Público Alvo deve ter mais de 10 caracteres.');
  END IF;

  v_val := v_project.briefing_data->>'channels';
  IF v_val IS NULL OR length(trim(v_val)) <= 10 THEN
    v_issues := v_issues || jsonb_build_object('rule', 'Conteúdo do Briefing', 'message', 'Canais devem ter mais de 10 caracteres.');
  END IF;

  v_val := v_project.briefing_data->>'restrictions';
  IF v_val IS NULL OR length(trim(v_val)) <= 10 THEN
    v_issues := v_issues || jsonb_build_object('rule', 'Conteúdo do Briefing', 'message', 'Restrições devem ter mais de 10 caracteres.');
  END IF;

  v_val := v_project.briefing_data->>'references';
  IF v_val IS NULL OR length(trim(v_val)) <= 10 THEN
    v_issues := v_issues || jsonb_build_object('rule', 'Conteúdo do Briefing', 'message', 'Referências devem ter mais de 10 caracteres.');
  END IF;

  -- Rule 2: Client
  IF v_project.client_id IS NULL THEN
    v_issues := v_issues || jsonb_build_object('rule', 'Cliente', 'message', 'O projeto deve ter um cliente associado.');
  END IF;

  -- Rule 3: Areas
  SELECT count(*) INTO v_areas_count FROM public.project_areas WHERE project_id = p_project_id;
  IF v_areas_count = 0 THEN
    v_issues := v_issues || jsonb_build_object('rule', 'Áreas Envolvidas', 'message', 'Pelo menos uma área deve estar associada ao projeto.');
  END IF;

  -- Rule 4: Dates
  IF v_project.start_date IS NULL OR v_project.end_date IS NULL THEN
    v_issues := v_issues || jsonb_build_object('rule', 'Datas', 'message', 'As datas de início e término são obrigatórias.');
  ELSIF v_project.end_date <= v_project.start_date THEN
    v_issues := v_issues || jsonb_build_object('rule', 'Datas', 'message', 'A data de término deve ser posterior à data de início.');
  END IF;

  -- Rule 5: Financial
  v_val := v_project.briefing_data->>'budget';
  v_budget := CASE WHEN v_val IS NOT NULL AND v_val ~ '^[0-9\.]+$' THEN v_val::numeric ELSE 0 END;
  IF v_budget <= 0 THEN
    v_issues := v_issues || jsonb_build_object('rule', 'Financeiro', 'message', 'O orçamento do projeto deve ser maior que zero.');
  END IF;

  IF jsonb_array_length(v_issues) > 0 THEN
    v_is_valid := false;
  END IF;

  RETURN jsonb_build_object(
    'is_valid', v_is_valid,
    'issues_count', jsonb_array_length(v_issues),
    'issues', v_issues
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.validate_briefing_for_distribution(uuid) TO authenticated;

-- distribute_project update
CREATE OR REPLACE FUNCTION public.distribute_project(p_project_id uuid, p_assignments jsonb, p_override_reason text DEFAULT NULL)
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
BEGIN
  -- Validate authentication
  v_auth_uid := auth.uid();
  IF v_auth_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get auth user's area
  SELECT area_id INTO v_auth_area_id
  FROM public.area_responsibles
  WHERE user_id = v_auth_uid
  LIMIT 1;

  -- Load project data
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

  -- Validation step
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
    VALUES (p_project_id, 'g2_override'::audit_event_type, v_auth_uid, jsonb_build_object('reason', p_override_reason, 'issues', v_val_result->'issues'));
  END IF;

  -- Process assignments
  FOR v_assignment IN SELECT * FROM jsonb_array_elements(p_assignments)
  LOOP
    v_area_id := (v_assignment->>'area_id')::uuid;
    v_user_id := (v_assignment->>'user_id')::uuid;

    -- Validate user is principal for the area
    SELECT is_principal INTO v_is_principal
    FROM public.area_responsibles
    WHERE area_id = v_area_id AND user_id = v_user_id;

    IF v_is_principal IS NULL OR v_is_principal = false THEN
      RAISE EXCEPTION 'User % is not a principal for area %', v_user_id, v_area_id;
    END IF;

    -- Insert demand
    v_demand_id := gen_random_uuid();
    INSERT INTO public.demands (
      id,
      project_id,
      from_user_id,
      from_area_id,
      to_user_id,
      to_area_id,
      title,
      description,
      status,
      priority
    ) VALUES (
      v_demand_id,
      p_project_id,
      v_auth_uid,
      v_auth_area_id,
      v_user_id,
      v_area_id,
      'Trabalho inicial — ' || v_project.name,
      'Demanda criada automaticamente via distribuição do projeto. Briefing disponível no detalhe do projeto.',
      'pending',
      'normal'
    );

    -- Insert standard notification
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      link_to,
      should_send_email
    ) VALUES (
      v_user_id,
      'demand_assigned',
      'Nova demanda atribuída a você',
      'Você foi designado para o trabalho inicial do projeto: ' || v_project.name,
      '/demandas/' || v_demand_id,
      true
    );

    -- Insert override warning notification if applicable
    IF NOT v_is_valid THEN
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        link_to,
        should_send_email
      ) VALUES (
        v_user_id,
        'g2_override_warning',
        'Atenção: Projeto distribuído com pendências',
        'O projeto ' || v_project.name || ' foi distribuído com aprovação excepcional no Gate G2 (Briefing incompleto). Verifique o detalhe do projeto.',
        '/projetos/' || p_project_id,
        false
      );
    END IF;

    v_count := v_count + 1;
  END LOOP;

  -- Update project metadata
  UPDATE public.projects
  SET distributed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_project_id;

  -- Audit log insertion
  INSERT INTO public.project_audit_log (
    project_id,
    event_type,
    actor_user_id,
    metadata
  ) VALUES (
    p_project_id,
    'project_distributed'::audit_event_type,
    v_auth_uid,
    jsonb_build_object('assignments_count', v_count, 'assignments', p_assignments)
  );

END;
$function$;

GRANT EXECUTE ON FUNCTION public.distribute_project(uuid, jsonb, text) TO authenticated;
