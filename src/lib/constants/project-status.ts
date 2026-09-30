import React from 'react'
import { Badge } from '@/components/ui/badge'

export type ProjectStatus =
  | 'active'
  | 'in_progress'
  | 'draft'
  | 'paused'
  | 'completed'
  | 'cancelled'

import { PROJECT_STATUS_CATALOG, getStatusMeta } from './status-catalog'
import { StatusBadge } from '@/components/ui/status-badge'

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  in_progress: 'Em Andamento',
  draft: 'Rascunho',
  briefing: 'Em Briefing',
  execution: 'Em Execução',
  waiting_gate: 'Aguardando Gate',
  overdue: 'Atrasado',
  paused: 'Pausado',
  completed: 'Concluído',
  finalized: 'Finalizado',
  cancelled: 'Cancelado',
}

export const PROJECT_STATUS_VARIANTS: Record<
  string,
  { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }
> = {
  active: { variant: 'outline', className: PROJECT_STATUS_CATALOG.active.className },
  in_progress: { variant: 'outline', className: PROJECT_STATUS_CATALOG.in_progress.className },
  draft: { variant: 'outline', className: PROJECT_STATUS_CATALOG.draft.className },
  briefing: { variant: 'outline', className: PROJECT_STATUS_CATALOG.briefing.className },
  execution: { variant: 'outline', className: PROJECT_STATUS_CATALOG.execution.className },
  waiting_gate: { variant: 'outline', className: PROJECT_STATUS_CATALOG.waiting_gate.className },
  overdue: { variant: 'outline', className: PROJECT_STATUS_CATALOG.overdue.className },
  paused: { variant: 'outline', className: PROJECT_STATUS_CATALOG.paused.className },
  completed: { variant: 'outline', className: PROJECT_STATUS_CATALOG.completed.className },
  finalized: { variant: 'outline', className: PROJECT_STATUS_CATALOG.finalized.className },
  cancelled: { variant: 'outline', className: PROJECT_STATUS_CATALOG.cancelled.className },
}

export function getProjectStatusLabel(status: string): string {
  return PROJECT_STATUS_LABELS[status] || getStatusMeta('project', status).label
}

export function getProjectStatusBadge(status: string) {
  return React.createElement(StatusBadge, {
    category: 'project',
    status,
  })
}
