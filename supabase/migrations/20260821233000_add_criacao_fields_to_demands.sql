-- Adds Criação-specific fields to demands and ensures notifications table has expected shape.
-- Idempotent: uses ADD COLUMN IF NOT EXISTS.

ALTER TABLE public.demands
  ADD COLUMN IF NOT EXISTS entrega_a_ser_feita TEXT,
  ADD COLUMN IF NOT EXISTS finalidade_peca TEXT,
  ADD COLUMN IF NOT EXISTS formato_peca TEXT,
  ADD COLUMN IF NOT EXISTS quantidade_pecas INTEGER,
  ADD COLUMN IF NOT EXISTS direcional_pecas TEXT,
  ADD COLUMN IF NOT EXISTS referencias JSONB DEFAULT '[]'::jsonb;

-- Enforce quantidade_pecas >= 1 when set
ALTER TABLE public.demands DROP CONSTRAINT IF EXISTS demands_quantidade_pecas_check;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'demands_quantidade_pecas_check'
  ) THEN
    ALTER TABLE public.demands
      ADD CONSTRAINT demands_quantidade_pecas_check
      CHECK (quantidade_pecas IS NULL OR quantidade_pecas >= 1);
  END IF;
END $$;

-- Index on the new JSONB referencias column is unnecessary (low selectivity). Skip.

-- The notifications table already exists with the required columns:
-- id, user_id, type, title, message, link_to, is_read, created_at, should_send_email.
-- No structural changes needed.
