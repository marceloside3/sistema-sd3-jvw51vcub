import { supabase } from '@/lib/supabase/client'

// Cast supabase to any for dynamically created tables not in static types.ts
const db = supabase as any

// RPC helper for the notify_criacao_transition SECURITY DEFINER function.
// (Keeps a typed wrapper so call sites stay clean; falls back to any for args.)
const rpc = (fn: string, args: Record<string, unknown>) =>
  (supabase as any).rpc(fn, args) as Promise<{ data: unknown; error: any | null }>

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
  comment_count?: number
  attachment_count?: number
  last_comment?: {
    content: string
    author_name: string
    created_at: string
  } | null
  last_attachment?: {
    file_name: string
    created_at: string
  } | null
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

export type TeamUser = CreativeUser

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
 * Fetch team users for an area (e.g., 'criacao', 'planejamento')
 */
export async function getAreaTeamUsers(areaCode: string = 'criacao'): Promise<TeamUser[]> {
  const { data: area, error: areaError } = await db
    .from('areas')
    .select('id')
    .eq('code', areaCode)
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

  const usersMap = new Map<string, TeamUser>()
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
 * Fetch creative team users for Criação area (backward compatibility)
 */
export async function getCreationTeamUsers(): Promise<CreativeUser[]> {
  return getAreaTeamUsers('criacao')
}

/**
 * Fetch demands for an Area's Kanban board (e.g. 'criacao', 'planejamento')
 */
export async function getKanbanDemands(areaCode: string = 'criacao'): Promise<{
  demands: KanbanDemand[]
  areaId: string
}> {
  const { data: area, error: areaError } = await db
    .from('areas')
    .select('id')
    .eq('code', areaCode)
    .single()

  if (areaError || !area) throw areaError

  // Fetch stages to ensure default stage assignment if null
  const { data: stages } = await db
    .from('kanban_stages')
    .select('id, name, position')
    .eq('area_id', area.id)
    .order('position', { ascending: true })

  const firstStage = stages?.find((s: any) => s.position === 1)

  // Fetch all demands assigned to to_area_id = area.id
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

  let commentCountByDemand: Record<string, number> = {}
  let attachmentCountByDemand: Record<string, number> = {}
  let lastCommentByDemand: Record<
    string,
    { content: string; author_name: string; created_at: string }
  > = {}
  let lastAttachmentByDemand: Record<string, { file_name: string; created_at: string }> = {}

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

    // Comment counts + latest comment per demand.
    // Rows are ordered by created_at desc, so the first row seen for a demand is its latest.
    const { data: commentsAgg, error: commentsError } = await db
      .from('demand_comments')
      .select('demand_id, content, created_at, user:users!demand_comments_user_id_fkey(full_name)')
      .in('demand_id', demandIds)
      .order('created_at', { ascending: false })

    if (!commentsError && commentsAgg) {
      ;(commentsAgg as any[]).forEach((row: any) => {
        commentCountByDemand[row.demand_id] = (commentCountByDemand[row.demand_id] || 0) + 1
        if (!lastCommentByDemand[row.demand_id]) {
          lastCommentByDemand[row.demand_id] = {
            content: row.content || '',
            author_name: row.user?.full_name || '—',
            created_at: row.created_at,
          }
        }
      })
    }

    // Attachment counts + latest attachment per demand (ordered desc).
    const { data: attachmentsAgg, error: attachmentsError } = await db
      .from('demand_attachments')
      .select('demand_id, file_name, created_at')
      .in('demand_id', demandIds)
      .order('created_at', { ascending: false })

    if (!attachmentsError && attachmentsAgg) {
      ;(attachmentsAgg as any[]).forEach((row: any) => {
        attachmentCountByDemand[row.demand_id] = (attachmentCountByDemand[row.demand_id] || 0) + 1
        if (!lastAttachmentByDemand[row.demand_id]) {
          lastAttachmentByDemand[row.demand_id] = {
            file_name: row.file_name || '',
            created_at: row.created_at,
          }
        }
      })
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
      kanban_stage_id: d.kanban_stage_id || firstStage?.id || null,
      to_user_id: d.to_user_id,
      from_user_id: d.from_user_id,
      to_area_id: d.to_area_id,
      from_area_id: d.from_area_id,
      created_at: d.created_at,
      comment_count: commentCountByDemand[d.id] || 0,
      attachment_count: attachmentCountByDemand[d.id] || 0,
      last_comment: lastCommentByDemand[d.id] || null,
      last_attachment: lastAttachmentByDemand[d.id] || null,
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
 * Resolve stage position by id from the kanban_stages table.
 */
async function getStagePosition(stageId: string): Promise<number | null> {
  const { data, error } = await db
    .from('kanban_stages')
    .select('position')
    .eq('id', stageId)
    .single()
  if (error || !data) return null
  return data.position as number
}

/**
 * Move demand to a new kanban stage.
 *
 * Notification rules (Diretor actions on Criação Kanban):
 * - Assigning a creative (Fila do Diretor -> A Fazer, pos 1 -> 2): notify the creative
 *   "Nova demanda atribuída a você: [título]"
 * - Returning a piece for adjustment (Revisão Interna -> Em Criação, pos 4 -> 3): notify the
 *   creative "Demanda devolvida para ajuste: [título]" including the director's feedback.
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

  // Fetch current demand + stage positions to detect the relevant transition
  const { data: currentDemand, error: fetchError } = await db
    .from('demands')
    .select('id, title, to_user_id, kanban_stage_id')
    .eq('id', demandId)
    .single()
  if (fetchError) throw fetchError

  const fromPos = currentDemand?.kanban_stage_id
    ? await getStagePosition(currentDemand.kanban_stage_id)
    : null
  const toPos = await getStagePosition(newStageId)

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

  // ---- Notifications ----
  // 1) Diretor atribui demanda a um criativo (Fila do Diretor -> A Fazer)
  const isAssignTransition =
    fromPos === 1 && toPos === 2 && !!assignedToUserId && !!assignedByUserId
  if (isAssignTransition && assignedToUserId !== assignedByUserId) {
    const { error: notifError } = await rpc('notify_criacao_transition', {
      p_demand_id: demandId,
      p_transition: 'assign',
      p_feedback: null,
      p_actor_id: assignedByUserId,
    })
    if (notifError) console.error('Error creating assignment notification:', notifError)
  }

  // 2) Diretor devolve peça para ajuste (Revisão Interna -> Em Criação)
  const isReturnTransition = fromPos === 4 && toPos === 3
  if (isReturnTransition) {
    const notifyUserId = assignedToUserId || currentDemand?.to_user_id || null
    if (notifyUserId && notifyUserId !== assignedByUserId) {
      const { error: notifError } = await rpc('notify_criacao_transition', {
        p_demand_id: demandId,
        p_transition: 'return',
        p_feedback: feedback || null,
        p_actor_id: assignedByUserId,
      })
      if (notifError)
        console.error('Error creating return-for-adjustment notification:', notifError)
    }
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
