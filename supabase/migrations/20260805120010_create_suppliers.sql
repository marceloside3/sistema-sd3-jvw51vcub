-- Safe idempotent migration: ensure supplier indexes exist
-- (Original migration referenced non-existent column "type" — suppliers table uses "supplier_type")

CREATE INDEX IF NOT EXISTS idx_suppliers_document ON public.suppliers(document);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_type ON public.suppliers(supplier_type);
