-- =====================================================================
-- Add competence_month and competence_year to projects
-- Update generate_project_code to produce CLIENT-MM-YYYY-SEQ format
-- =====================================================================

-- 1. Add new columns
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS competence_month SMALLINT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS competence_year SMALLINT;

-- 2. Update generate_project_code to accept month/year and produce new format
CREATE OR REPLACE FUNCTION public.generate_project_code(
  p_client_id UUID,
  p_competence_month SMALLINT DEFAULT NULL,
  p_competence_year SMALLINT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_client_code TEXT;
  v_month TEXT;
  v_year TEXT;
  v_count INT;
  v_project_code TEXT;
BEGIN
  SELECT code INTO v_client_code
  FROM public.clients
  WHERE id = p_client_id
  FOR UPDATE;

  IF v_client_code IS NULL THEN
    RAISE EXCEPTION 'Client not found';
  END IF;

  v_month := CASE
    WHEN p_competence_month IS NOT NULL THEN LPAD(p_competence_month::TEXT, 2, '0')
    ELSE to_char(CURRENT_DATE, 'MM')
  END;

  v_year := CASE
    WHEN p_competence_year IS NOT NULL THEN p_competence_year::TEXT
    ELSE to_char(CURRENT_DATE, 'YYYY')
  END;

  SELECT COUNT(*) INTO v_count
  FROM public.projects
  WHERE client_id = p_client_id
    AND competence_month IS NOT DISTINCT FROM p_competence_month
    AND competence_year IS NOT DISTINCT FROM p_competence_year;

  v_project_code := v_client_code || '-' || v_month || '-' || v_year || '-' || LPAD((v_count + 1)::TEXT, 3, '0');
  RETURN v_project_code;
END;
$$;

-- 3. Update set_project_code trigger to pass competence columns
CREATE OR REPLACE FUNCTION public.set_project_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.project_code IS NULL THEN
    NEW.project_code := public.generate_project_code(
      NEW.client_id,
      NEW.competence_month,
      NEW.competence_year
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Backfill existing projects: set competence_month/year from created_at if NULL
DO $$
BEGIN
  UPDATE public.projects
  SET competence_month = EXTRACT(MONTH FROM created_at)::SMALLINT,
      competence_year = EXTRACT(YEAR FROM created_at)::SMALLINT
  WHERE competence_month IS NULL AND competence_year IS NULL;
END $$;
