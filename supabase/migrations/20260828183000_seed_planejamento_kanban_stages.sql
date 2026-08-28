-- Migration: Seed Kanban stages for Planejamento area
-- 7 stages in exact order:
-- 1. Briefing
-- 2. Reunião com Equipe
-- 3. Realização de Pesquisa
-- 4. Apresentação de Papper
-- 5. Planejamento Apresentação
-- 6. Apresentação Interna
-- 7. Apresentação Atendimento

DO $$
DECLARE
  v_area_id UUID;
BEGIN
  SELECT id INTO v_area_id FROM public.areas WHERE code = 'planejamento' LIMIT 1;

  IF v_area_id IS NOT NULL THEN
    -- Insert or update stages for Planejamento
    INSERT INTO public.kanban_stages (area_id, name, position, color)
    VALUES
      (v_area_id, 'Briefing', 1, '#F59E0B'),
      (v_area_id, 'Reunião com Equipe', 2, '#3B82F6'),
      (v_area_id, 'Realização de Pesquisa', 3, '#06B6D4'),
      (v_area_id, 'Apresentação de Papper', 4, '#8B5CF6'),
      (v_area_id, 'Planejamento Apresentação', 5, '#EC4899'),
      (v_area_id, 'Apresentação Interna', 6, '#E11D48'),
      (v_area_id, 'Apresentação Atendimento', 7, '#10B981')
    ON CONFLICT DO NOTHING;

    -- For any existing demands in 'planejamento' area that have null kanban_stage_id,
    -- default them to the position 1 stage (Briefing)
    UPDATE public.demands
    SET kanban_stage_id = (
      SELECT id FROM public.kanban_stages
      WHERE area_id = v_area_id AND position = 1
      LIMIT 1
    )
    WHERE to_area_id = v_area_id
      AND kanban_stage_id IS NULL;
  END IF;
END $$;
