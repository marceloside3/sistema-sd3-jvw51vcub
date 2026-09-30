import {
  Clock,
  PlayCircle,
  CheckCircle2,
  XCircle,
  FileText,
  AlertTriangle,
  Send,
  Ban,
  PauseCircle,
  Sparkles,
  DollarSign,
  type LucideIcon,
} from 'lucide-react'

export type StatusCategory =
  | 'project'
  | 'demand'
  | 'demand_priority'
  | 'budget'
  | 'budget_status'
  | 'payment'
  | 'payment_status'
  | 'cost'
  | 'cost_status'
  | 'g2'
  | 'g2_status'
  | 'g3'
  | 'g3_status'
  | 'active_boolean'
  | 'entity_active'

export interface StatusMeta {
  /** Rótulo padronizado exibido na interface */
  label: string
  /** Classes Tailwind semânticas consistentes (fundo suave, texto escuro, borda suave) */
  className: string
  /** Ponto de destaque colorido opcional */
  dotColor?: string
  /** Ícone representativo do status */
  icon?: LucideIcon
  /** Descrição curta ou dica */
  description?: string
}

/**
 * CATÁLOGO ÚNICO DE STATUS DO SISTEMA SIDE3
 *
 * Dimensões padronizadas:
 * 1. TEXTO: Rótulos idênticos em todas as telas (ex: "Em Andamento" sempre com mesmo rótulo).
 * 2. COR: Paleta semântica fixa e harmoniosa com o design system SD3 (modo claro + Tailwind).
 *    - Verde / Esmeralda: Sucesso, Concluído, Aprovado, Ativo
 *    - Azul / Índigo: Em Andamento, Execução, Processado
 *    - Âmbar / Laranja: Pendente, Rascunho, Atenção, Ajustes Solicitados, Override
 *    - Amarelo / Dourado: Pausado
 *    - Vermelho / Rose: Atrasado, Cancelado, Reprovado, Urgente
 *    - Roxo / Violeta: Em Revisão, No Financeiro, Solicitação Kamino
 *    - Cinza / Zinco: Não Iniciado, Inativo, Normal/Padrão
 * 3. LAYOUT: Pílula arredondada (`rounded-full`), tipografia padronizada (`text-[11px] font-semibold tracking-wide`),
 *    borda suave integrada (`border px-2.5 py-0.5 inline-flex items-center gap-1.5`).
 */

export const PROJECT_STATUS_CATALOG: Record<string, StatusMeta> = {
  active: {
    label: 'Ativo',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotColor: 'bg-emerald-500',
    icon: CheckCircle2,
  },
  in_progress: {
    label: 'Em Andamento',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    dotColor: 'bg-blue-500',
    icon: PlayCircle,
  },
  draft: {
    label: 'Rascunho',
    className: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    dotColor: 'bg-zinc-400',
    icon: FileText,
  },
  briefing: {
    label: 'Em Briefing',
    className: 'bg-orange-50 text-orange-700 border-orange-200',
    dotColor: 'bg-orange-500',
    icon: FileText,
  },
  execution: {
    label: 'Em Execução',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    dotColor: 'bg-blue-500',
    icon: PlayCircle,
  },
  waiting_gate: {
    label: 'Aguardando Gate',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    dotColor: 'bg-amber-500',
    icon: AlertTriangle,
  },
  overdue: {
    label: 'Atrasado',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
    dotColor: 'bg-rose-500',
    icon: AlertTriangle,
  },
  paused: {
    label: 'Pausado',
    className: 'bg-amber-50 text-amber-800 border-amber-300',
    dotColor: 'bg-amber-500',
    icon: PauseCircle,
  },
  completed: {
    label: 'Concluído',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotColor: 'bg-emerald-500',
    icon: CheckCircle2,
  },
  finalized: {
    label: 'Finalizado',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotColor: 'bg-emerald-500',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelado',
    className: 'bg-zinc-100 text-zinc-600 border-zinc-200',
    dotColor: 'bg-zinc-400',
    icon: Ban,
  },
}

