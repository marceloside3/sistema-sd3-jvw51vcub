-- Migration: Restringir edição e criação de project_papers apenas para Planejamento, Admins e Diretores
-- Outros usuários autenticados mantêm permissão de leitura (SELECT via select_papers)

-- 1. Helper function or subquery to check if current user is Planning, Admin or Director
-- Drop existing update policies on project_papers
DROP POLICY IF EXISTS "update_papers" ON public.project_papers;
DROP POLICY IF EXISTS "update_papers_planning" ON public.project_papers;

-- Create single update policy for project_papers restricting to Planning, Admins and Directors
CREATE POLICY "update_papers_planning" ON public.project_papers
  FOR UPDATE TO authenticated
  USING (
    public.can_view_project(project_id)
    AND (
      public.is_admin()
      OR public.is_director()
      OR EXISTS (
        SELECT 1 FROM public.area_responsibles ar
        JOIN public.areas a ON a.id = ar.area_id
        WHERE ar.user_id = auth.uid()
          AND lower(a.code) = 'planejamento'
      )
    )
  )
  WITH CHECK (
    public.can_view_project(project_id)
    AND (
      public.is_admin()
      OR public.is_director()
      OR EXISTS (
        SELECT 1 FROM public.area_responsibles ar
        JOIN public.areas a ON a.id = ar.area_id
        WHERE ar.user_id = auth.uid()
          AND lower(a.code) = 'planejamento'
      )
    )
  );

-- 2. Restrict INSERT on project_papers to Planning, Admins and Directors
DROP POLICY IF EXISTS "insert_papers" ON public.project_papers;
CREATE POLICY "insert_papers" ON public.project_papers
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_view_project(project_id)
    AND (
      public.is_admin()
      OR public.is_director()
      OR EXISTS (
        SELECT 1 FROM public.area_responsibles ar
        JOIN public.areas a ON a.id = ar.area_id
        WHERE ar.user_id = auth.uid()
          AND lower(a.code) = 'planejamento'
      )
    )
  );

-- 3. Update create_paper_version RPC to include is_director as well as admin and planning
CREATE OR REPLACE FUNCTION public.create_paper_version(p_project_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid;
  v_is_allowed boolean := false;
  v_is_admin boolean := false;
  v_is_director boolean := false;
  v_new_version integer;
  v_new_paper_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Admin check
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

  RETURN v_new_paper_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_paper_version(uuid) TO authenticated;
