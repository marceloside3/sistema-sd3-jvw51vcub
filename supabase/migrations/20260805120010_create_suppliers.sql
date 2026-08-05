CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'PJ' CHECK (type IN ('PF', 'PJ')),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  cep TEXT,
  logradouro TEXT,
  number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT,
  uf TEXT,
  account_type TEXT,
  bank TEXT,
  agency TEXT,
  account TEXT,
  operation TEXT,
  pix_key TEXT,
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_document ON public.suppliers(document);
CREATE INDEX IF NOT EXISTS idx_suppliers_type ON public.suppliers(type);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "suppliers_select" ON public.suppliers;
CREATE POLICY "suppliers_select" ON public.suppliers
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "suppliers_insert" ON public.suppliers;
CREATE POLICY "suppliers_insert" ON public.suppliers
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "suppliers_update" ON public.suppliers;
CREATE POLICY "suppliers_update" ON public.suppliers
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "suppliers_delete" ON public.suppliers;
CREATE POLICY "suppliers_delete" ON public.suppliers
  FOR DELETE TO authenticated USING (true);

DROP TRIGGER IF EXISTS set_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER set_suppliers_updated_at BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
