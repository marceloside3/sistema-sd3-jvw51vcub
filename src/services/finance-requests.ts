import { supabase } from '@/lib/supabase/client'

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
      },
    ])
    .select()
    .single()

  if (error) throw error
  return data as FinanceRequest
}
