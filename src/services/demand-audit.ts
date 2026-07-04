import { supabase } from '@/lib/supabase/client'

export interface DemandAuditEntry {
  id: string
  demand_id: string
  item_id: string | null
  user_id: string
  field_name: string
  old_value: string | null
  new_value: string | null
  created_at: string
  user?: { full_name: string } | null
  item?: { item_name: string } | null
}

export async function getDemandAuditLog(demandId: string): Promise<DemandAuditEntry[]> {
  const { data, error } = await supabase
    .from('demand_audit_log')
    .select(`
      *,
      user:users(id, full_name),
      item:demand_items(id, item_name)
    `)
    .eq('demand_id', demandId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as DemandAuditEntry[]
}

export async function logDemandAuditEntry(params: {
  demand_id: string
  item_id?: string | null
  user_id: string
  field_name: string
  old_value?: string | null
  new_value?: string | null
}) {
  const { error } = await supabase.from('demand_audit_log').insert([
    {
      demand_id: params.demand_id,
      item_id: params.item_id || null,
      user_id: params.user_id,
      field_name: params.field_name,
      old_value: params.old_value ?? null,
      new_value: params.new_value ?? null,
    },
  ])
  if (error) throw error
}
