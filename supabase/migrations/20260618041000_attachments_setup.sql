-- 1. Create tables if not exist (idempotent)
CREATE TABLE IF NOT EXISTS public.project_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT,
  storage_path TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.demand_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id UUID REFERENCES public.demands(id) ON DELETE CASCADE NOT NULL,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT,
  storage_path TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_project_attachments_project ON public.project_attachments(project_id);
CREATE INDEX IF NOT EXISTS idx_demand_attachments_demand ON public.demand_attachments(demand_id);

-- 3. RLS for DB Tables
ALTER TABLE public.project_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_attachments_select" ON public.project_attachments;
CREATE POLICY "project_attachments_select" ON public.project_attachments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "project_attachments_insert" ON public.project_attachments;
CREATE POLICY "project_attachments_insert" ON public.project_attachments FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "project_attachments_delete" ON public.project_attachments;
CREATE POLICY "project_attachments_delete" ON public.project_attachments FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "demand_attachments_select" ON public.demand_attachments;
CREATE POLICY "demand_attachments_select" ON public.demand_attachments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "demand_attachments_insert" ON public.demand_attachments;
CREATE POLICY "demand_attachments_insert" ON public.demand_attachments FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "demand_attachments_delete" ON public.demand_attachments;
CREATE POLICY "demand_attachments_delete" ON public.demand_attachments FOR DELETE TO authenticated USING (true);

-- 4. Storage Buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('demand-files', 'demand-files', false)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage Policies for project-files
DROP POLICY IF EXISTS "Authenticated users can upload project files" ON storage.objects;
CREATE POLICY "Authenticated users can upload project files" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'project-files');

DROP POLICY IF EXISTS "Authenticated users can select project files" ON storage.objects;
CREATE POLICY "Authenticated users can select project files" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'project-files');

DROP POLICY IF EXISTS "Authenticated users can delete project files" ON storage.objects;
CREATE POLICY "Authenticated users can delete project files" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'project-files');

-- 6. Storage Policies for demand-files
DROP POLICY IF EXISTS "Authenticated users can upload demand files" ON storage.objects;
CREATE POLICY "Authenticated users can upload demand files" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'demand-files');

DROP POLICY IF EXISTS "Authenticated users can select demand files" ON storage.objects;
CREATE POLICY "Authenticated users can select demand files" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'demand-files');

DROP POLICY IF EXISTS "Authenticated users can delete demand files" ON storage.objects;
CREATE POLICY "Authenticated users can delete demand files" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'demand-files');
