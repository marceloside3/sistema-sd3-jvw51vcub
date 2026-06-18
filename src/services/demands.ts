import { supabase } from '@/lib/supabase/client'

export async function getDemands(filters?: {
  status?: string
  type?: 'sent' | 'received' | 'completed'
  userId?: string
}) {
  let query = supabase
    .from('demands')
    .select(`
      *,
      project:projects(id, name, project_code),
      from_user:users!demands_from_user_id_fkey(id, full_name),
      to_user:users!demands_to_user_id_fkey(id, full_name),
      from_area:areas!demands_from_area_id_fkey(id, name),
      to_area:areas!demands_to_area_id_fkey(id, name)
    `)
    .order('created_at', { ascending: false })

  if (filters?.userId) {
    if (filters.type === 'sent') {
      query = query.eq('from_user_id', filters.userId)
    } else if (filters.type === 'received') {
      query = query.eq('to_user_id', filters.userId)
    } else if (filters.type === 'completed') {
      query = query
        .eq('status', 'done')
        .or(`from_user_id.eq.${filters.userId},to_user_id.eq.${filters.userId}`)
    }
  }

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getProjectDemands(projectId: string) {
  const { data, error } = await supabase
    .from('demands')
    .select(`
      *,
      from_user:users!demands_from_user_id_fkey(id, full_name),
      to_user:users!demands_to_user_id_fkey(id, full_name),
      from_area:areas!demands_from_area_id_fkey(id, name),
      to_area:areas!demands_to_area_id_fkey(id, name)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getDemandById(id: string) {
  const { data, error } = await supabase
    .from('demands')
    .select(`
      *,
      project:projects(id, name, project_code),
      from_user:users!demands_from_user_id_fkey(id, full_name),
      to_user:users!demands_to_user_id_fkey(id, full_name),
      from_area:areas!demands_from_area_id_fkey(id, name),
      to_area:areas!demands_to_area_id_fkey(id, name)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createDemand(payload: any) {
  const { data, error } = await supabase.from('demands').insert([payload]).select().single()

  if (error) throw error
  return data
}

export async function updateDemand(id: string, payload: any) {
  const { data, error } = await supabase
    .from('demands')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getDemandComments(demandId: string) {
  const { data, error } = await supabase
    .from('demand_comments')
    .select(`
      *,
      user:users(id, full_name)
    `)
    .eq('demand_id', demandId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function createDemandComment(payload: any) {
  const { data, error } = await supabase.from('demand_comments').insert([payload]).select().single()

  if (error) throw error
  return data
}

export const getDemandDetails = getDemandById

export async function addDemandComment(demandId: string, userId: string, content: string) {
  return createDemandComment({ demand_id: demandId, user_id: userId, content })
}

export async function updateDemandStatus(id: string, status: string, cancellation_reason?: string) {
  const payload: any = { status }
  if (cancellation_reason) payload.cancellation_reason = cancellation_reason
  return updateDemand(id, payload)
}

export async function getMyDemands(
  userId: string,
  type: 'sent' | 'received' | 'completed',
  filters?: { status?: string },
) {
  const queryFilters: any = { userId, type }
  if (filters?.status && filters.status !== 'all') {
    queryFilters.status = filters.status
  }
  return getDemands(queryFilters)
}
