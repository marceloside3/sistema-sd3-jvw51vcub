COMMIT;

ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'paper_created';
ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'paper_updated';
ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'paper_submitted';
ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'paper_new_version';
ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'handover_meeting_scheduled';
ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'handover_meeting_completed';

CREATE TABLE IF NOT EXISTS public.project_papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft',
  refined_objective text,
  personas jsonb DEFAULT '[]'::jsonb,
  key_message text,
  channels_priority jsonb DEFAULT '[]'::jsonb,
  kpis jsonb DEFAULT '[]'::jsonb,
  timeline jsonb DEFAULT '[]'::jsonb,
  budget_allocation jsonb DEFAULT '[]'::jsonb,
  premises_restrictions text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

DROP INDEX IF EXISTS unique_project_version;
CREATE UNIQUE INDEX IF NOT EXISTS unique_project_version ON public.project_papers (project_id, version);

CREATE TABLE IF NOT EXISTS public.handover_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  location_or_link text,
  agenda text,
  notes text,
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.handover_meeting_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.handover_meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_organizer boolean NOT NULL DEFAULT false,
  confirmed boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);

DROP INDEX IF EXISTS unique_meeting_user;
CREATE UNIQUE INDEX IF NOT EXISTS unique_meeting_user ON public.handover_meeting_participants (meeting_id, user_id);

ALTER TABLE public.project_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handover_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handover_meeting_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_papers" ON public.project_papers;
CREATE POLICY "select_papers" ON public.project_papers
  FOR SELECT TO authenticated USING (public.can_view_project(project_id));

DROP POLICY IF EXISTS "update_papers" ON public.project_papers;
CREATE POLICY "update_papers" ON public.project_papers
  FOR UPDATE TO authenticated USING (public.can_view_project(project_id));

DROP POLICY IF EXISTS "insert_papers" ON public.project_papers;
CREATE POLICY "insert_papers" ON public.project_papers
  FOR INSERT TO authenticated WITH CHECK (public.can_view_project(project_id));

DROP POLICY IF EXISTS "select_meetings" ON public.handover_meetings;
CREATE POLICY "select_meetings" ON public.handover_meetings
  FOR SELECT TO authenticated USING (public.can_view_project(project_id));

DROP POLICY IF EXISTS "update_meetings" ON public.handover_meetings;
CREATE POLICY "update_meetings" ON public.handover_meetings
  FOR UPDATE TO authenticated USING (public.can_view_project(project_id));

DROP POLICY IF EXISTS "insert_meetings" ON public.handover_meetings;
CREATE POLICY "insert_meetings" ON public.handover_meetings
  FOR INSERT TO authenticated WITH CHECK (public.can_view_project(project_id));

DROP POLICY IF EXISTS "select_participants" ON public.handover_meeting_participants;
CREATE POLICY "select_participants" ON public.handover_meeting_participants
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.handover_meetings m 
      WHERE m.id = meeting_id AND public.can_view_project(m.project_id)
    )
  );

DROP POLICY IF EXISTS "insert_participants" ON public.handover_meeting_participants;
CREATE POLICY "insert_participants" ON public.handover_meeting_participants
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.handover_meetings m 
      WHERE m.id = meeting_id AND public.can_view_project(m.project_id)
    )
  );

DROP POLICY IF EXISTS "update_participants" ON public.handover_meeting_participants;
CREATE POLICY "update_participants" ON public.handover_meeting_participants
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.handover_meetings m 
      WHERE m.id = meeting_id AND public.can_view_project(m.project_id)
    )
  );

CREATE OR REPLACE FUNCTION public.create_paper_version(p_project_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid;
  v_is_allowed boolean;
  v_new_version integer;
  v_new_paper_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  SELECT is_admin INTO v_is_allowed FROM public.profiles WHERE id = v_user_id;
  
  IF NOT v_is_allowed THEN
    SELECT EXISTS (
      SELECT 1 FROM public.area_responsibles ar
      JOIN public.areas a ON a.id = ar.area_id
      WHERE ar.user_id = v_user_id AND lower(a.code) = 'planejamento'
    ) INTO v_is_allowed;
  END IF;
  
  IF NOT v_is_allowed THEN
    RAISE EXCEPTION 'Acesso negado: apenas Administradores ou equipe de Planejamento podem criar papers.';
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
  
  PERFORM public.audit_log_insert(
    'paper_created'::public.audit_event_type,
    'version',
    null,
    v_new_version::text,
    null,
    p_project_id
  );
  
  RETURN v_new_paper_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.schedule_handover_meeting(
  p_project_id uuid,
  p_scheduled_at timestamptz,
  p_duration_minutes int,
  p_location text,
  p_agenda text,
  p_participant_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid;
  v_is_distributed boolean;
  v_meeting_id uuid;
  v_part_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  SELECT distributed_at IS NOT NULL INTO v_is_distributed
  FROM public.projects WHERE id = p_project_id;
  
  IF NOT COALESCE(v_is_distributed, false) THEN
    RAISE EXCEPTION 'Projeto ainda não foi distribuído.';
  END IF;
  
  INSERT INTO public.handover_meetings (
    project_id, scheduled_at, duration_minutes, location_or_link, agenda, created_by
  ) VALUES (
    p_project_id, p_scheduled_at, p_duration_minutes, p_location, p_agenda, v_user_id
  ) RETURNING id INTO v_meeting_id;
  
  INSERT INTO public.handover_meeting_participants (meeting_id, user_id, is_organizer, confirmed)
  VALUES (v_meeting_id, v_user_id, true, true);
  
  FOREACH v_part_id IN ARRAY p_participant_ids
  LOOP
    IF v_part_id != v_user_id THEN
      INSERT INTO public.handover_meeting_participants (meeting_id, user_id)
      VALUES (v_meeting_id, v_part_id)
      ON CONFLICT (meeting_id, user_id) DO NOTHING;
      
      INSERT INTO public.notifications (user_id, type, title, message, link_to)
      VALUES (
        v_part_id, 
        'meeting_invite', 
        'Convite para Reunião de Passagem', 
        'Você foi convidado para uma reunião de passagem.', 
        '/projetos/' || p_project_id || '/paper'
      );
    END IF;
  END LOOP;
  
  PERFORM public.audit_log_insert(
    'handover_meeting_scheduled'::public.audit_event_type,
    null,
    jsonb_build_object('meeting_id', v_meeting_id),
    p_scheduled_at::text,
    null,
    p_project_id
  );
  
  RETURN v_meeting_id;
END;
$function$;
