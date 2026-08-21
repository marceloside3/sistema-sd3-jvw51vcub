import { supabase } from '@/lib/supabase/client'

// Cast supabase to any for dynamically created tables not in static types.ts
const db = supabase as any

export interface KanbanStage {
  id: string
  area_id: string
  name: string
  position: number
  color: string
  created_at: string
}

export interface DemandAssignment {
  id: string
  demand_id: string
  assigned_to: string
  assigned_by: string
  created_at: string
  user?: {
    id: string
    full_name: string
    email: string
  }
}

export interface KanbanDemand {
  id: string
  title: string
  description?: string | null
  status: string
  priority: string
  due_date: string | null
  tipo_criacao?: string | null
  kanban_stage_id: string | null
  to_user_id: string | null
  from_user_id: string | null
  to_area_id: string | null
  from_area_id: string | null
  created_at: string
  project?: {
    id: string
    name: string
    project_code: string
  } | null
  assignments?: DemandAssignment[]
  assigned_creative?: {
    id: string
    full_name: string
    email: string
  } | null
}

export interface CreativeUser {
  id: string
  full_name: string
  email: string
  is_director: boolean
}

/**
 * Fetch all kanban stages for a specific area (default: 'criacao')
 */
export async function getKanbanStages(areaCode: string = 'criacao'): Promise<KanbanStage[]> {
  const { data: area, error: areaError } = await db
    .from('areas')
    .select('id')
    .eq('code', areaCode)
    .single()

  if (areaError || !area) {
    throw new Error(`Área '${areaCode}' não encontrada.`)
  }

  const { data, error } = await db
    .from('kanban_stages')
    .select('*')
    .eq('area_id', area.id)
    .order('position', { ascending: true })

  if (error) throw error
  return (data || []) as KanbanStage[]
}

/**
 * Fetch creative team users for Criação area (users assigned to area 'criacao')
 */
export async function getCreationTeamUsers(): Promise<CreativeUser[]> {
  const { data: area, error: areaError } = await db
    .from('areas')
    .select('id')
    .eq('code', 'criacao')
    .single()

  if (areaError || !area) throw areaError

  const { data, error } = await db
    .from('area_responsibles')
    .select(`
      user_id,
      user:users!area_responsibles_user_id_fkey(
        id,
        full_name,
        email,
        profile:profiles(is_director)
      )
    `)
    .eq('area_id', area.id)

  if (error) throw error

  const usersMap = new Map<string, CreativeUser>()
  ;(data || []).forEach((item: any) => {
    if (item.user && item.user.id) {
      const isDirector = Boolean(item.user.profile?.is_director)
      usersMap.set(item.user.id, {
        id: item.user.id,
        full_name: item.user.full_name || item.user.email,
        email: item.user.email,
        is_director: isDirector,
      })
    }
  })

  return Array.from(usersMap.values())
}

/**
 * Fetch demands for the Criação Kanban board
 */
