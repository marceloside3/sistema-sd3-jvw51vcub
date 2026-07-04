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

export interface DemandItemInput {
  item_name: string
  description?: string
  quantity: number
  deadline?: string | null
  delivery_location?: string
  lpu_item_id?: string | null
  unit_price?: number | null
  is_custom?: boolean
}

export async function createDemandItems(demandId: string, items: DemandItemInput[]) {
  const payload = items.map((item) => ({
    demand_id: demandId,
    item_name: item.item_name,
    description: item.description || null,
    quantity: item.quantity,
    deadline: item.deadline || null,
    delivery_location: item.delivery_location || null,
    lpu_item_id: item.lpu_item_id || null,
    unit_price: item.unit_price || null,
    is_custom: item.is_custom ?? false,
  }))

  const { data, error } = await supabase.from('demand_items').insert(payload).select()
  if (error) throw error
  return data
}

export async function getDemandItems(demandId: string) {
  const { data, error } = await supabase
    .from('demand_items')
    .select('*')
    .eq('demand_id', demandId)
    .order('created_at', { ascending: true })

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

export async function getAllUserDemands(userId: string) {
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
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .order('created_at', { ascending: false })

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

export async function checkAndNotifyDeadlineAlerts(userId: string) {
  const now = new Date()
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const { data: upcomingDemands, error: demandsError } = await supabase
    .from('demands')
    .select('id, title, due_date, to_user_id, status')
    .eq('to_user_id', userId)
    .in('status', ['pending', 'in_progress', 'review'])
    .not('due_date', 'is', null)
    .lte('due_date', twentyFourHoursFromNow.toISOString().split('T')[0])
    .gte('due_date', now.toISOString().split('T')[0])

  if (demandsError) throw demandsError
  if (!upcomingDemands || upcomingDemands.length === 0) return

  const demandIds = upcomingDemands.map((d) => d.id)
  const demandLinks = demandIds.map((id) => `/demandas/${id}`)

  const { data: existingAlerts, error: alertsError } = await supabase
    .from('notifications')
    .select('link_to')
    .eq('user_id', userId)
    .eq('type', 'deadline_alert')
    .in('link_to', demandLinks)

  if (alertsError) throw alertsError

  const existingLinks = new Set((existingAlerts || []).map((n) => n.link_to))

  const newNotifications = upcomingDemands
    .filter((d) => !existingLinks.has(`/demandas/${d.id}`))
    .map((d) => ({
      user_id: userId,
      type: 'deadline_alert',
      title: 'Atenção: Prazo de Demanda Próximo',
      message: `A demanda '${d.title}' vence em menos de 24 horas. Fique atento ao prazo!`,
      link_to: `/demandas/${d.id}`,
      is_read: false,
      should_send_email: false,
    }))

  if (newNotifications.length > 0) {
    const { error: insertError } = await supabase.from('notifications').insert(newNotifications)
    if (insertError) throw insertError
  }
}
