-- Dynamic Gate G2 Validation: validate briefing fields based on project's assigned areas
-- Instead of hardcoded legacy fields, checks only fields relevant to the project's areas

CREATE OR REPLACE FUNCTION public.validate_briefing_for_distribution(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_project RECORD;
  v_briefing jsonb;
  v_issues jsonb := '[]'::jsonb;
  v_is_valid boolean := true;
  v_area_count integer;
  v_area RECORD;
  v_required_fields text[];
  v_all_fields text[];
  v_field text;
  v_val text;
  v_field_label text;
  v_field_labels jsonb;
BEGIN
  SELECT * INTO v_project FROM public.projects WHERE id = p_project_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'is_valid', false,
      'issues_count', 1,
      'issues', jsonb_build_array(jsonb_build_object('rule', 'Projeto', 'message', 'Projeto não encontrado.'))
    );
  END IF;

  v_briefing := COALESCE(v_project.briefing_data, '{}'::jsonb);

  v_field_labels := jsonb_build_object(
    'reuniao_passagem_briefing', 'Reunião de Passagem de Briefing',
    'contexto_projeto', 'Contexto do Projeto',
    'contexto_mercadologico', 'Contexto Mercadológico',
    'especificacoes_tecnicas', 'Especificações Técnicas',
    'infos_comerciais', 'Infos Comerciais',
    'budget_qtde_prazos', 'Budget / Qtde / Prazos',
    'budget_target_periodo_campanha', 'Budget / Target / Período de Campanha',
    'budget_qtde_prazos_formatos_redes_direito_uso', 'Budget / Qtde / Prazos / Formatos / Redes / Direito de Uso',
    'redacao', 'Redação',
    'escopo_redes_conteudos', 'Escopo de Redes e Conteúdos',
    'historico_campanhas_abertura_dados', 'Histórico de Campanhas e Abertura de Dados',
    'assets_marca_guidelines', 'Assets de Marca / Guidelines',
    'referencias', 'Referências',
    'referencias_pecas_campanhas_passadas', 'Referências de Peças e Campanhas Passadas'
  );

  v_all_fields := ARRAY[]::text[];

  FOR v_area IN
    SELECT lower(a.code) as code FROM public.project_areas pa
    JOIN public.areas a ON a.id = pa.area_id
    WHERE pa.project_id = p_project_id
  LOOP
    CASE v_area.code
      WHEN 'planejamento' THEN
        v_required_fields := ARRAY[
          'reuniao_passagem_briefing', 'contexto_projeto', 'contexto_mercadologico',
          'especificacoes_tecnicas', 'infos_comerciais', 'budget_qtde_prazos',
          'redacao', 'assets_marca_guidelines', 'referencias'
        ];
      WHEN 'criacao' THEN
        v_required_fields := ARRAY[
          'contexto_projeto', 'especificacoes_tecnicas', 'infos_comerciais',
          'budget_qtde_prazos', 'redacao', 'assets_marca_guidelines', 'referencias'
        ];
      WHEN 'producao' THEN
        v_required_fields := ARRAY[
          'contexto_projeto', 'especificacoes_tecnicas', 'infos_comerciais',
          'budget_qtde_prazos'
        ];
      WHEN 'social' THEN
        v_required_fields := ARRAY[
          'reuniao_passagem_briefing', 'contexto_projeto', 'contexto_mercadologico',
          'escopo_redes_conteudos', 'assets_marca_guidelines', 'referencias'
        ];
      WHEN 'midia' THEN
        v_required_fields := ARRAY[
          'reuniao_passagem_briefing', 'contexto_projeto', 'contexto_mercadologico',
          'infos_comerciais', 'budget_target_periodo_campanha',
          'historico_campanhas_abertura_dados', 'referencias_pecas_campanhas_passadas'
        ];
      WHEN 'influs' THEN
        v_required_fields := ARRAY[
          'reuniao_passagem_briefing', 'contexto_projeto', 'contexto_mercadologico',
          'infos_comerciais', 'budget_qtde_prazos_formatos_redes_direito_uso',
          'assets_marca_guidelines', 'referencias'
        ];
      ELSE
        v_required_fields := ARRAY[]::text[];
    END CASE;

    FOREACH v_field IN ARRAY v_required_fields
    LOOP
      IF NOT (v_all_fields @> ARRAY[v_field]) THEN
        v_all_fields := array_append(v_all_fields, v_field);
      END IF;
    END LOOP;
  END LOOP;

  FOREACH v_field IN ARRAY v_all_fields
  LOOP
    v_val := v_briefing->>v_field;
    IF v_val IS NULL OR length(trim(v_val)) = 0 THEN
      v_field_label := COALESCE(v_field_labels->>v_field, v_field);
      v_issues := v_issues || jsonb_build_object(
        'rule', v_field_label,
        'message', 'O campo "' || v_field_label || '" não foi preenchido.'
      );
      v_is_valid := false;
    END IF;
  END LOOP;

  IF v_project.client_id IS NULL THEN
    v_issues := v_issues || jsonb_build_object('rule', 'Cliente', 'message', 'O projeto deve ter um cliente associado.');
    v_is_valid := false;
  END IF;

  SELECT count(*) INTO v_area_count FROM public.project_areas WHERE project_id = p_project_id;
  IF v_area_count = 0 THEN
    v_issues := v_issues || jsonb_build_object('rule', 'Áreas do Projeto', 'message', 'Pelo menos uma área deve estar associada ao projeto.');
    v_is_valid := false;
  END IF;

  IF v_project.briefing_completed_at IS NULL THEN
    v_issues := v_issues || jsonb_build_object('rule', 'Briefing Completo', 'message', 'O briefing precisa ser finalizado antes da distribuição.');
    v_is_valid := false;
  END IF;

  IF v_project.start_date IS NOT NULL AND v_project.end_date IS NOT NULL THEN
    IF v_project.end_date < v_project.start_date THEN
      v_issues := v_issues || jsonb_build_object('rule', 'Datas', 'message', 'A data de término deve ser igual ou posterior à data de início.');
      v_is_valid := false;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'is_valid', v_is_valid,
    'issues_count', jsonb_array_length(v_issues),
    'issues', v_issues
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_briefing_for_distribution(uuid) TO authenticated;