export const DEMAND_STATUS_CATALOG: Record<string, StatusMeta> = {
  pending: {
    label: 'Pendente',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    dotColor: 'bg-amber-500',
    icon: Clock,
  },
  in_progress: {
    label: 'Em Andamento',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    dotColor: 'bg-blue-500',
    icon: PlayCircle,
  },
  review: {
    label: 'Em Revisão',
    className: 'bg-purple-50 text-purple-700 border-purple-200',
    dotColor: 'bg-purple-500',
    icon: Sparkles,
  },
  done: {
    label: 'Concluída',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotColor: 'bg-emerald-500',
    icon: CheckCircle2,
  },
  completed: {
    label: 'Concluída',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotColor: 'bg-emerald-500',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelada',
    className: 'bg-zinc-100 text-zinc-500 border-zinc-200',
    dotColor: 'bg-zinc-400',
    icon: Ban,
  },
  rejected: {
    label: 'Rejeitada',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
    dotColor: 'bg-rose-500',
    icon: XCircle,
  },
}

export const DEMAND_PRIORITY_CATALOG: Record<string, StatusMeta> = {
  urgent: {
    label: 'Urgente',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
    dotColor: 'bg-rose-500',
    icon: AlertTriangle,
  },
  high: {
    label: 'Alta',
    className: 'bg-orange-50 text-orange-700 border-orange-200',
    dotColor: 'bg-orange-500',
    icon: AlertTriangle,
  },
  normal: {
    label: 'Normal',
    className: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    dotColor: 'bg-zinc-400',
  },
  low: {
    label: 'Baixa',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    dotColor: 'bg-blue-500',
  },
}

export const BUDGET_STATUS_CATALOG: Record<string, StatusMeta> = {
  pending: {
    label: 'Aguardando Orçamento',
    className: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    dotColor: 'bg-zinc-400',
    icon: Clock,
  },
  sent: {
    label: 'Enviado para Aprovação',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    dotColor: 'bg-blue-500',
    icon: Send,
  },
  approved: {
    label: 'Aprovado',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotColor: 'bg-emerald-500',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Reprovado',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
    dotColor: 'bg-rose-500',
    icon: XCircle,
  },
  adjustments_requested: {
    label: 'Ajustes Solicitados',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    dotColor: 'bg-amber-500',
    icon: AlertTriangle,
  },
}

export const PAYMENT_STATUS_CATALOG: Record<string, StatusMeta> = {
  none: {
    label: 'Não Iniciado',
    className: 'bg-zinc-100 text-zinc-600 border-zinc-200',
    dotColor: 'bg-zinc-400',
    icon: Clock,
  },
  requested: {
    label: 'Pagamento Solicitado',
    className: 'bg-purple-50 text-purple-700 border-purple-200',
    dotColor: 'bg-purple-500',
    icon: Send,
  },
  processed: {
    label: 'Pagamento Processado',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotColor: 'bg-emerald-500',
    icon: CheckCircle2,
  },
}

export const COST_STATUS_CATALOG: Record<string, StatusMeta> = {
  pending: {
    label: 'Pendente',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    dotColor: 'bg-amber-500',
    icon: Clock,
  },
  completed: {
    label: 'Concluído',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotColor: 'bg-emerald-500',
    icon: CheckCircle2,
  },
}

export const G2_STATUS_CATALOG: Record<string, StatusMeta> = {
  pending: {
    label: 'Pendente',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    dotColor: 'bg-amber-500',
    icon: Clock,
  },
  approved: {
    label: 'Aprovado',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotColor: 'bg-emerald-500',
    icon: CheckCircle2,
  },
  override: {
    label: 'Override',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    dotColor: 'bg-amber-500',
    icon: AlertTriangle,
  },
  g2_override: {
    label: 'Exceção G2 (Override)',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    dotColor: 'bg-amber-500',
    icon: AlertTriangle,
  },
}

