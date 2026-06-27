DO $$
BEGIN
  ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS origin_type TEXT NOT NULL DEFAULT 'manual';
  ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS briefing_data JSONB NOT NULL DEFAULT '{}'::jsonb;
  ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS briefing_completed_at TIMESTAMPTZ;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projects_origin_type_check' AND conrelid = 'public.projects'::regclass
  ) THEN
    ALTER TABLE public.projects ADD CONSTRAINT projects_origin_type_check CHECK (origin_type IN ('manual', 'handoff_comercial'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_projects_origin_type ON public.projects(origin_type);
CREATE INDEX IF NOT EXISTS idx_projects_briefing_completed ON public.projects(briefing_completed_at);
