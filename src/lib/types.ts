export interface User {
  user_id: string
  name: string
  profile_id: number // 1 = Diretor de Área, 2 = Analista, etc.
  area_id: number
}

export type ProjectStatus = 'briefing' | 'execution' | 'waiting_gate' | 'finalized'
export type SlaStatus = 'ok' | 'warning' | 'late'

export interface Project {
  project_id: string
  client_name: string
  current_area: number
  active_gate: number // 1 to 7
  status: ProjectStatus
  sla_status: SlaStatus
  kamino_sync_id: string | null
  gates_passed: number[]
  briefing_data: {
    objective: string
    target_audience: string
    budget: string
    deliverables: string[]
  }
}

export interface GateOverride {
  override_id: string
  project_id: string
  gate_id: number
  profile_id: number
  justification: string
  created_at: string
}

export interface GateAlert {
  alert_id: string
  project_id: string
  gate_id: number
  message: string
  created_at: string
}

export const MACRO_AREAS = [
  { id: 1, name: 'Comercial', slug: 'comercial' },
  { id: 2, name: 'Atendimento (HUB)', slug: 'hub' },
  { id: 3, name: 'Planejamento', slug: 'planejamento' },
  { id: 4, name: 'Criação', slug: 'criacao' },
  { id: 5, name: 'Social', slug: 'social' },
  { id: 6, name: 'Mídia', slug: 'midia' },
  { id: 7, name: 'Influs', slug: 'influs' },
  { id: 8, name: 'Produção', slug: 'producao' },
  { id: 9, name: 'Financeiro', slug: 'financeiro' },
  { id: 10, name: 'Fiscal/Contábil', slug: 'fiscal' },
  { id: 11, name: 'Jurídico', slug: 'juridico' },
  { id: 12, name: 'Administrativo/RH', slug: 'rh' },
] as const

export const GOVERNANCE_GATES = [
  { id: 1, name: 'G1: Briefing Validado' },
  { id: 2, name: 'G2: Estratégia Aprovada' },
  { id: 3, name: 'G3: Criação Aprovada' },
  { id: 4, name: 'G4: Mídia Planejada' },
  { id: 5, name: 'G5: Cliente Aprovou' },
  { id: 6, name: 'G6: Produção Concluída' },
  { id: 7, name: 'G7: Faturamento / Kamino' },
] as const
