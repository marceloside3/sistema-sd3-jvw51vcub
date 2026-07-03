import { supabase } from '@/lib/supabase/client'
import { notifyProjectStatusChange } from './notifications'

export async function getProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      client:clients(id, name, code)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getProjectDetails(id: string) {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      client:clients(*),
      project_areas(id, is_lead, area:areas(*)),
      demands(*, to_area:areas!demands_to_area_id_fkey(*))
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function getProjectById(id: string) {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      client:clients(*),
      areas:project_areas(id, is_lead, area:areas(*, area_responsibles(user_id)))
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createProject(
  payload: any,
  areaIds: { area_id: string; is_lead: boolean }[],
) {
  if (!payload.client_id) {
    throw new Error('Client ID is required to create a project.')
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('User is not authenticated.')
  }

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_REGEX.test(user.id)) {
    throw new Error(`Invalid user ID format: ${user.id}`)
  }

  const { data: userRecord } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (!userRecord) {
    throw new Error(
      'Seu usuário não está registrado no sistema. Contate o administrador para configurar seu perfil.',
    )
  }

  const { data: projectCode, error: rpcError } = await supabase.rpc('generate_project_code', {
    p_client_id: payload.client_id,
    p_competence_month: payload.competence_month ?? null,
    p_competence_year: payload.competence_year ?? null,
  } as any)

  if (rpcError) {
    console.error('[createProject] Error generating project code:', {
      message: rpcError.message,
      code: rpcError.code,
      details: rpcError.details,
      hint: rpcError.hint,
      clientId: payload.client_id,
    })
    throw rpcError
  }

  const projectPayload = {
    ...payload,
    project_code: projectCode,
    created_by: user.id,
  }

  console.log('[createProject] Inserting project with created_by:', user.id)

  try {
    const { data, error } = await supabase
      .from('projects')
      .insert([projectPayload])
      .select()
      .single()

    if (error) {
      console.error('[createProject] Error inserting project:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        payload: {
          ...projectPayload,
          briefing_data: '[omitted]',
          created_by: projectPayload.created_by,
        },
      })

      const techAlert = `[${error.code || 'UNKNOWN'}] ${error.message}${error.details ? ` | Details: ${error.details}` : ''}${error.hint ? ` | Hint: ${error.hint}` : ''}`

      const enhancedError = new Error(
        error.code === '42501'
          ? `Permissão negada (RLS): ${techAlert}`
          : `Erro de banco (${error.code || 'UNKNOWN'}): ${techAlert}`,
      ) as Error & { code?: string; techAlert?: string }
      enhancedError.code = error.code
      enhancedError.techAlert = techAlert

      throw enhancedError
    }

    if (areaIds && areaIds.length > 0) {
      const areasPayload = areaIds.map((a) => ({
        project_id: data.id,
        area_id: a.area_id,
        is_lead: a.is_lead,
      }))
      const { error: areasError } = await supabase.from('project_areas').insert(areasPayload)

      if (areasError) {
        console.error('[createProject] Error inserting project areas:', {
          message: areasError.message,
          code: areasError.code,
          details: areasError.details,
          hint: areasError.hint,
          projectId: data.id,
          areasPayload,
        })

        const areasTechAlert = `[${areasError.code || 'UNKNOWN'}] ${areasError.message}${areasError.details ? ` | Details: ${areasError.details}` : ''}${areasError.hint ? ` | Hint: ${areasError.hint}` : ''}`

        const areasEnhancedError = new Error(
          areasError.code === '42501'
            ? `Permissão negada (RLS) ao inserir áreas: ${areasTechAlert}`
            : `Erro de banco ao inserir áreas (${areasError.code || 'UNKNOWN'}): ${areasTechAlert}`,
        ) as Error & { code?: string; techAlert?: string }
        areasEnhancedError.code = areasError.code
        areasEnhancedError.techAlert = areasTechAlert

        throw areasEnhancedError
      }
    }

    return data
  } catch (err: any) {
    if (err?.techAlert) throw err

    console.error('[createProject] Unexpected error:', err)
    const enhancedError = new Error(
      err?.message || 'Erro inesperado ao criar projeto.',
    ) as Error & { code?: string; techAlert?: string }
    enhancedError.code = err?.code
    enhancedError.techAlert = err?.message || 'Unexpected error'
    throw enhancedError
  }
}

export async function updateProject(id: string, payload: any) {
  const { data, error } = await supabase
    .from('projects')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getProjectAuditLog(
  projectId: string,
  eventTypes: string[] | null,
  since: string | null,
  limit: number = 200,
) {
  const { data, error } = await supabase.rpc('get_project_audit_log', {
    p_project_id: projectId,
    p_event_types: eventTypes,
    p_since: since,
    p_limit: limit,
  })

  if (error) throw error
  return data
}

export async function distributeProject(
  projectId: string,
  assignments: { area_id: string; user_id: string }[],
  overrideReason?: string,
) {
  const { data, error } = await supabase.rpc('distribute_project', {
    p_project_id: projectId,
    p_assignments: assignments,
    p_override_reason: overrideReason || null,
  })

  if (error) throw error
  return data
}

export async function validateBriefingForDistribution(projectId: string) {
  const { data, error } = await supabase.rpc('validate_briefing_for_distribution', {
    p_project_id: projectId,
  })
  if (error) throw error
  return data
}

export async function checkCanOverrideG2() {
  const { data, error } = await supabase.rpc('can_override_g2')
  if (error) throw error
  return data
}

export async function getAuthDiagnostic() {
  const { data, error } = await supabase.rpc('get_auth_diagnostic')
  if (error) throw error
  return data
}

export async function updateProjectStatus(
  id: string,
  newStatus: string,
  projectName: string,
  actorId: string,
  actorName: string,
) {
  const { data, error } = await supabase
    .from('projects')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  // best-effort task
  notifyProjectStatusChange(id, projectName, newStatus, actorId, actorName).catch(console.error)

  return data
}
