ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_origin_type_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'projects_origin_type_check'
      AND conrelid = 'public.projects'::regclass
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_origin_type_check
      CHECK (origin_type IN ('manual', 'handoff_comercial', 'briefing'));
  END IF;
END $$;
