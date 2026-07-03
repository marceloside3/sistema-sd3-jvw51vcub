import { supabase } from '@/lib/supabase/client'

export const createNotification = async (payload: {
  user_id: string
  type: string
  title: string
  message: string
  link_to?: string
  should_send_email?: boolean
}) => {
  const { data, error } = await supabase.from('notifications').insert([payload]).select().single()
  if (error) throw error
  return data
}

export const notifyProjectStatusChange = async (
  projectId: string,
  projectName: string,
  newStatus: string,
  actorId: string,
  actorName: string,
) => {
  try {
    const recipients = new Set<string>()

    // 1. Directors
    const { data: directors } = await supabase
      .from('users')
      .select('id, profiles!inner(is_director)')
      .eq('profiles.is_director', true)

    if (directors) {
      directors.forEach((d) => recipients.add(d.id))
    }

    // 2. Project Creator & Area Leads
    const { data: projectData } = await supabase
      .from('projects')
      .select(`
        created_by,
        project_areas(
          is_lead,
          area_id
        )
      `)
      .eq('id', projectId)
      .single()

    if (projectData) {
      recipients.add(projectData.created_by)

      const leadAreas =
        projectData.project_areas?.filter((pa: any) => pa.is_lead).map((pa: any) => pa.area_id) ||
        []
      if (leadAreas.length > 0) {
        const { data: areaResponsibles } = await supabase
          .from('area_responsibles')
          .select('user_id')
          .in('area_id', leadAreas)

        if (areaResponsibles) {
          areaResponsibles.forEach((ar) => recipients.add(ar.user_id))
        }
      }
    }

    // Remove actor
    recipients.delete(actorId)

    const statusLabels: Record<string, string> = {
      active: 'Ativo',
      in_progress: 'Em Andamento',
      overdue: 'Atrasado',
      completed: 'Concluído',
      cancelled: 'Cancelado',
    }

    const translatedStatus = statusLabels[newStatus] || newStatus

    const notifications = Array.from(recipients).map((userId) => ({
      user_id: userId,
      type: 'project_status_change',
      title: `Projeto "${projectName}"`,
      message: `Projeto ${projectName} mudou para ${translatedStatus} por ${actorName}`,
      link_to: `/projetos/${projectId}`,
      should_send_email: false,
    }))

    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications)
    }
  } catch (error) {
    console.error('Error notifying project status change', error)
  }
}

export const getNotifications = async (userId: string, limit = 50) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

export const getUnreadCount = async (userId: string) => {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .eq('is_read', false)
  if (error) throw error
  return count || 0
}

export const markAsRead = async (id: string) => {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  if (error) throw error
}

export const markAllAsRead = async (userId: string) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)
  if (error) throw error
}
