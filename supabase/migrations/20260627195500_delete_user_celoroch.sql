DO $$
DECLARE
  v_user_id uuid;
  v_admin_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'celoroch@hotmail.com';
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'marcelo@side3.com.br';

  DELETE FROM public.area_responsibles WHERE user_id = v_user_id;
  DELETE FROM public.demand_comments WHERE user_id = v_user_id;
  DELETE FROM public.demand_attachments WHERE uploaded_by = v_user_id;
  DELETE FROM public.project_attachments WHERE uploaded_by = v_user_id;
  DELETE FROM public.notifications WHERE user_id = v_user_id;
  DELETE FROM public.handover_meeting_participants WHERE user_id = v_user_id;
  DELETE FROM public.paper_g3_reviews WHERE reviewer_id = v_user_id;

  UPDATE public.project_papers SET approved_by = NULL WHERE approved_by = v_user_id;
  UPDATE public.project_papers SET override_by = NULL WHERE override_by = v_user_id;
  UPDATE public.project_papers SET created_by = NULL WHERE created_by = v_user_id;
  UPDATE public.project_audit_log SET actor_user_id = NULL WHERE actor_user_id = v_user_id;
  UPDATE public.projects SET g2_override_by = NULL WHERE g2_override_by = v_user_id;
  UPDATE public.demands SET to_user_id = NULL WHERE to_user_id = v_user_id;
  UPDATE public.handover_meetings SET created_by = NULL WHERE created_by = v_user_id;

  IF v_admin_id IS NOT NULL THEN
    UPDATE public.projects SET created_by = v_admin_id WHERE created_by = v_user_id;
    UPDATE public.demands SET from_user_id = v_admin_id WHERE from_user_id = v_user_id;
    UPDATE public.clients SET created_by = v_admin_id WHERE created_by = v_user_id;
  END IF;

  DELETE FROM auth.users WHERE id = v_user_id;
END $$;
