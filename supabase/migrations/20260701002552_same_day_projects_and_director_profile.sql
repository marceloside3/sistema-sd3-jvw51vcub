-- Ensure same-day projects are allowed in distribution validation
-- and reinforce test user permissions with both admin and director flags

-- 1. Recreate validate_briefing_for_distribution with explicit same-day date allowance
--    (end_date >= start_date, including same day)
CREATE OR REPLACE FUNCTION public.validate_briefing_for_distribution(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_project RECORD;
  v_briefing jsonb;
  v_checks jsonb := '[]'::jsonb;
  v_valid boolean := true;
  v_area_count integer;
BEGIN
  SELECT * INTO v_project FROM public.projects WHERE id = p_project_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Projeto não encontrado', 'checks', '[]'::jsonb);
  END IF;

  v_briefing := COALESCE(v_project.briefing_data, '{}'::jsonb);

  IF COALESCE(v_briefing->>'objetivo', '') = '' THEN
    v_checks := v_checks || jsonb_build_array(jsonb_build_object('field', 'objetivo', 'label', 'Objetivo', 'passed', false));
    v_valid := false;
  ELSE
    v_checks := v_checks || jsonb_build_array(jsonb_build_object('field', 'objetivo', 'label', 'Objetivo', 'passed', true));
  END IF;

  IF COALESCE(v_briefing->>'publico_alvo', '') = '' THEN
    v_checks := v_checks || jsonb_build_array(jsonb_build_object('field', 'publico_alvo', 'label', 'Público-alvo', 'passed', false));
    v_valid := false;
  ELSE
    v_checks := v_checks || jsonb_build_array(jsonb_build_object('field', 'publico_alvo', 'label', 'Público-alvo', 'passed', true));
  END IF;

  IF COALESCE(v_briefing->>'canais', '') = '' THEN
    v_checks := v_checks || jsonb_build_array(jsonb_build_object('field', 'canais', 'label', 'Canais', 'passed', false));
    v_valid := false;
  ELSE
    v_checks := v_checks || jsonb_build_array(jsonb_build_object('field', 'canais', 'label', 'Canais', 'passed', true));
  END IF;

  IF COALESCE(v_briefing->>'prazo', '') = '' THEN
    v_checks := v_checks || jsonb_build_array(jsonb_build_object('field', 'prazo', 'label', 'Prazo', 'passed', false));
    v_valid := false;
  ELSE
    v_checks := v_checks || jsonb_build_array(jsonb_build_object('field', 'prazo', 'label', 'Prazo', 'passed', true));
  END IF;

  IF COALESCE(v_briefing->>'budget', '') = '' THEN
    v_checks := v_checks || jsonb_build_array(jsonb_build_object('field', 'budget', 'label', 'Budget', 'passed', false));
    v_valid := false;
  ELSE
    v_checks := v_checks || jsonb_build_array(jsonb_build_object('field', 'budget', 'label', 'Budget', 'passed', true));
  END IF;

  IF COALESCE(v_briefing->>'restricoes', '') = '' THEN
    v_checks := v_checks || jsonb_build_array(jsonb_build_object('field', 'restricoes', 'label', 'Restrições', 'passed', false));
    v_valid := false;
  ELSE
    v_checks := v_checks || jsonb_build_array(jsonb_build_object('field', 'restricoes', 'label', 'Restrições', 'passed', true));
  END IF;

  IF COALESCE(v_briefing->>'referencias', '') = '' THEN
    v_checks := v_checks || jsonb_build_array(jsonb_build_object('field', 'referencias', 'label', 'Referências', 'passed', false));
    v_valid := false;
  ELSE
    v_checks := v_checks || jsonb_build_array(jsonb_build_object('field', 'referencias', 'label', 'Referências', 'passed', true));
  END IF;

  SELECT count(*) INTO v_area_count FROM public.project_areas WHERE project_id = p_project_id;
  IF v_area_count = 0 THEN
    v_checks := v_checks || jsonb_build_array(jsonb_build_object('field', 'areas', 'label', 'Áreas do Projeto', 'passed', false));
    v_valid := false;
  ELSE
    v_checks := v_checks || jsonb_build_array(jsonb_build_object('field', 'areas', 'label', 'Áreas do Projeto', 'passed', true));
  END IF;

  IF v_project.briefing_completed_at IS NULL THEN
    v_checks := v_checks || jsonb_build_array(jsonb_build_object('field', 'briefing_completed', 'label', 'Briefing Completo', 'passed', false));
    v_valid := false;
  ELSE
    v_checks := v_checks || jsonb_build_array(jsonb_build_object('field', 'briefing_completed', 'label', 'Briefing Completo', 'passed', true));
  END IF;

  -- Explicit date validation: end_date must be >= start_date
  -- This ALLOWS same-day projects (end_date == start_date)
  IF v_project.start_date IS NOT NULL AND v_project.end_date IS NOT NULL THEN
    IF v_project.end_date < v_project.start_date THEN
      v_checks := v_checks || jsonb_build_array(jsonb_build_object('field', 'dates', 'label', 'Datas (início ≤ fim)', 'passed', false));
      v_valid := false;
    ELSE
      v_checks := v_checks || jsonb_build_array(jsonb_build_object('field', 'dates', 'label', 'Datas (início ≤ fim)', 'passed', true));
    END IF;
  END IF;

  RETURN jsonb_build_object('valid', v_valid, 'checks', v_checks);
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_briefing_for_distribution(uuid) TO authenticated;

-- 2. Recreate distribute_project with 3-param signature (includes G2 override support)
DROP FUNCTION IF EXISTS public.distribute_project(uuid, jsonb);
DROP FUNCTION IF EXISTS public.distribute_project(uuid, jsonb, text);

CREATE OR REPLACE FUNCTION public.distribute_project(
  p_project_id uuid,
  p_assignments jsonb,
  p_override_reason text DEFAULT NULL
)
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
  v_validation jsonb;
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

  -- G2 validation (allows same-day projects: end_date >= start_date)
  v_validation := public.validate_briefing_for_distribution(p_project_id);

  IF NOT (v_validation->>'valid')::boolean THEN
    IF p_override_reason IS NULL OR p_override_reason = '' THEN
      RAISE EXCEPTION 'G2 validation failed. Override reason required.';
    END IF;

    INSERT INTO public.project_audit_log (
      project_id, event_type, actor_user_id, field_name, old_value, new_value, metadata
    ) VALUES (
      p_project_id, 'g2_override'::audit_event_type, v_auth_uid, 'g2_validation',
      'failed', 'overridden',
      jsonb_build_object('reason', p_override_reason, 'validation', v_validation)
    );

    UPDATE public.projects
    SET g2_status = 'overridden',
        g2_override_by = v_auth_uid,
        g2_override_reason = p_override_reason,
        updated_at = NOW()
    WHERE id = p_project_id;
  ELSE
    UPDATE public.projects
    SET g2_status = 'passed',
        g2_validated_at = NOW(),
        updated_at = NOW()
    WHERE id = p_project_id;
  END IF;

  -- Process assignments
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

    v_demand_id := gen_random_uuid();
    INSERT INTO public.demands (
      id, project_id, from_user_id, from_area_id, to_user_id, to_area_id,
      title, description, status, priority
    ) VALUES (
      v_demand_id, p_project_id, v_auth_uid, v_auth_area_id, v_user_id, v_area_id,
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
$$;

GRANT EXECUTE ON FUNCTION public.distribute_project(uuid, jsonb, text) TO authenticated;

-- 3. Ensure test user marcelo@side3.com.br has both admin AND director permissions
DO $$
DECLARE
  v_user_id UUID;
  v_area_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'marcelo@side3.com.br';

  IF v_user_id IS NOT NULL THEN
    -- Ensure profile exists with both is_admin and is_director flags
    INSERT INTO public.profiles (id, code, name, is_admin, is_director, is_system, is_active)
    VALUES (v_user_id, 'ADM-MARC', 'Marcelo', true, true, false, true)
    ON CONFLICT (id) DO UPDATE SET
      is_admin = true,
      is_director = true,
      is_active = true;

    -- Ensure public.users record exists with profile_id linked
    INSERT INTO public.users (id, email, full_name, profile_id, is_active)
    VALUES (v_user_id, 'marcelo@side3.com.br', 'Marcelo', v_user_id, true)
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      profile_id = COALESCE(public.users.profile_id, EXCLUDED.profile_id),
      is_active = true;

    -- Ensure user is linked to planejamento area as principal
    SELECT id INTO v_area_id FROM public.areas WHERE code = 'planejamento';
    IF v_area_id IS NOT NULL THEN
      -- Demote any existing principal for this area to respect the
      -- unique_principal_per_area partial unique index (one principal per area)
      UPDATE public.area_responsibles
      SET is_principal = false, updated_at = NOW()
      WHERE area_id = v_area_id AND is_principal = true AND user_id <> v_user_id;

      INSERT INTO public.area_responsibles (user_id, area_id, is_principal)
      VALUES (v_user_id, v_area_id, true)
      ON CONFLICT (user_id, area_id) DO UPDATE SET
        is_principal = true;
    END IF;  END IF;
END $$;
