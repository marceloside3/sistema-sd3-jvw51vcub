-- Simplify submit_paper_to_g3 to only validate refined_objective (Informações Paper)
-- Also verify project_attachments RLS policies

CREATE OR REPLACE FUNCTION public.submit_paper_to_g3(p_paper_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_paper RECORD;
  v_user_id uuid;
  v_project_id uuid;
  v_missing_fields text[] := '{}';
  v_planning_user RECORD;
  v_is_allowed boolean := false;
  v_is_admin boolean := false;
  v_is_director boolean := false;
  v_is_creator boolean := false;
  v_is_planning boolean := false;
  v_project_creator uuid;
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

  IF v_paper.created_by IS NOT NULL THEN
    v_is_creator := (v_paper.created_by = v_user_id);
  ELSE
    SELECT created_by INTO v_project_creator FROM public.projects WHERE id = v_project_id;
    v_is_creator := (v_project_creator = v_user_id);
  END IF;

  SELECT COALESCE(is_admin, false), COALESCE(is_director, false)
  INTO v_is_admin, v_is_director
  FROM public.profiles
  WHERE id = (
    SELECT profile_id FROM public.users WHERE id = v_user_id
  );

  v_is_admin := COALESCE(v_is_admin, false);
  v_is_director := COALESCE(v_is_director, false);

  SELECT EXISTS (
    SELECT 1 FROM public.area_responsibles ar
    JOIN public.areas a ON a.id = ar.area_id
    WHERE ar.user_id = v_user_id
      AND lower(a.code) = 'planejamento'
  ) INTO v_is_planning;

  v_is_planning := COALESCE(v_is_planning, false);

  v_is_allowed := v_is_creator OR v_is_planning OR v_is_admin OR v_is_director;

  IF NOT v_is_allowed THEN
    RAISE EXCEPTION 'Only the paper owner or Planning area members can submit to G3.';
  END IF;

  IF v_paper.status != 'draft' THEN
    RAISE EXCEPTION 'Paper must be in draft status to submit';
  END IF;

  IF v_paper.refined_objective IS NULL OR btrim(v_paper.refined_objective) = '' THEN
    v_missing_fields := array_append(v_missing_fields, 'Informações Paper');
  END IF;

  IF array_length(v_missing_fields, 1) > 0 THEN
    RAISE EXCEPTION 'Campos obrigatórios faltando: %', array_to_string(v_missing_fields, ', ');
  END IF;

  UPDATE public.project_papers
  SET status = 'submitted', updated_at = now()
  WHERE id = p_paper_id;

  INSERT INTO public.project_audit_log (project_id, event_type, actor_user_id, new_value, metadata)
  VALUES (v_project_id, 'g3_submitted'::public.audit_event_type, v_user_id, 'submitted',
    jsonb_build_object('paper_id', p_paper_id, 'version', v_paper.version));

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
$$;

GRANT EXECUTE ON FUNCTION public.submit_paper_to_g3(uuid) TO authenticated;

-- Verify project_attachments RLS policies (idempotent)
DROP POLICY IF EXISTS "project_attachments_select" ON public.project_attachments;
CREATE POLICY "project_attachments_select" ON public.project_attachments
FOR SELECT TO authenticated USING (public.can_view_project(project_id));

DROP POLICY IF EXISTS "project_attachments_insert" ON public.project_attachments;
CREATE POLICY "project_attachments_insert" ON public.project_attachments
FOR INSERT TO authenticated WITH CHECK (public.can_view_project(project_id));

DROP POLICY IF EXISTS "project_attachments_update" ON public.project_attachments;
CREATE POLICY "project_attachments_update" ON public.project_attachments
FOR UPDATE TO authenticated USING (public.can_view_project(project_id)) WITH CHECK (public.can_view_project(project_id));

DROP POLICY IF EXISTS "project_attachments_delete" ON public.project_attachments;
CREATE POLICY "project_attachments_delete" ON public.project_attachments
FOR DELETE TO authenticated USING (public.can_view_project(project_id));
