-- Migration: Add data_entrega_final to projects and adjust SLA calculations
-- Version: 20260930010000_add_data_entrega_final.sql

-- 1. Add data_entrega_final column to public.projects (nullable for backward compatibility with old records)
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS data_entrega_final date;

-- Add index on data_entrega_final for efficient ordering and queries
CREATE INDEX IF NOT EXISTS idx_projects_data_entrega_final ON public.projects USING btree (data_entrega_final);

-- 2. Update audit_project_updated to log changes in data_entrega_final
CREATE OR REPLACE FUNCTION public.audit_project_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'completed' THEN
      PERFORM audit_log_insert(NEW.id, 'project_completed', 'status', OLD.status::text, NEW.status::text);
    ELSIF OLD.status = 'completed' THEN
      PERFORM audit_log_insert(NEW.id, 'project_reopened', 'status', OLD.status::text, NEW.status::text);
    ELSIF NEW.status = 'overdue' AND auth.uid() IS NULL THEN
      PERFORM audit_log_insert(NEW.id, 'project_overdue_auto', 'status', OLD.status::text, NEW.status::text);
    ELSIF OLD.status = 'overdue' AND auth.uid() IS NULL THEN
      PERFORM audit_log_insert(NEW.id, 'project_overdue_resolved_auto', 'status', OLD.status::text, NEW.status::text);
    ELSE
      PERFORM audit_log_insert(NEW.id, 'project_status_changed', 'status', OLD.status::text, NEW.status::text);
    END IF;
  END IF;

  IF NEW.end_date IS DISTINCT FROM OLD.end_date THEN
    PERFORM audit_log_insert(NEW.id, 'project_end_date_changed', 'end_date',
      OLD.end_date::text, NEW.end_date::text);
  END IF;

  IF NEW.data_entrega_final IS DISTINCT FROM OLD.data_entrega_final THEN
    PERFORM audit_log_insert(NEW.id, 'project_end_date_changed', 'data_entrega_final',
      OLD.data_entrega_final::text, NEW.data_entrega_final::text);
  END IF;

  IF NEW.start_date IS DISTINCT FROM OLD.start_date THEN
    PERFORM audit_log_insert(NEW.id, 'project_start_date_changed', 'start_date',
      OLD.start_date::text, NEW.start_date::text);
  END IF;

  IF NEW.name IS DISTINCT FROM OLD.name THEN
    PERFORM audit_log_insert(NEW.id, 'project_name_changed', 'name', OLD.name, NEW.name);
  END IF;

  IF NEW.client_id IS DISTINCT FROM OLD.client_id THEN
    PERFORM audit_log_insert(NEW.id, 'project_client_changed', 'client_id',
      OLD.client_id::text, NEW.client_id::text);
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Update distribute_project to cap SLA / due_date of demands at data_entrega_final
CREATE OR REPLACE FUNCTION public.distribute_project(
  p_project_id uuid,
  p_assignments jsonb,
  p_override_reason text DEFAULT NULL::text
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
  v_area_code text;
  v_user_id uuid;
  v_user_in_area boolean;
  v_demand_id uuid;
  v_count int := 0;
  v_val_result jsonb;
  v_is_valid boolean;
  v_can_override boolean;
  v_existing_demand_count int;
  v_is_planning boolean;
  v_is_allowed boolean;
  v_planning_area_id uuid;
  v_planejamento_stage_id uuid;
  v_sla_hours int := 120;
  v_due_date date;
  v_default_due_date date;
  v_demand_title text;
  v_demand_desc text;
  v_planning_user RECORD;
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

  -- Permission validation: must be creator, planning area member, director, or admin
  SELECT EXISTS (
    SELECT 1
    FROM public.area_responsibles ar
    JOIN public.areas a ON a.id = ar.area_id
    WHERE ar.user_id = v_auth_uid AND lower(a.code) = 'planejamento'
  ) INTO v_is_planning;

  v_is_allowed := (v_project.created_by = v_auth_uid)
                  OR v_is_planning
                  OR public.is_director()
                  OR public.is_admin();

  IF NOT v_is_allowed THEN
    RAISE EXCEPTION 'Acesso negado: apenas o criador do projeto, equipe de Planejamento, diretores ou administradores podem distribuir o projeto.';
  END IF;

  IF v_project.distributed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Project already distributed';
  END IF;

  IF v_project.briefing_completed_at IS NULL THEN
    RAISE EXCEPTION 'Briefing not completed yet';
  END IF;

  -- Obter dados da área e Kanban do Planejamento
  SELECT id INTO v_planning_area_id
  FROM public.areas
  WHERE lower(code) = 'planejamento'
  LIMIT 1;

  IF v_planning_area_id IS NOT NULL THEN
    SELECT id INTO v_planejamento_stage_id
    FROM public.kanban_stages
    WHERE area_id = v_planning_area_id
    ORDER BY position ASC
    LIMIT 1;
  END IF;

  -- Obter SLA do paper configurado
  SELECT COALESCE(hours_limit, 120) INTO v_sla_hours
  FROM public.sla_configs
  WHERE stage_code = 'planejamento_paper' AND is_active = true
  LIMIT 1;

  IF v_sla_hours IS NULL THEN
    v_sla_hours := 120;
  END IF;

  -- Calcular data limite padrão do SLA (120h)
  v_due_date := (NOW() + (v_sla_hours || ' hours')::interval)::date;

  -- Regra do usuário: Se o projeto tiver data_entrega_final, o prazo do SLA NUNCA pode ultrapassar a entrega final
  IF v_project.data_entrega_final IS NOT NULL AND v_due_date > v_project.data_entrega_final THEN
    v_due_date := v_project.data_entrega_final;
  ELSIF v_project.data_entrega_final IS NULL AND v_project.end_date IS NOT NULL AND v_due_date > v_project.end_date THEN
    -- Fallback gracioso para projetos legados usando end_date se data_entrega_final não estiver preenchida
    v_due_date := v_project.end_date;
  END IF;

  -- Prazo padrão para outras áreas (também limitado pela entrega final se aplicável)
  v_default_due_date := (NOW() + interval '5 days')::date;
  IF v_project.data_entrega_final IS NOT NULL AND v_default_due_date > v_project.data_entrega_final THEN
    v_default_due_date := v_project.data_entrega_final;
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

    SELECT EXISTS (
      SELECT 1
      FROM public.area_responsibles
      WHERE area_id = v_area_id AND user_id = v_user_id
    ) INTO v_user_in_area;

    IF NOT v_user_in_area THEN
      RAISE EXCEPTION 'User % is not associated with area %', v_user_id, v_area_id;
    END IF;

    SELECT code INTO v_area_code
    FROM public.areas
    WHERE id = v_area_id;

    -- Verificar se já existe demanda pendente para este par projeto/área/usuário
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

    -- Se a área de destino for o Planejamento, criar a demanda dedicada do Paper
    IF lower(COALESCE(v_area_code, '')) = 'planejamento' THEN
      v_demand_title := 'Paper de Planejamento — ' || v_project.name;
      v_demand_desc := 'Demanda dedicada de Paper de Planejamento gerada automaticamente na distribuição do Gate G2. Prazo do Paper: 120h (SLA ajustado ao limite do projeto).';

      v_demand_id := gen_random_uuid();
      INSERT INTO public.demands (
        id, project_id, from_user_id, from_area_id,
        to_user_id, to_area_id, title, description,
        status, priority, due_date, kanban_stage_id
      ) VALUES (
        v_demand_id, p_project_id, v_auth_uid, v_auth_area_id,
        v_user_id, v_area_id,
        v_demand_title, v_demand_desc,
        'pending', 'high', v_due_date, v_planejamento_stage_id
      );

      -- Notificar todos os membros da área de Planejamento
      FOR v_planning_user IN
        SELECT DISTINCT ar.user_id
        FROM public.area_responsibles ar
        JOIN public.users u ON u.id = ar.user_id
        WHERE ar.area_id = v_area_id AND u.is_active = true
      LOOP
        INSERT INTO public.notifications (
          user_id, type, title, message, link_to, should_send_email
        ) VALUES (
          v_planning_user.user_id, 'demand_assigned',
          'Nova demanda de Paper de Planejamento',
          'O projeto ' || v_project.name || ' foi distribuído e o Paper de Planejamento está disponível no Kanban.',
          '/demandas/' || v_demand_id, true
        );
      END LOOP;

    ELSE
      -- Demanda inicial padrão para as outras áreas (Criação, Social, etc.)
      v_demand_title := 'Trabalho inicial — ' || v_project.name;
      v_demand_desc := 'Demanda criada automaticamente via distribuição do projeto. Briefing disponível no detalhe do projeto.';

      v_demand_id := gen_random_uuid();
      INSERT INTO public.demands (
        id, project_id, from_user_id, from_area_id,
        to_user_id, to_area_id, title, description,
        status, priority, due_date
      ) VALUES (
        v_demand_id, p_project_id, v_auth_uid, v_auth_area_id,
        v_user_id, v_area_id,
        v_demand_title, v_demand_desc,
        'pending', 'normal', v_default_due_date
      );

      INSERT INTO public.notifications (
        user_id, type, title, message, link_to, should_send_email
      ) VALUES (
        v_user_id, 'demand_assigned',
        'Nova demanda atribuída a você',
        'Você foi designado para o trabalho inicial do projeto: ' || v_project.name,
        '/demandas/' || v_demand_id, true
      );
    END IF;

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
$$;

GRANT EXECUTE ON FUNCTION public.distribute_project(uuid, jsonb, text) TO authenticated;

-- 4. Update create_paper_version to also cap SLA at data_entrega_final
CREATE OR REPLACE FUNCTION public.create_paper_version(p_project_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_is_allowed boolean := false;
  v_is_admin boolean := false;
  v_is_director boolean := false;
  v_new_version integer;
  v_new_paper_id uuid;
  v_project RECORD;
  v_planning_area_id uuid;
  v_planning_stage_id uuid;
  v_existing_demand RECORD;
  v_sla_hours int := 120;
  v_due_date date;
  v_user_area_id uuid;
  v_planning_user RECORD;
  v_demand_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Admin / Director check
  SELECT COALESCE(is_admin, false), COALESCE(is_director, false)
  INTO v_is_admin, v_is_director
  FROM public.profiles
  WHERE id = (
    SELECT profile_id FROM public.users WHERE id = v_user_id
  );

  v_is_allowed := COALESCE(v_is_admin, false) OR COALESCE(v_is_director, false);

  -- Planejamento check
  IF NOT v_is_allowed THEN
    SELECT EXISTS (
      SELECT 1 FROM public.area_responsibles ar
      JOIN public.areas a ON a.id = ar.area_id
      WHERE ar.user_id = v_user_id AND lower(a.code) = 'planejamento'
    ) INTO v_is_allowed;
  END IF;

  IF NOT v_is_allowed THEN
    RAISE EXCEPTION 'Acesso negado: apenas Administradores, Diretores ou equipe de Planejamento podem criar papers.';
  END IF;

  SELECT * INTO v_project
  FROM public.projects
  WHERE id = p_project_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Projeto não encontrado';
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

  -- Sincronizar Demanda de Planejamento
  SELECT id INTO v_planning_area_id
  FROM public.areas
  WHERE lower(code) = 'planejamento'
  LIMIT 1;

  IF v_planning_area_id IS NOT NULL THEN
    -- Obter etapa 1 do Kanban do Planejamento
    SELECT id INTO v_planning_stage_id
    FROM public.kanban_stages
    WHERE area_id = v_planning_area_id
    ORDER BY position ASC
    LIMIT 1;

    -- Obter SLA do paper
    SELECT COALESCE(hours_limit, 120) INTO v_sla_hours
    FROM public.sla_configs
    WHERE stage_code = 'planejamento_paper' AND is_active = true
    LIMIT 1;

    IF v_sla_hours IS NULL THEN
      v_sla_hours := 120;
    END IF;

    v_due_date := (NOW() + (v_sla_hours || ' hours')::interval)::date;

    -- Ajustar SLA à data_entrega_final se informada
    IF v_project.data_entrega_final IS NOT NULL AND v_due_date > v_project.data_entrega_final THEN
      v_due_date := v_project.data_entrega_final;
    ELSIF v_project.data_entrega_final IS NULL AND v_project.end_date IS NOT NULL AND v_due_date > v_project.end_date THEN
      v_due_date := v_project.end_date;
    END IF;

    SELECT area_id INTO v_user_area_id
    FROM public.area_responsibles
    WHERE user_id = v_user_id
    LIMIT 1;

    -- Verificar se já existe uma demanda de Paper de Planejamento para este projeto
    SELECT * INTO v_existing_demand
    FROM public.demands
    WHERE project_id = p_project_id
      AND to_area_id = v_planning_area_id
      AND (
        title LIKE 'Paper de Planejamento%'
        OR title LIKE 'Trabalho inicial%'
      )
    ORDER BY created_at DESC
    LIMIT 1;

    IF FOUND THEN
      -- Se a demanda já tem um prazo que ultrapassa a entrega final, ajustar
      IF v_existing_demand.due_date IS NOT NULL AND v_project.data_entrega_final IS NOT NULL AND v_existing_demand.due_date > v_project.data_entrega_final THEN
        v_due_date := v_project.data_entrega_final;
      ELSE
        v_due_date := COALESCE(v_existing_demand.due_date, v_due_date);
      END IF;

      -- Atualizar demanda existente para refletir a nova versão e o estágio adequado
      UPDATE public.demands
      SET
        title = 'Paper de Planejamento — ' || v_project.name,
        description = 'Paper de Planejamento (versão ' || v_new_version || '). Briefing e estratégias no detalhe do Paper.',
        status = 'in_progress',
        priority = 'high',
        due_date = v_due_date,
        kanban_stage_id = COALESCE(kanban_stage_id, v_planning_stage_id),
        updated_at = NOW()
      WHERE id = v_existing_demand.id;
    ELSE
      -- Criar nova demanda dedicada
      v_demand_id := gen_random_uuid();
      INSERT INTO public.demands (
        id, project_id, from_user_id, from_area_id,
        to_user_id, to_area_id, title, description,
        status, priority, due_date, kanban_stage_id
      ) VALUES (
        v_demand_id, p_project_id, v_user_id, v_user_area_id,
        v_user_id, v_planning_area_id,
        'Paper de Planejamento — ' || v_project.name,
        'Paper de Planejamento (versão ' || v_new_version || '). Briefing e estratégias no detalhe do Paper.',
        'in_progress', 'high', v_due_date, v_planning_stage_id
      );

      -- Notificar membros da equipe de planejamento
      FOR v_planning_user IN
        SELECT DISTINCT ar.user_id
        FROM public.area_responsibles ar
        JOIN public.users u ON u.id = ar.user_id
        WHERE ar.area_id = v_planning_area_id AND u.is_active = true AND ar.user_id != v_user_id
      LOOP
        INSERT INTO public.notifications (
          user_id, type, title, message, link_to, should_send_email
        ) VALUES (
          v_planning_user.user_id, 'demand_assigned',
          'Nova versão do Paper de Planejamento',
          'A versão ' || v_new_version || ' do Paper de Planejamento foi iniciada para o projeto ' || v_project.name,
          '/demandas/' || v_demand_id, true
        );
      END LOOP;
    END IF;
  END IF;

  RETURN v_new_paper_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_paper_version(uuid) TO authenticated;
