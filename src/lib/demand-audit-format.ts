import { formatCurrency } from '@/lib/financial'
import { formatDateBR } from '@/lib/utils'

const CURRENCY_FIELDS = ['unit_price', 'unit_cost', 'extra_cost', 'total_cost']
const DATE_FIELDS = ['deadline']
const PERCENT_FIELDS = ['honorarios_percentage']
const BOOLEAN_FIELDS = ['is_custom', 'is_locked']

const COST_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  completed: 'Concluído',
}

export function formatAuditValue(field: string, value: string | null | undefined): string {
  if (!value || value === '' || value === 'null' || value === 'undefined') return '—'

  if (CURRENCY_FIELDS.includes(field)) {
    const num = parseFloat(value)
    return isNaN(num) ? value : formatCurrency(num)
  }

  if (DATE_FIELDS.includes(field)) {
    try {
      return formatDateBR(value)
    } catch {
      return value
    }
  }

  if (PERCENT_FIELDS.includes(field)) {
    const num = parseFloat(value)
    return isNaN(num) ? value : `${num.toFixed(2)}%`
  }

  if (BOOLEAN_FIELDS.includes(field)) {
    return value === 'true' ? 'Sim' : 'Não'
  }

  if (field === 'cost_status') {
    return COST_STATUS_LABELS[value] || value
  }

  return value
}
