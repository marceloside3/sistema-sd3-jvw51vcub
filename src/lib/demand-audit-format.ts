import { formatCurrency } from '@/lib/financial'
import { formatDateBR } from '@/lib/utils'

export const DEMAND_AUDIT_FIELD_LABELS: Record<string, string> = {
  item_name: 'Nome do Item',
  description: 'Descrição',
  quantity: 'Quantidade',
  unit_price: 'Preço Unitário',
  unit_cost: 'Custo Unitário',
  extra_cost: 'Custo Extra',
  honorarios_percentage: 'Honorários (%)',
  supplier_name: 'Fornecedor',
  total_cost: 'Custo Total',
  cost_status: 'Status de Custo',
  delivery_location: 'Local de Entrega',
  deadline: 'Prazo',
  is_custom: 'Item Personalizado',
  status: 'Status da Demanda',
  budget_status: 'Status do Orçamento',
  payment_status: 'Status do Pagamento',
  is_locked: 'Bloqueio de Edição',
  item_added: 'Item Adicionado',
  item_removed: 'Item Removido',
}

const CURRENCY_FIELDS = ['unit_price', 'unit_cost', 'extra_cost', 'total_cost']
const DATE_FIELDS = ['deadline']
const PERCENT_FIELDS = ['honorarios_percentage']
const BOOLEAN_FIELDS = ['is_custom', 'is_locked']

export const FIELD_LABELS: Record<string, string> = {
  item_name: 'Nome do Item',
  description: 'Descrição',
  quantity: 'Quantidade',
  unit_price: 'Preço Unitário',
  unit_cost: 'Custo Unitário',
  extra_cost: 'Custo Extra',
  honorarios_percentage: 'Honorários (%)',
  supplier_name: 'Fornecedor',
  total_cost: 'Custo Total',
  cost_status: 'Status de Custo',
  delivery_location: 'Local de Entrega',
  deadline: 'Prazo',
  is_custom: 'Item Personalizado',
  status: 'Status da Demanda',
  budget_status: 'Status do Orçamento',
  payment_status: 'Status do Pagamento',
  is_locked: 'Bloqueio de Edição',
  item_added: 'Item Adicionado',
  item_removed: 'Item Removido',
}

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
