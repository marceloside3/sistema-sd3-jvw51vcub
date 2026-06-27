-- G3 Paper Approval: schema, RLS, and audit enums

-- Add audit enum values
ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'g3_submitted';
ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'g3_approved';
ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'g3_rejected';
ALTER TYPE public.audit_event_type ADD VALUE IF NOT EXISTS 'g3_override';

-- Add columns to project_papers
ALTER TABLE public.project_papers ADD COLUMN IF NOT EXISTS approved_by uuid;
ALTER TABLE public.project_papers ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE public.project_papers ADD COLUMN IF NOT EXISTS override_by uuid;
ALTER TABLE public.project_papers ADD COLUMN IF NOT EXISTS override_at timestamptz;
ALTER TABLE public.project_papers ADD COLUMN IF NOT EXISTS override_reason text;

-- FK constraints
ALTER TABLE public.project_papers DROP CONSTRAINT IF EXISTS project_papers_approved_by_fkey;
ALTER TABLE public.project_papers ADD CONSTRAINT project_papers_approved_by_fkey
  FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.project_papers DROP CONSTRAINT IF EXISTS project_papers_override_by_fkey;
ALTER TABLE public.project_papers ADD CONSTRAINT project_papers_override_by_fkey
  FOREIGN KEY (override_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- paper_g3_reviews table
CREATE TABLE IF NOT EXISTS public.paper_g3_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id uuid NOT NULL REFERENCES public.project_papers(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  decision text NOT NULL CHECK (decision IN ('approved', 'rejected')),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_paper_g3_reviews_paper ON public.paper_g3_reviews(paper_id);
CREATE INDEX IF NOT EXISTS idx_paper_g3_reviews_project ON public.paper_g3_reviews(project_id);

-- RLS
ALTER TABLE public.paper_g3_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "paper_g3_reviews_select" ON public.paper_g3_reviews;
CREATE POLICY "paper_g3_reviews_select" ON public.paper_g3_reviews
  FOR SELECT TO authenticated USING (public.can_view_project(project_id));

DROP POLICY IF EXISTS "paper_g3_reviews_insert" ON public.paper_g3_reviews;
CREATE POLICY "paper_g3_reviews_insert" ON public.paper_g3_reviews
  FOR INSERT TO authenticated WITH CHECK (public.can_view_project(project_id));

DROP POLICY IF EXISTS "paper_g3_reviews_update" ON public.paper_g3_reviews;
CREATE POLICY "paper_g3_reviews_update" ON public.paper_g3_reviews
  FOR UPDATE TO authenticated USING (public.can_view_project(project_id));

-- Update project_papers status constraint to include new statuses
-- (no explicit constraint exists on status column text, so just allow new values)