export async function getKanbanDemands(): Promise<{
  demands: KanbanDemand[]
  areaId: string
}> {
  const { data: area, error: areaError } = await db
    .from('areas')
    .select('id')
    .eq('code', 'criacao')
    .single()

  if (areaError || !area) throw areaError

  // Fetch stages to ensure default stage assignment if null
  const { data: stages } = await db
    .from('kanban_stages')
    .select('id, name, position')
    .eq('area_id', area.id)
    .order('position', { ascending: true })

  const filaStage = stages?.find((s: any) => s.position === 1 || s.name.includes('Fila'))

  // Fetch all demands assigned to to_area_id = criacao
  const { data: demandsData, error: demandsError } = await db
    .from('demands')
    .select(`
      id,
      title,
      description,
      status,
      priority,
      due_date,
      tipo_criacao,
      kanban_stage_id,
      to_user_id,
      from_user_id,
      to_area_id,
      from_area_id,
      created_at,
      project:projects(id, name, project_code)
    `)
    .eq('to_area_id', area.id)
    .order('created_at', { ascending: true })

  if (demandsError) throw demandsError

  // Fetch all assignments for these demands
  const demandIds = (demandsData || []).map((d: any) => d.id)
  let assignmentsByDemand: Record<string, DemandAssignment[]> = {}

  if (demandIds.length > 0) {
    const { data: assignmentsData, error: assignmentsError } = await db
      .from('demand_assignments')
      .select(`
        id,
        demand_id,
        assigned_to,
        assigned_by,
        created_at,
        user:users!demand_assignments_assigned_to_fkey(id, full_name, email)
      `)
      .in('demand_id', demandIds)
      .order('created_at', { ascending: false })

    if (!assignmentsError && assignmentsData) {
      assignmentsByDemand = assignmentsData.reduce(
        (acc: Record<string, DemandAssignment[]>, curr: any) => {
          if (!acc[curr.demand_id]) acc[curr.demand_id] = []
          acc[curr.demand_id].push({
            id: curr.id,
            demand_id: curr.demand_id,
            assigned_to: curr.assigned_to,
            assigned_by: curr.assigned_by,
            created_at: curr.created_at,
            user: curr.user,
          })
          return acc
        },
        {},
      )
    }
  }

  // Format and default stage if not set
  const formattedDemands: KanbanDemand[] = (demandsData || []).map((d: any) => {
    const assignments = assignmentsByDemand[d.id] || []
    const latestAssignment = assignments[0]
    const assignedCreative = latestAssignment?.user
      ? {
          id: latestAssignment.user.id,
          full_name: latestAssignment.user.full_name,
          email: latestAssignment.user.email,
        }
      : d.to_user_id
        ? { id: d.to_user_id, full_name: 'Atribuído', email: '' }
        : null

    return {
      id: d.id,
      title: d.title,
      description: d.description,
      status: d.status,
      priority: d.priority || 'normal',
      due_date: d.due_date,
      tipo_criacao: d.tipo_criacao || null,
      // Gate do Diretor: if no stage, it belongs to "Fila do Diretor"
      kanban_stage_id: d.kanban_stage_id || filaStage?.id || null,
      to_user_id: d.to_user_id,
      from_user_id: d.from_user_id,
      to_area_id: d.to_area_id,
      from_area_id: d.from_area_id,
      created_at: d.created_at,
      project: Array.isArray(d.project) ? d.project[0] : d.project,
      assignments,
      assigned_creative: assignedCreative,
    }
  })

  return {
    demands: formattedDemands,
    areaId: area.id,
  }
}

/**
 * Move demand to a new kanban stage
 */
export async function moveDemandStage(params: {
  demandId: string
  newStageId: string
  newStatus?: string
  feedback?: string
  assignedToUserId?: string
  assignedByUserId?: string
}) {
  const { demandId, newStageId, newStatus, feedback, assignedToUserId, assignedByUserId } = params

  const updatePayload: Record<string, any> = {
    kanban_stage_id: newStageId,
  }

  if (newStatus) {
    updatePayload.status = newStatus
  }

  if (assignedToUserId) {
    updatePayload.to_user_id = assignedToUserId
  }

  // Update demand table
  const { error: updateError } = await db.from('demands').update(updatePayload).eq('id', demandId)

  if (updateError) throw updateError

  // If assigning creative, create demand_assignment record
  if (assignedToUserId && assignedByUserId) {
    const { error: assignError } = await db.from('demand_assignments').insert({
      demand_id: demandId,
      assigned_to: assignedToUserId,
      assigned_by: assignedByUserId,
    })
    if (assignError) console.error('Error inserting assignment:', assignError)
  }

  // If feedback provided (e.g. review rejection), create a demand comment
  if (feedback && feedback.trim() && assignedByUserId) {
    const { error: commentError } = await db.from('demand_comments').insert({
      demand_id: demandId,
      user_id: assignedByUserId,
      content: `[Feedback de Revisão do Diretor]: ${feedback.trim()}`,
    })
    if (commentError) console.error('Error creating feedback comment:', commentError)
  }

  return true
}

/**
 * Assign creative to demand directly
 */
export async function assignCreativeToDemand(params: {
  demandId: string
  assignedToUserId: string
  assignedByUserId: string
  targetStageId?: string
}) {
  const { demandId, assignedToUserId, assignedByUserId, targetStageId } = params

  const updatePayload: Record<string, any> = {
    to_user_id: assignedToUserId,
  }
  if (targetStageId) {
    updatePayload.kanban_stage_id = targetStageId
  }

  const { error: demandError } = await db.from('demands').update(updatePayload).eq('id', demandId)

  if (demandError) throw demandError

  const { error: assignError } = await db.from('demand_assignments').insert({
    demand_id: demandId,
    assigned_to: assignedToUserId,
    assigned_by: assignedByUserId,
  })

  if (assignError) throw assignError

  return true
}
