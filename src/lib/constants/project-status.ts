import React from 'react'
import { Badge } from '@/components/ui/badge'

export type ProjectStatus =
  | 'active'
  | 'in_progress'
  | 'draft'
  | 'paused'
  | 'completed'
  | 'cancelled'

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'Ativo',
  in_progress: 'Em Andamento',
  draft: 'Rascunho',
  paused: 'Pausado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
}

export const PROJECT_STATUS_VARIANTS: Record<
  ProjectStatus,
  { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }
> = {
  active: { variant: 'default', className: 'bg-green-600 hover:bg-green-700' },
  in_progress: { variant: 'default', className: 'bg-blue-500 hover:bg-blue-600' },
  draft: { variant: 'secondary' },
  paused: { variant: 'outline', className: 'text-yellow-600 border-yellow-600' },
  completed: { variant: 'default', className: 'bg-blue-600 hover:bg-blue-700' },
  cancelled: { variant: 'destructive' },
}

export function getProjectStatusLabel(status: string): string {
  return PROJECT_STATUS_LABELS[status as ProjectStatus] || status
}

export function getProjectStatusBadge(status: string) {
  const config = PROJECT_STATUS_VARIANTS[status as ProjectStatus]
  if (!config) {
    return React.createElement(Badge, null, status)
  }
  return React.createElement(
    Badge,
    { variant: config.variant, className: config.className },
    PROJECT_STATUS_LABELS[status as ProjectStatus],
  )
}
