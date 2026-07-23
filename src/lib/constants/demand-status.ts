export const DEMAND_PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  urgent: { label: 'Urgente', className: 'bg-red-100 text-red-700 border-red-200' },
  high: { label: 'Alta', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  normal: { label: 'Normal', className: 'bg-zinc-100 text-zinc-600 border-zinc-200' },
  low: { label: 'Baixa', className: 'bg-blue-100 text-blue-700 border-blue-200' },
}

export const DEMAND_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendente', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  in_progress: { label: 'Em Andamento', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  review: { label: 'Em Revisão', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  done: { label: 'Concluída', className: 'bg-green-100 text-green-700 border-green-200' },
  cancelled: { label: 'Cancelada', className: 'bg-zinc-100 text-zinc-400 border-zinc-200' },
}

export const BUDGET_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: {
    label: 'Aguardando Orçamento',
    className: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  },
  sent: { label: 'Enviado para Aprovação', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  approved: { label: 'Aprovado', className: 'bg-green-100 text-green-700 border-green-200' },
  rejected: { label: 'Reprovado', className: 'bg-red-100 text-red-700 border-red-200' },
  adjustments_requested: {
    label: 'Ajustes Solicitados',
    className: 'bg-orange-100 text-orange-700 border-orange-200',
  },
}

export const PAYMENT_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  none: { label: 'Não Iniciado', className: 'bg-zinc-100 text-zinc-500 border-zinc-200' },
  requested: {
    label: 'Pagamento Solicitado',
    className: 'bg-purple-100 text-purple-700 border-purple-200',
  },
  processed: {
    label: 'Pagamento Processado',
    className: 'bg-green-100 text-green-700 border-green-200',
  },
}
