-- Add extra_cost and honorarios_percentage to demand_items (idempotent)
ALTER TABLE public.demand_items ADD COLUMN IF NOT EXISTS extra_cost NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE public.demand_items ADD COLUMN IF NOT EXISTS honorarios_percentage NUMERIC(5,2) NOT NULL DEFAULT 0;

-- Remove honorario_percentage from clients (fee logic now lives at item level)
ALTER TABLE public.clients DROP COLUMN IF EXISTS honorario_percentage;
