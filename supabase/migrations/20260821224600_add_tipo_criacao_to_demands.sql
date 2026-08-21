-- Migration: Add tipo_criacao column to demands table
-- Column stores: 'peca_digital', 'peca_impressa', '3d'

ALTER TABLE public.demands
  ADD COLUMN IF NOT EXISTS tipo_criacao VARCHAR(50);

-- Optional check constraint to ensure allowed values when not null
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'demands_tipo_criacao_check'
  ) THEN
    ALTER TABLE public.demands
      ADD CONSTRAINT demands_tipo_criacao_check
      CHECK (tipo_criacao IS NULL OR tipo_criacao IN ('peca_digital', 'peca_impressa', '3d'));
  END IF;
END $$;
