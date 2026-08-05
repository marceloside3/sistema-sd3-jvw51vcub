ALTER TABLE public.demand_items ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_demand_items_supplier_id ON public.demand_items(supplier_id);
