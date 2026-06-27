-- Fix G2 Validation logic to match Portuguese keys and handle formatted currency strings
CREATE OR REPLACE FUNCTION public.validate_briefing_for_distribution(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_project RECORD;
  v_areas_count int;
  v_issues jsonb := '[]'::jsonb;
  v_is_valid boolean := true;
  v_val text;
  v_budget numeric;
BEGIN
  SELECT * INTO v_project FROM public.projects WHERE id = p_project_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Project not found'; END IF;

  -- Rule 1: Content
  v_val := v_project.briefing_data->>'objetivo';
  IF v_val IS NULL OR length(trim(v_val)) <= 10 THEN
    v_issues := v_issues || jsonb_build_object('rule', 'Conteúdo do Briefing', 'message', 'Objetivo deve ter mais de 10 caracteres.');
  END IF;
  
  v_val := v_project.briefing_data->>'publico_alvo';
  IF v_val IS NULL OR length(trim(v_val)) <= 10 THEN
    v_issues := v_issues || jsonb_build_object('rule', 'Conteúdo do Briefing', 'message', 'Público Alvo deve ter mais de 10 caracteres.');
  END IF;

  v_val := v_project.briefing_data->>'canais';
  IF v_val IS NULL OR length(trim(v_val)) <= 10 THEN
    v_issues := v_issues || jsonb_build_object('rule', 'Conteúdo do Briefing', 'message', 'Canais devem ter mais de 10 caracteres.');
  END IF;

  v_val := v_project.briefing_data->>'restricoes';
  IF v_val IS NULL OR length(trim(v_val)) <= 10 THEN
    v_issues := v_issues || jsonb_build_object('rule', 'Conteúdo do Briefing', 'message', 'Restrições devem ter mais de 10 caracteres.');
  END IF;

  v_val := v_project.briefing_data->>'referencias';
  IF v_val IS NULL OR length(trim(v_val)) <= 10 THEN
    v_issues := v_issues || jsonb_build_object('rule', 'Conteúdo do Briefing', 'message', 'Referências devem ter mais de 10 caracteres.');
  END IF;

  -- Rule 2: Client
  IF v_project.client_id IS NULL THEN
    v_issues := v_issues || jsonb_build_object('rule', 'Cliente', 'message', 'O projeto deve ter um cliente associado.');
  END IF;

  -- Rule 3: Areas
  SELECT count(*) INTO v_areas_count FROM public.project_areas WHERE project_id = p_project_id;
  IF v_areas_count = 0 THEN
    v_issues := v_issues || jsonb_build_object('rule', 'Áreas Envolvidas', 'message', 'Pelo menos uma área deve estar associada ao projeto.');
  END IF;

  -- Rule 4: Dates
  IF v_project.start_date IS NULL OR v_project.end_date IS NULL THEN
    v_issues := v_issues || jsonb_build_object('rule', 'Datas', 'message', 'As datas de início e término são obrigatórias.');
  ELSIF v_project.end_date <= v_project.start_date THEN
    v_issues := v_issues || jsonb_build_object('rule', 'Datas', 'message', 'A data de término deve ser posterior à data de início.');
  END IF;

  -- Rule 5: Financial
  v_val := v_project.briefing_data->>'budget';
  IF v_val IS NOT NULL THEN
    -- If there's a comma, treat as Brazilian format
    IF v_val LIKE '%,%' THEN
      v_val := regexp_replace(v_val, '\.', '', 'g');
      v_val := regexp_replace(v_val, ',', '.', 'g');
    END IF;
    -- Remove non-digits and non-dots
    v_val := regexp_replace(v_val, '[^0-9\.]', '', 'g');
  END IF;
  
  v_budget := CASE WHEN v_val IS NOT NULL AND v_val ~ '^[0-9\.]+$' THEN v_val::numeric ELSE 0 END;
  IF v_budget <= 0 THEN
    v_issues := v_issues || jsonb_build_object('rule', 'Financeiro', 'message', 'O orçamento do projeto deve ser maior que zero.');
  END IF;

  IF jsonb_array_length(v_issues) > 0 THEN
    v_is_valid := false;
  END IF;

  RETURN jsonb_build_object(
    'is_valid', v_is_valid,
    'issues_count', jsonb_array_length(v_issues),
    'issues', v_issues
  );
END;
$function$;
