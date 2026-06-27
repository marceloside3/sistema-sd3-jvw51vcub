-- G3 RPCs: submit_paper_to_g3, review_paper_g3, override_paper_g3

CREATE OR REPLACE FUNCTION public.submit_paper_to_g3(p_paper_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_paper RECORD;
  v_user_id uuid;
  v_project_id uuid;
  v_missing_fields text[] := '{}';
  v_planning_user RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_paper FROM public.project_papers WHERE id = p_paper_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paper not found';
  END IF;

  v_project_id := v_paper.project_id;

  -- Only owner can submit
  IF v_paper.created_by IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'Only the paper owner can submit to G3';
  END IF;

  -- Only draft can be submitted
  IF v_paper.status != 'draft' THEN
    RAISE EXCEPTION 'Paper must be in draft status to submit';
  END IF;

  -- Validate all 8 fields are non-empty
  IF v_paper.refined_objective IS NULL OR btrim(v_paper.refined_objective) = '' THEN
    v_missing_fields := array_append(v_missing_fields, 'Objetivo Refinado');
  END IF;

  IF v_paper.personas IS NULL OR jsonb_array_length(v_paper.personas) = 0 THEN
    v_missing_fields := array_append(v_missing_fields, 'Personas');
  END IF;

  IF v_paper.key_message IS NULL OR btrim(v_paper.key_message) = '' THEN
    v_missing_fields := array_append(v_missing_fields, 'Mensagem Principal');
  END IF;

  IF v_paper.channels_priority IS NULL OR jsonb_array_length(v_paper.channels_priority) = 0 THEN
    v_missing_fields := array_append(v_missing_fields, 'Prioridade de Canais');
  END IF;

  IF v_paper.kpis IS NULL OR jsonb_array_length(v_paper.kpis) = 0 THEN
    v_missing_fields := array_append(v_missing_fields, 'KPIs');
  END IF;

  IF v_paper.timeline IS NULL OR jsonb_array_length(v_paper.timeline) = 0 THEN
    v_missing_fields := array_append(v_missing_fields, 'Timeline');
  END IF;

  IF v_paper.budget_allocation IS NULL OR jsonb_array_length(v_paper.budget_allocation) = 0 THEN
    v_missing_fields := array_append(v_missing_fields, 'Alocação de Verba');
  END IF;

  IF v_paper.premises_restrictions IS NULL OR btrim(v_paper.premises_restrictions) = '' THEN
    v_missing_fields := array_append(v_missing_fields, 'Premissas e Restrições');
  END IF;

  IF array_length(v_missing_fields, 1) > 0 THEN
    RAISE EXCEPTION 'Campos obrigatórios faltando: %', array_to_string(v_missing_fields, ', ');
  END IF;

  -- Update status
  UPDATE public.project_papers
  SET status = 'submitted', updated_at = now()
  WHERE id = p_paper_id;

  -- Audit log
  INSERT INTO public.project_audit_log (project_id, event_type, actor_user_id, new_value, metadata)
  VALUES (v_project_id, 'g3_submitted'::public.audit_event_type, v_user_id, 'submitted',
    jsonb_build_object('paper_id', p_paper_id, 'version', v_paper.version));

  -- Notify all users responsible for the "planejamento" area
  FOR v_planning_user IN
    SELECT u.id FROM public.users u
    JOIN public.area_responsibles ar ON ar.user_id = u.id
    JOIN public.areas a ON a.id = ar.area_id
    WHERE lower(a.code) = 'planejamento' AND u.is_active = true
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, link_to)
    VALUES (
      v_planning_user.id,
      'g3_review_requested',
      'Paper submetido para revisão G3',
      'Um paper foi submetido e aguarda sua revisão como responsável de Planejamento.',
      '/projetos/' || v_project_id || '/paper'
    );
  END LOOP;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.submit_paper_to_g3(uuid) TO authenticated;


