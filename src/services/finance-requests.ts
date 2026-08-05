import { supabase } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/financial'

export interface FinanceRequest {
  id: string
  demand_item_id: string
  demand_id: string
  supplier_id: string | null
  supplier_name: string | null
  unit_cost: number | null
  quantity: number
  total_cost: number | null
  status: string
  created_by: string
  created_at: string
  updated_at: string
  due_date: string
  justification: string | null
  is_urgent: boolean
}

export async function getFinanceRequestsByDemand(demandId: string): Promise<FinanceRequest[]> {
  const { data, error } = await supabase
    .from('finance_requests')
    .select('*')
    .eq('demand_id', demandId)

  if (error) throw error
  return (data || []) as FinanceRequest[]
}

export async function createFinanceRequest(params: {
  demand_item_id: string
  demand_id: string
  supplier_id?: string | null
  supplier_name?: string | null
  unit_cost?: number | null
  quantity: number
  total_cost?: number | null
  created_by: string
  due_date: string
  is_urgent: boolean
  justification?: string | null
}): Promise<FinanceRequest> {
  const { data, error } = await supabase
    .from('finance_requests')
    .insert([
      {
        demand_item_id: params.demand_item_id,
        demand_id: params.demand_id,
        supplier_id: params.supplier_id || null,
        supplier_name: params.supplier_name || null,
        unit_cost: params.unit_cost ?? null,
        quantity: params.quantity,
        total_cost: params.total_cost ?? null,
        status: 'pending',
        created_by: params.created_by,
        due_date: params.due_date,
        is_urgent: params.is_urgent,
        justification: params.justification || null,
      },
    ])
    .select()
    .single()

  if (error) throw error
  return data as FinanceRequest
}

export async function notifyFinanceUsersOfUrgentRequest(params: {
  demandId: string
  itemName: string
  supplierName: string | null
  totalCost: number | null
  dueDate: string
}): Promise<void> {
  try {
    const { data: financeUsers } = await supabase
      .from('users')
      .select('id, profiles!inner(is_finance)')
      .eq('profiles.is_finance', true)
      .eq('is_active', true)

    if (!financeUsers || financeUsers.length === 0) return

    const message = `Item "${params.itemName}" — Fornecedor: ${params.supplierName || 'N/A'} — Valor: ${formatCurrency(params.totalCost)} — Vencimento: ${params.dueDate.split('-').reverse().join('/')}`

    const notifications = financeUsers.map((u: any) => ({
      user_id: u.id,
      type: 'finance_request_urgent',
      title: 'Solicitação financeira urgente',
      message,
      link_to: `/demandas/${params.demandId}`,
      should_send_email: false,
    }))

    await supabase.from('notifications').insert(notifications)
  } catch (error) {
    console.error('Error notifying finance users', error)
  }
}
