import { StatusBadge } from '@/components/ui/status-badge'
import { formatDateBR } from '@/lib/utils'

interface G3StatusBadgeProps {
  paper: any
  approverName?: string
  className?: string
  size?: 'sm' | 'md'
}

export function G3StatusBadge({ paper, approverName, className, size = 'md' }: G3StatusBadgeProps) {
  if (!paper || !paper.status) return null

  let customLabel: string | undefined

  switch (paper.status) {
    case 'draft':
      customLabel = 'Rascunho'
      break
    case 'submitted':
      customLabel = 'Aguardando aprovação da Diretoria'
      break
    case 'approved':
      customLabel = `Aprovado em ${paper.approved_at ? formatDateBR(paper.approved_at) : '—'}${
        approverName ? ` por ${approverName}` : ''
      }`
      break
    case 'rejected':
      customLabel = 'Recusado pela Diretoria'
      break
    case 'override':
      customLabel = `Override aplicado${paper.override_at ? ` em ${formatDateBR(paper.override_at)}` : ''}`
      break
    default:
      customLabel = undefined
      break
  }

  return (
    <StatusBadge
      category="g3"
      status={paper.status}
      label={customLabel}
      className={className}
      size={size}
    />
  )
}
