-- Create kanban_stages table
CREATE TABLE IF NOT EXISTS public.kanban_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on area_id and position
CREATE INDEX IF NOT EXISTS idx_kanban_stages_area_id ON public.kanban_stages(area_id);
CREATE INDEX IF NOT EXISTS idx_kanban_stages_position ON public.kanban_stages(position);

-- Create demand_assignments table
CREATE TABLE IF NOT EXISTS public.demand_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id UUID NOT NULL REFERENCES public.demands(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on demand_id and assigned_to
CREATE INDEX IF NOT EXISTS idx_demand_assignments_demand ON public.demand_assignments(demand_id);
CREATE INDEX IF NOT EXISTS idx_demand_assignments_assigned_to ON public.demand_assignments(assigned_to);

-- Add kanban_stage_id and feedback column to demands if not exists
ALTER TABLE public.demands
ADD COLUMN IF NOT EXISTS kanban_stage_id UUID REFERENCES public.kanban_stages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_demands_kanban_stage_id ON public.demands(kanban_stage_id);

-- Enable RLS on new tables
ALTER TABLE public.kanban_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kanban_stages
DROP POLICY IF EXISTS "authenticated_select_kanban_stages" ON public.kanban_stages;
CREATE POLICY "authenticated_select_kanban_stages" ON public.kanban_stages
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_all_kanban_stages" ON public.kanban_stages;
CREATE POLICY "admin_all_kanban_stages" ON public.kanban_stages
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.profiles p ON u.profile_id = p.id
      WHERE u.id = auth.uid() AND (p.is_admin = true OR p.is_director = true)
    )
  );

-- RLS Policies for demand_assignments
DROP POLICY IF EXISTS "authenticated_select_demand_assignments" ON public.demand_assignments;
CREATE POLICY "authenticated_select_demand_assignments" ON public.demand_assignments
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_demand_assignments" ON public.demand_assignments;
CREATE POLICY "authenticated_insert_demand_assignments" ON public.demand_assignments
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_demand_assignments" ON public.demand_assignments;
CREATE POLICY "authenticated_update_demand_assignments" ON public.demand_assignments
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_demand_assignments" ON public.demand_assignments;
CREATE POLICY "authenticated_delete_demand_assignments" ON public.demand_assignments
  FOR DELETE TO authenticated USING (true);

-- Seed kanban_stages for area Criação
DO $$
DECLARE
  v_criacao_area_id UUID;
  v_stage_fila_id UUID;
BEGIN
  SELECT id INTO v_criacao_area_id FROM public.areas WHERE code = 'criacao' LIMIT 1;
  
  IF v_criacao_area_id IS NOT NULL THEN
    -- 1. Fila do Diretor (#EAB308)
    INSERT INTO public.kanban_stages (area_id, name, position, color)
    SELECT v_criacao_area_id, 'Fila do Diretor', 1, '#EAB308'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.kanban_stages WHERE area_id = v_criacao_area_id AND name = 'Fila do Diretor'
    );

    -- 2. A Fazer (#3B82F6)
    INSERT INTO public.kanban_stages (area_id, name, position, color)
    SELECT v_criacao_area_id, 'A Fazer', 2, '#3B82F6'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.kanban_stages WHERE area_id = v_criacao_area_id AND name = 'A Fazer'
    );

    -- 3. Em Criação (#F97316)
    INSERT INTO public.kanban_stages (area_id, name, position, color)
    SELECT v_criacao_area_id, 'Em Criação', 3, '#F97316'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.kanban_stages WHERE area_id = v_criacao_area_id AND name = 'Em Criação'
    );

    -- 4. Revisão Interna (#EF4444)
    INSERT INTO public.kanban_stages (area_id, name, position, color)
    SELECT v_criacao_area_id, 'Revisão Interna', 4, '#EF4444'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.kanban_stages WHERE area_id = v_criacao_area_id AND name = 'Revisão Interna'
    );

    -- 5. Aguardando Cliente (#8B5CF6)
    INSERT INTO public.kanban_stages (area_id, name, position, color)
    SELECT v_criacao_area_id, 'Aguardando Cliente', 5, '#8B5CF6'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.kanban_stages WHERE area_id = v_criacao_area_id AND name = 'Aguardando Cliente'
    );

    -- 6. Concluído (#22C55E)
    INSERT INTO public.kanban_stages (area_id, name, position, color)
    SELECT v_criacao_area_id, 'Concluído', 6, '#22C55E'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.kanban_stages WHERE area_id = v_criacao_area_id AND name = 'Concluído'
    );

    -- Update existing demands directed to Criação that do not have kanban_stage_id yet
    SELECT id INTO v_stage_fila_id FROM public.kanban_stages WHERE area_id = v_criacao_area_id AND name = 'Fila do Diretor' LIMIT 1;
    
    IF v_stage_fila_id IS NOT NULL THEN
      UPDATE public.demands
      SET kanban_stage_id = v_stage_fila_id
      WHERE to_area_id = v_criacao_area_id AND kanban_stage_id IS NULL;
    END IF;
  END IF;
END $$;
