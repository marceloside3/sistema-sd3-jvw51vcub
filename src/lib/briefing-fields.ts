export interface BriefingFieldDef {
  key: string
  label: string
}

const AREA_BRIEFING_FIELDS: Record<string, string[]> = {
  planejamento: [
    'reuniao_passagem_briefing',
    'contexto_projeto',
    'contexto_mercadologico',
    'especificacoes_tecnicas',
    'infos_comerciais',
    'budget_qtde_prazos',
    'redacao',
    'assets_marca_guidelines',
    'referencias',
  ],
  criacao: [
    'contexto_projeto',
    'especificacoes_tecnicas',
    'infos_comerciais',
    'budget_qtde_prazos',
    'redacao',
    'assets_marca_guidelines',
    'referencias',
  ],
  producao: [
    'contexto_projeto',
    'especificacoes_tecnicas',
    'infos_comerciais',
    'budget_qtde_prazos',
  ],
  social: [
    'reuniao_passagem_briefing',
    'contexto_projeto',
    'contexto_mercadologico',
    'escopo_redes_conteudos',
    'assets_marca_guidelines',
    'referencias',
  ],
  midia: [
    'reuniao_passagem_briefing',
    'contexto_projeto',
    'contexto_mercadologico',
    'infos_comerciais',
    'budget_target_periodo_campanha',
    'historico_campanhas_abertura_dados',
    'referencias_pecas_campanhas_passadas',
  ],
  influs: [
    'reuniao_passagem_briefing',
    'contexto_projeto',
    'contexto_mercadologico',
    'infos_comerciais',
    'budget_qtde_prazos_formatos_redes_direito_uso',
    'assets_marca_guidelines',
    'referencias',
  ],
}

const FIELD_LABELS: Record<string, string> = {
  reuniao_passagem_briefing: 'REUNIÃO DE PASSAGEM DE BRIEFING',
  contexto_projeto: 'CONTEXTO DO PROJETO',
  contexto_mercadologico: 'CONTEXTO MERCADOLÓGICO',
  especificacoes_tecnicas: 'ESPECIFICAÇÕES TÉCNICAS',
  infos_comerciais: 'INFOS. COMERCIAIS',
  budget_qtde_prazos: 'BUDGET / QTDE / PRAZOS',
  budget_target_periodo_campanha: 'BUDGET / TARGET / PERÍODO DE CAMPANHA',
  budget_qtde_prazos_formatos_redes_direito_uso:
    'BUDGET / QTDE / PRAZOS / FORMATOS / REDES PRIORITÁRIAS / DIREITO DE USO DE IMPULSIONAMENTO',
  redacao: 'REDAÇÃO',
  escopo_redes_conteudos: 'ESCOPO DE REDES E CONTEÚDOS',
  historico_campanhas_abertura_dados: 'HISTÓRICO DE CAMPANHAS E ABERTURA DE DADOS',
  assets_marca_guidelines: 'ASSETS DE MARCA / GUIDELINES',
  referencias: 'REFERÊNCIAS',
  referencias_pecas_campanhas_passadas: 'REFERÊNCIAS DE PEÇAS, CAMPANHAS PASSADAS',
}

const FIELD_ORDER = [
  'reuniao_passagem_briefing',
  'contexto_projeto',
  'contexto_mercadologico',
  'especificacoes_tecnicas',
  'infos_comerciais',
  'budget_qtde_prazos',
  'budget_target_periodo_campanha',
  'budget_qtde_prazos_formatos_redes_direito_uso',
  'redacao',
  'escopo_redes_conteudos',
  'historico_campanhas_abertura_dados',
  'assets_marca_guidelines',
  'referencias',
  'referencias_pecas_campanhas_passadas',
]

export function getBriefingFieldsForAreas(areaCodes: string[]): BriefingFieldDef[] {
  const fieldKeys = new Set<string>()
  for (const code of areaCodes) {
    const fields = AREA_BRIEFING_FIELDS[code]
    if (fields) fields.forEach((f) => fieldKeys.add(f))
  }
  return Array.from(fieldKeys)
    .sort((a, b) => FIELD_ORDER.indexOf(a) - FIELD_ORDER.indexOf(b))
    .map((key) => ({ key, label: FIELD_LABELS[key] || key }))
}

export function getBriefingFieldLabel(key: string): string {
  return FIELD_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export interface BriefingDisplayEntry {
  key: string
  label: string
  value: string
}

export function getDynamicBriefingEntries(
  briefingData: Record<string, unknown> | null | undefined,
): BriefingDisplayEntry[] {
  if (!briefingData || typeof briefingData !== 'object') return []
  return Object.entries(briefingData)
    .filter(([, value]) => {
      if (value === null || value === undefined) return false
      const str = String(value).trim()
      return str !== ''
    })
    .map(([key, value]) => ({
      key,
      label: getBriefingFieldLabel(key),
      value: String(value),
    }))
    .sort((a, b) => FIELD_ORDER.indexOf(a.key) - FIELD_ORDER.indexOf(b.key))
}
