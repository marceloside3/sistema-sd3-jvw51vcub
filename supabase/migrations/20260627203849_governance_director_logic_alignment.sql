-- =====================================================================
-- Governance Director Logic Alignment
-- Timestamp: 2026-06-27
--
-- Audited RPCs:
--   1. review_paper_g3     — REQUIRED CORRECTION (admin check bug + director query alignment)
--   2. override_paper_g3   — REQUIRED CORRECTION (admin check bug)
--   3. can_override_g2     — NO CORRECTION NEEDED (already uses proper join)
--   4. distribute_project  — NO CORRECTION NEEDED (delegates to can_override_g2)
--   5. submit_paper_to_g3  — NO CORRECTION NEEDED (owner check, not gate permission)
--   6. validate_briefing_for_distribution — NO CORRECTION NEEDED (validation, not permission)
--
-- Bug Summary:
--   review_paper_g3 and override_paper_g3 queried `profiles WHERE id = auth.uid()`
--   but profiles.id is the profile's own UUID, NOT the user's auth.uid().
--   The Super Admin bypass was therefore completely broken.
--   Fix: join through users.profile_id → profiles.id.
-- =====================================================================


-- -------------------------------------------------------------------
-- 1. review_paper_g3 — CORRECTED
-- -------------------------------------------------------------------
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

  -- Super Admin universal bypass
  SELECT p.is_admin INTO v_is_admin
  FROM public.profiles p
  WHERE p.id = (SELECT profile_id FROM public.users WHERE id = v_user_id);
  v_is_allowed := COALESCE(v_is_admin, false);

  -- Area Director check: is_director = true AND linked to 'planejamento' area
  IF NOT v_is_allowed THEN
    SELECT EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.profiles p ON p.id = u.profile_id
      JOIN public.area_responsibles ar ON ar.user_id = u.id
      JOIN public.areas a ON a.id = ar.area_id
      WHERE u.id = v_user_id
        AND p.is_director = true
        AND a.code = 'planejamento'
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


-- -------------------------------------------------------------------
-- 2. override_paper_g3 — CORRECTED
-- -------------------------------------------------------------------
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

  -- Super Admin universal bypass (FIXED: was querying profiles.id = auth.uid())
  SELECT p.is_admin INTO v_is_admin
  FROM public.profiles p
  WHERE p.id = (SELECT profile_id FROM public.users WHERE id = v_user_id);
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


-- -------------------------------------------------------------------
-- 3. can_override_g2 — NO CORRECTION NEEDED
--    (Re-created unchanged to confirm audit; logic already correct)
-- -------------------------------------------------------------------
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

  -- Super Admin universal bypass
  SELECT p.is_admin INTO v_is_admin
  FROM public.users u
  JOIN public.profiles p ON u.profile_id = p.id
  WHERE u.id = v_user_id;

  IF v_is_admin THEN RETURN true; END IF;

  -- Area Director check: is_director = true AND linked to a hub area
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
