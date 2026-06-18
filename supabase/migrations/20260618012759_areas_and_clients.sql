-- Area Database Cleanup & Migration
DO $$
DECLARE
  source_id UUID;
  target_id UUID;
  mapping_table JSONB := '{
    "vendas": "comercial",
    "estrategia": "planejamento",
    "bi": "planejamento",
    "conteudo": "criacao",
    "eventos": "producao",
    "administrativo": "administrativo_rh",
    "rh": "administrativo_rh",
    "ti": "administrativo_rh",
    "tecnologia": "administrativo_rh",
    "suporte": "administrativo_rh",
    "logistica": "administrativo_rh",
    "operacoes": "administrativo_rh",
    "marketing": "marketing_interno"
  }';
  k TEXT;
  v TEXT;
  r RECORD;
BEGIN
  -- 1. Insert target areas if they don't exist with appropriate order
  INSERT INTO areas (code, name, display_order) VALUES
  ('atendimento', 'Atendimento', 1),
  ('comercial', 'Comercial', 2),
  ('planejamento', 'Planejamento', 3),
  ('criacao', 'Criação', 4),
  ('social', 'Social', 5),
  ('midia', 'Mídia', 6),
  ('influs', 'Influs', 7),
  ('producao', 'Produção', 8),
  ('financeiro', 'Financeiro', 9),
  ('fiscal_contabil', 'Fiscal / Contábil', 10),
  ('juridico', 'Jurídico', 11),
  ('administrativo_rh', 'Administrativo / RH', 12),
  ('marketing_interno', 'Marketing Interno', 13),
  ('pr', 'PR', 14),
  ('projetos', 'Projetos', 15)
  ON CONFLICT (code) DO NOTHING;

  -- 2. Migrate users from obsolete areas to target areas
  FOR k, v IN SELECT key, value FROM jsonb_each_text(mapping_table)
  LOOP
    SELECT id INTO source_id FROM areas WHERE code = k;
    SELECT id INTO target_id FROM areas WHERE code = v;
    
    IF source_id IS NOT NULL AND target_id IS NOT NULL THEN
      -- Reassign responsibles safely to avoid duplicates
      FOR r IN SELECT user_id FROM area_responsibles WHERE area_id = source_id
      LOOP
        IF NOT EXISTS (SELECT 1 FROM area_responsibles WHERE user_id = r.user_id AND area_id = target_id) THEN
          UPDATE area_responsibles SET area_id = target_id WHERE user_id = r.user_id AND area_id = source_id;
        ELSE
          DELETE FROM area_responsibles WHERE user_id = r.user_id AND area_id = source_id;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  -- 3. Delete any remaining responsibles from areas that are not in the final 15 list
  DELETE FROM area_responsibles WHERE area_id IN (
    SELECT id FROM areas WHERE code NOT IN (
      'atendimento', 'comercial', 'planejamento', 'criacao', 'social', 'midia', 'influs', 
      'producao', 'financeiro', 'fiscal_contabil', 'juridico', 'administrativo_rh', 
      'marketing_interno', 'pr', 'projetos'
    )
  );

  -- 4. Delete the obsolete areas
  DELETE FROM areas WHERE code NOT IN (
    'atendimento', 'comercial', 'planejamento', 'criacao', 'social', 'midia', 'influs', 
    'producao', 'financeiro', 'fiscal_contabil', 'juridico', 'administrativo_rh', 
    'marketing_interno', 'pr', 'projetos'
  );
END $$;


-- Database Schema for Clients
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  cnpj TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  segment TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  has_lpu BOOLEAN NOT NULL DEFAULT false,
  honorario_percentage NUMERIC(5,2) CHECK (honorario_percentage >= 0 AND honorario_percentage <= 99.99),
  created_by UUID REFERENCES public.users(id) ON DELETE RESTRICT DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Code Validation Constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clients_code_key') THEN
    ALTER TABLE public.clients ADD CONSTRAINT clients_code_key UNIQUE (code);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clients_code_check') THEN
    ALTER TABLE public.clients ADD CONSTRAINT clients_code_check CHECK (code ~ '^[A-Z]{3,6}$');
  END IF;
END $$;

-- Triggers
DROP TRIGGER IF EXISTS set_clients_updated_at ON public.clients;
CREATE TRIGGER set_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_clients" ON public.clients;
CREATE POLICY "authenticated_select_clients" ON public.clients
  FOR SELECT TO authenticated
  USING (
    status = 'active' OR 
    EXISTS (SELECT 1 FROM profiles JOIN users ON profiles.id = users.profile_id WHERE users.id = auth.uid() AND (profiles.is_admin = true OR profiles.is_director = true))
  );

DROP POLICY IF EXISTS "admin_director_insert_clients" ON public.clients;
CREATE POLICY "admin_director_insert_clients" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles JOIN users ON profiles.id = users.profile_id WHERE users.id = auth.uid() AND (profiles.is_admin = true OR profiles.is_director = true))
  );

DROP POLICY IF EXISTS "admin_director_update_clients" ON public.clients;
CREATE POLICY "admin_director_update_clients" ON public.clients
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles JOIN users ON profiles.id = users.profile_id WHERE users.id = auth.uid() AND (profiles.is_admin = true OR profiles.is_director = true))
  );
