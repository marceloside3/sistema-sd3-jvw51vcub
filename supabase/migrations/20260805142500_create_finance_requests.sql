-- Create finance_requests table for per-item payment requests from Produção
CREATE TABLE IF NOT EXISTS public.finance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_item_id UUID NOT NULL REFERENCES public.demand_items(id) ON DELETE CASCADE,
  demand_id UUID NOT NULL REFERENCES public.demands(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT,
  unit_cost NUMERIC(15,2),
  quantity INTEGER NOT NULL DEFAULT 1,
  total_cost NUMERIC(15,2),
  status TEXT NOT NULL DEFAULT 'pending',
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint: only one finance request per demand item
CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_requests_demand_item_id
  ON public.finance_requests(demand_item_id);

CREATE INDEX IF NOT EXISTS idx_finance_requests_demand_id
  ON public.finance_requests(demand_id);

-- Enable RLS
ALTER TABLE public.finance_requests ENABLE ROW LEVEL SECURITY;

-- Policies: aligned with project access (same pattern as demand_items)
DROP POLICY IF EXISTS "finance_requests_select" ON public.finance_requests;
CREATE POLICY "finance_requests_select" ON public.finance_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.demands d
      WHERE d.id = demand_id
      AND public.can_view_project(d.project_id)
    )
  );

DROP POLICY IF EXISTS "finance_requests_insert" ON public.finance_requests;
CREATE POLICY "finance_requests_insert" ON public.finance_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.demands d
      WHERE d.id = demand_id
      AND public.can_view_project(d.project_id)
    )
  );

DROP POLICY IF EXISTS "finance_requests_update" ON public.finance_requests;
CREATE POLICY "finance_requests_update" ON public.finance_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.demands d
      WHERE d.id = demand_id
      AND public.can_view_project(d.project_id)
    )
  );

DROP POLICY IF EXISTS "finance_requests_delete" ON public.finance_requests;
CREATE POLICY "finance_requests_delete" ON public.finance_requests
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.demands d
      WHERE d.id = demand_id
      AND public.can_view_project(d.project_id)
    )
  );
