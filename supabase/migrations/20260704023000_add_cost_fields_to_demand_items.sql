-- Add production cost and supplier fields to demand_items (idempotent)

ALTER TABLE public.demand_items ADD COLUMN IF NOT EXISTS supplier_name TEXT;
ALTER TABLE public.demand_items ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(15,2);
ALTER TABLE public.demand_items ADD COLUMN IF NOT EXISTS total_cost NUMERIC(15,2);
ALTER TABLE public.demand_items ADD COLUMN IF NOT EXISTS cost_status TEXT NOT NULL DEFAULT 'pending';

-- RLS policies already exist for demand_items (select, insert, update, delete)
-- The existing update policy covers all columns, so authenticated users can update these new fields.
-- No additional policy changes needed.
