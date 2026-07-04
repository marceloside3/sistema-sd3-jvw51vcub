-- Fix numeric field overflow: widen unit_value and unit_price columns

-- Widen client_lpu_items.unit_value from NUMERIC(10,2) to NUMERIC(15,2)
ALTER TABLE public.client_lpu_items
  ALTER COLUMN unit_value TYPE NUMERIC(15,2) USING unit_value::NUMERIC(15,2);

-- Widen demand_items.unit_price to NUMERIC(15,2) for consistency
ALTER TABLE public.demand_items
  ALTER COLUMN unit_price TYPE NUMERIC(15,2) USING unit_price::NUMERIC(15,2);