export const G3_STATUS_CATALOG: Record<string, StatusMeta> = {
  draft: {
    label: 'Rascunho',
    className: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    dotColor: 'bg-zinc-400',
    icon: FileText,
  },
  submitted: {
    label: 'Aguardando Aprovação',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    dotColor: 'bg-amber-500',
    icon: Clock,
  },
  g3_submitted: {
    label: 'Submetido para Aprovação Diretoria',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    dotColor: 'bg-amber-500',
    icon: Send,
  },
  approved: {
    label: 'Aprovado',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotColor: 'bg-emerald-500',
    icon: CheckCircle2,
  },
  g3_approved: {
    label: 'Aprovação Diretoria concluída',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotColor: 'bg-emerald-500',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Recusado',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
    dotColor: 'bg-rose-500',
    icon: XCircle,
  },
  g3_rejected: {
    label: 'Aprovação Diretoria recusada',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
    dotColor: 'bg-rose-500',
    icon: XCircle,
  },
  override: {
    label: 'Override',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    dotColor: 'bg-amber-500',
    icon: AlertTriangle,
  },
  g3_override: {
    label: 'Override Aprovação Diretoria',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    dotColor: 'bg-amber-500',
    icon: AlertTriangle,
  },
}

export const ENTITY_ACTIVE_CATALOG: Record<string, StatusMeta> = {
  active: {
    label: 'Ativo',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotColor: 'bg-emerald-500',
    icon: CheckCircle2,
  },
  inactive: {
    label: 'Inativo',
    className: 'bg-zinc-100 text-zinc-600 border-zinc-200',
    dotColor: 'bg-zinc-400',
    icon: Ban,
  },
}

export const AREA_ACTIVE_CATALOG: Record<string, StatusMeta> = {
  true: {
    label: 'Ativa',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotColor: 'bg-emerald-500',
    icon: CheckCircle2,
  },
  false: {
    label: 'Inativa',
    className: 'bg-zinc-100 text-zinc-600 border-zinc-200',
    dotColor: 'bg-zinc-400',
    icon: Ban,
  },
}

/** Obtém os metadados padronizados de qualquer status do sistema */
export function getStatusMeta(
  category: StatusCategory,
  status: string | boolean | null | undefined,
): StatusMeta {
  const key = String(status ?? '').toLowerCase()

  let catalog: Record<string, StatusMeta>
  switch (category) {
    case 'project':
      catalog = PROJECT_STATUS_CATALOG
      break
    case 'demand':
      catalog = DEMAND_STATUS_CATALOG
      break
    case 'demand_priority':
      catalog = DEMAND_PRIORITY_CATALOG
      break
    case 'budget':
    case 'budget_status':
      catalog = BUDGET_STATUS_CATALOG
      break
    case 'payment':
    case 'payment_status':
      catalog = PAYMENT_STATUS_CATALOG
      break
    case 'cost':
    case 'cost_status':
      catalog = COST_STATUS_CATALOG
      break
    case 'g2':
    case 'g2_status':
      catalog = G2_STATUS_CATALOG
      break
    case 'g3':
    case 'g3_status':
      catalog = G3_STATUS_CATALOG
      break
    case 'active_boolean':
      catalog = AREA_ACTIVE_CATALOG
      break
    case 'entity_active':
    default:
      catalog = ENTITY_ACTIVE_CATALOG
      break
  }

  if (catalog[key]) {
    return catalog[key]
  }

  // Fallback seguro caso um status novo apareça
  const fallbackLabel = key ? key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ') : '—'
  return {
    label: fallbackLabel,
    className: 'bg-zinc-100 text-zinc-600 border-zinc-200',
    dotColor: 'bg-zinc-400',
  }
}
