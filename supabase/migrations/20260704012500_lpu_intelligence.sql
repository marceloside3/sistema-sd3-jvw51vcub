-- LPU Intelligence: client_lpu_items table + demand_items enhancements

-- 1. Create client_lpu_items table
CREATE TABLE IF NOT EXISTS public.client_lpu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  item_name TEXT NOT NULL,
  range TEXT,
  description TEXT,
  unit_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for lookups by client
CREATE INDEX IF NOT EXISTS idx_client_lpu_items_client_id ON public.client_lpu_items(client_id);

-- 2. Add columns to demand_items for LPU tracking
ALTER TABLE public.demand_items ADD COLUMN IF NOT EXISTS lpu_item_id UUID REFERENCES public.client_lpu_items(id) ON DELETE SET NULL;
ALTER TABLE public.demand_items ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2);
ALTER TABLE public.demand_items ADD COLUMN IF NOT EXISTS is_custom BOOLEAN NOT NULL DEFAULT false;

-- 3. RLS policies for client_lpu_items
ALTER TABLE public.client_lpu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_client_lpu_items" ON public.client_lpu_items;
CREATE POLICY "authenticated_select_client_lpu_items" ON public.client_lpu_items
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_director_insert_client_lpu_items" ON public.client_lpu_items;
CREATE POLICY "admin_director_insert_client_lpu_items" ON public.client_lpu_items
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.users u ON p.id = u.profile_id
      WHERE u.id = auth.uid() AND (p.is_admin = true OR p.is_director = true)
    )
  );

DROP POLICY IF EXISTS "admin_director_update_client_lpu_items" ON public.client_lpu_items;
CREATE POLICY "admin_director_update_client_lpu_items" ON public.client_lpu_items
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.users u ON p.id = u.profile_id
      WHERE u.id = auth.uid() AND (p.is_admin = true OR p.is_director = true)
    )
  );

DROP POLICY IF EXISTS "admin_director_delete_client_lpu_items" ON public.client_lpu_items;
CREATE POLICY "admin_director_delete_client_lpu_items" ON public.client_lpu_items
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.users u ON p.id = u.profile_id
      WHERE u.id = auth.uid() AND (p.is_admin = true OR p.is_director = true)
    )
  );

-- 4. Trigger for updated_at on client_lpu_items
DROP TRIGGER IF EXISTS set_client_lpu_items_updated_at ON public.client_lpu_items;
CREATE TRIGGER set_client_lpu_items_updated_at
  BEFORE UPDATE ON public.client_lpu_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
