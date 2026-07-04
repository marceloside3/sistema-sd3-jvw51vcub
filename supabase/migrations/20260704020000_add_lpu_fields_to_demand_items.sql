-- Add LPU-related columns to demand_items (idempotent)
-- These columns support linking demand items to client LPU items and storing historical prices

ALTER TABLE public.demand_items ADD COLUMN IF NOT EXISTS lpu_item_id UUID REFERENCES public.client_lpu_items(id) ON DELETE SET NULL;
ALTER TABLE public.demand_items ADD COLUMN IF NOT EXISTS unit_price NUMERIC;
ALTER TABLE public.demand_items ADD COLUMN IF NOT EXISTS is_custom BOOLEAN NOT NULL DEFAULT false;

-- Index for LPU item lookups
CREATE INDEX IF NOT EXISTS idx_demand_items_lpu_item_id ON public.demand_items(lpu_item_id);