CREATE OR REPLACE FUNCTION public.review_paper_g3(
  p_paper_id uuid,
  p_decision text,
  p_comment text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_paper RECORD;
  v_user_id uuid;
  v_project_id uuid;
  v_is_allowed boolean := false;
  v_is_admin boolean := false;
  v_owner_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_paper FROM public.project_papers WHERE id = p_paper_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paper not found';
  END IF;

  v_project_id := v_paper.project_id;
  v_owner_id := v_paper.created_by;

  -- Check if user is admin
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = v_user_id;
  v_is_allowed := COALESCE(v_is_admin, false);

  -- Check if user is a Planning Director
  IF NOT v_is_allowed THEN
    SELECT EXISTS (
      SELECT 1 FROM public.area_responsibles ar
      JOIN public.areas a ON a.id = ar.area_id
      JOIN public.users u ON u.id = ar.user_id
      JOIN public.profiles p ON p.id = u.profile_id
      WHERE ar.user_id = v_user_id
        AND lower(a.code) = 'planejamento'
        AND p.is_director = true
    ) INTO v_is_allowed;
  END IF;

  IF NOT v_is_allowed THEN
    RAISE EXCEPTION 'Acesso negado: apenas Diretores de Planejamento ou Super Admins podem revisar papers no G3';
  END IF;

  IF v_paper.status != 'submitted' THEN
    RAISE EXCEPTION 'Paper must be in submitted status to review';
  END IF;

  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Decision must be approved or rejected';
  END IF;

  IF p_decision = 'rejected' AND (p_comment IS NULL OR btrim(p_comment) = '') THEN
    RAISE EXCEPTION 'Comment is required for rejection';
  END IF;

  -- Insert review record
  INSERT INTO public.paper_g3_reviews (paper_id, project_id, reviewer_id, decision, comment)
  VALUES (p_paper_id, v_project_id, v_user_id, p_decision, p_comment);

  IF p_decision = 'approved' THEN
    UPDATE public.project_papers
    SET status = 'approved', approved_by = v_user_id, approved_at = now(), updated_at = now()
    WHERE id = p_paper_id;

    INSERT INTO public.project_audit_log (project_id, event_type, actor_user_id, new_value, metadata)
    VALUES (v_project_id, 'g3_approved'::public.audit_event_type, v_user_id, 'approved',
      jsonb_build_object('paper_id', p_paper_id, 'version', v_paper.version, 'comment', p_comment));

    IF v_owner_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, link_to)
      VALUES (v_owner_id, 'g3_approved', 'Paper aprovado no G3',
        'Seu paper foi aprovado pelo revisor no Gate G3.',
        '/projetos/' || v_project_id || '/paper');
    END IF;
  ELSE
    UPDATE public.project_papers
    SET status = 'draft', updated_at = now()
    WHERE id = p_paper_id;

    INSERT INTO public.project_audit_log (project_id, event_type, actor_user_id, new_value, metadata)
    VALUES (v_project_id, 'g3_rejected'::public.audit_event_type, v_user_id, 'rejected',
      jsonb_build_object('paper_id', p_paper_id, 'version', v_paper.version, 'comment', p_comment));

    IF v_owner_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, link_to)
      VALUES (v_owner_id, 'g3_rejected', 'Paper recusado no G3',
        'Seu paper foi recusado no Gate G3. Comentário: ' || COALESCE(p_comment, ''),
        '/projetos/' || v_project_id || '/paper');
    END IF;
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.review_paper_g3(uuid, text, text) TO authenticated;


CREATE OR REPLACE FUNCTION public.override_paper_g3(
  p_paper_id uuid,
  p_justification text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_paper RECORD;
  v_user_id uuid;
  v_project_id uuid;
  v_is_admin boolean := false;
  v_owner_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_paper FROM public.project_papers WHERE id = p_paper_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Paper not found';
  END IF;

  v_project_id := v_paper.project_id;
  v_owner_id := v_paper.created_by;

  -- Strictly Super Admins only
  SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = v_user_id;
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Acesso negado: apenas Super Admins podem executar override no G3';
  END IF;

  IF p_justification IS NULL OR length(btrim(p_justification)) < 20 THEN
    RAISE EXCEPTION 'Justification must be at least 20 characters';
  END IF;

  IF v_paper.status NOT IN ('draft', 'submitted') THEN
    RAISE EXCEPTION 'Override is only available for draft or submitted papers';
  END IF;

  -- Update paper
  UPDATE public.project_papers
  SET status = 'override',
      override_by = v_user_id,
      override_at = now(),
      override_reason = p_justification,
      updated_at = now()
  WHERE id = p_paper_id;

  -- Audit log
  INSERT INTO public.project_audit_log (project_id, event_type, actor_user_id, new_value, metadata)
  VALUES (v_project_id, 'g3_override'::public.audit_event_type, v_user_id, 'override',
    jsonb_build_object('paper_id', p_paper_id, 'version', v_paper.version, 'reason', p_justification));

  -- Notify owner
  IF v_owner_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, link_to)
    VALUES (v_owner_id, 'g3_override', 'G3 override aplicado',
      'Um override do Gate G3 foi aplicado ao seu paper por um Super Admin.',
      '/projetos/' || v_project_id || '/paper');
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.override_paper_g3(uuid, text) TO authenticated;
