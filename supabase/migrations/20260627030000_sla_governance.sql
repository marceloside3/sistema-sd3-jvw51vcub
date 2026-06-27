CREATE TABLE IF NOT EXISTS public.sla_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_code TEXT UNIQUE NOT NULL,
  stage_name TEXT NOT NULL,
  hours_limit INTEGER NOT NULL CHECK (hours_limit > 0),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sla_configs_stage_code ON public.sla_configs(stage_code);

ALTER TABLE public.sla_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select" ON public.sla_configs;
CREATE POLICY "authenticated_select" ON public.sla_configs FOR SELECT TO authenticated USING (true);

INSERT INTO public.sla_configs (stage_code, stage_name, hours_limit, description)
VALUES 
  ('atendimento_to_areas', 'Atendimento para Áreas', 24, 'Tempo para o hub distribuir o projeto para as áreas'),
  ('comercial_to_atendimento', 'Comercial para Atendimento', 48, 'Tempo para o handoff comercial'),
  ('planejamento_paper', 'Paper de Planejamento', 120, 'Tempo para criar o paper de planejamento'),
  ('juridico_analise', 'Análise Jurídica', 72, 'Tempo para análise de contratos'),
  ('fiscal_nf', 'Emissão de NF', 48, 'Tempo para emissão de nota fiscal')
ON CONFLICT (stage_code) DO UPDATE 
SET hours_limit = EXCLUDED.hours_limit,
    stage_name = EXCLUDED.stage_name,
    description = EXCLUDED.description;
