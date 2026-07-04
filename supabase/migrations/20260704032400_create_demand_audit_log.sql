CREATE TABLE IF NOT EXISTS public.demand_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id UUID NOT NULL REFERENCES public.demands(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.demand_items(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demand_audit_log_demand ON public.demand_audit_log(demand_id);
CREATE INDEX IF NOT EXISTS idx_demand_audit_log_item ON public.demand_audit_log(item_id);

ALTER TABLE public.demand_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "demand_audit_log_select" ON public.demand_audit_log;
CREATE POLICY "demand_audit_log_select" ON public.demand_audit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.demands d
      WHERE d.id = demand_id
      AND public.can_view_project(d.project_id)
    )
  );

DROP POLICY IF EXISTS "demand_audit_log_insert" ON public.demand_audit_log;
CREATE POLICY "demand_audit_log_insert" ON public.demand_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.demands d
      WHERE d.id = demand_id
      AND public.can_view_project(d.project_id)
    )
  );
