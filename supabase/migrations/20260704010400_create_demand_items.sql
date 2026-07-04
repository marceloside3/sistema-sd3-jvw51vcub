-- Create demand_items table for multi-item demands (e.g., Produção area)
CREATE TABLE IF NOT EXISTS public.demand_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id UUID NOT NULL REFERENCES public.demands(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  deadline DATE,
  delivery_location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for lookups by demand
CREATE INDEX IF NOT EXISTS idx_demand_items_demand ON public.demand_items(demand_id);

-- Enable RLS
ALTER TABLE public.demand_items ENABLE ROW LEVEL SECURITY;

-- Policies: aligned with project access (same as demands table)
DROP POLICY IF EXISTS "demand_items_select" ON public.demand_items;
CREATE POLICY "demand_items_select" ON public.demand_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.demands d
      WHERE d.id = demand_id
      AND public.can_view_project(d.project_id)
    )
  );

DROP POLICY IF EXISTS "demand_items_insert" ON public.demand_items;
CREATE POLICY "demand_items_insert" ON public.demand_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.demands d
      WHERE d.id = demand_id
      AND public.can_view_project(d.project_id)
    )
  );

DROP POLICY IF EXISTS "demand_items_update" ON public.demand_items;
CREATE POLICY "demand_items_update" ON public.demand_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.demands d
      WHERE d.id = demand_id
      AND public.can_view_project(d.project_id)
    )
  );

DROP POLICY IF EXISTS "demand_items_delete" ON public.demand_items;
CREATE POLICY "demand_items_delete" ON public.demand_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.demands d
      WHERE d.id = demand_id
      AND public.can_view_project(d.project_id)
    )
  );
