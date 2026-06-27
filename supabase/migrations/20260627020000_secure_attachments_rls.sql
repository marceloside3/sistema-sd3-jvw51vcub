-- 1. Project Attachments Security Hardening
DROP POLICY IF EXISTS "project_attachments_select" ON public.project_attachments;
DROP POLICY IF EXISTS "project_attachments_insert" ON public.project_attachments;
DROP POLICY IF EXISTS "project_attachments_delete" ON public.project_attachments;
DROP POLICY IF EXISTS "project_attachments_update" ON public.project_attachments;

CREATE POLICY "project_attachments_select" ON public.project_attachments 
FOR SELECT TO authenticated USING (public.can_view_project(project_id));

CREATE POLICY "project_attachments_insert" ON public.project_attachments 
FOR INSERT TO authenticated WITH CHECK (public.can_view_project(project_id));

CREATE POLICY "project_attachments_update" ON public.project_attachments 
FOR UPDATE TO authenticated USING (public.can_view_project(project_id)) WITH CHECK (public.can_view_project(project_id));

CREATE POLICY "project_attachments_delete" ON public.project_attachments 
FOR DELETE TO authenticated USING (public.can_view_project(project_id));

-- 2. Demand Attachments Security Hardening
DROP POLICY IF EXISTS "demand_attachments_select" ON public.demand_attachments;
DROP POLICY IF EXISTS "demand_attachments_insert" ON public.demand_attachments;
DROP POLICY IF EXISTS "demand_attachments_delete" ON public.demand_attachments;
DROP POLICY IF EXISTS "demand_attachments_update" ON public.demand_attachments;

CREATE POLICY "demand_attachments_select" ON public.demand_attachments 
FOR SELECT TO authenticated USING (
  public.can_view_project((SELECT project_id FROM public.demands WHERE id = demand_attachments.demand_id))
);

CREATE POLICY "demand_attachments_insert" ON public.demand_attachments 
FOR INSERT TO authenticated WITH CHECK (
  public.can_view_project((SELECT project_id FROM public.demands WHERE id = demand_attachments.demand_id))
);

CREATE POLICY "demand_attachments_update" ON public.demand_attachments 
FOR UPDATE TO authenticated USING (
  public.can_view_project((SELECT project_id FROM public.demands WHERE id = demand_attachments.demand_id))
) WITH CHECK (
  public.can_view_project((SELECT project_id FROM public.demands WHERE id = demand_attachments.demand_id))
);

CREATE POLICY "demand_attachments_delete" ON public.demand_attachments 
FOR DELETE TO authenticated USING (
  public.can_view_project((SELECT project_id FROM public.demands WHERE id = demand_attachments.demand_id))
);
