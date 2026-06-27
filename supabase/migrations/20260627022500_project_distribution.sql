ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'project_distributed';

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS distributed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_projects_distributed_at ON public.projects(distributed_at);

CREATE OR REPLACE FUNCTION public.distribute_project(p_project_id uuid, p_assignments jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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

    -- Insert notification
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
$$;

GRANT EXECUTE ON FUNCTION public.distribute_project(uuid, jsonb) TO authenticated;
