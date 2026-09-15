-- Link a local supplier to the corresponding Kamino person.
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS kamino_id BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_kamino_id
  ON public.suppliers(kamino_id)
  WHERE kamino_id IS NOT NULL;
