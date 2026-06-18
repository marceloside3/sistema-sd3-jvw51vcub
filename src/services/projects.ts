import { supabase } from '@/lib/supabase/client'

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
      areas:project_areas(id, is_lead, area:areas(*))
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

  const { data: projectCode, error: rpcError } = await supabase.rpc('generate_project_code', {
    p_client_id: payload.client_id,
  })

  if (rpcError) {
    throw rpcError
  }

  const projectPayload = {
    ...payload,
    project_code: projectCode,
    created_by: user.id,
  }

  const { data, error } = await supabase.from('projects').insert([projectPayload]).select().single()

  if (error) throw error

  if (areaIds && areaIds.length > 0) {
    const areasPayload = areaIds.map((a) => ({
      project_id: data.id,
      area_id: a.area_id,
      is_lead: a.is_lead,
    }))
    const { error: areasError } = await supabase.from('project_areas').insert(areasPayload)

    if (areasError) throw areasError
  }

  return data
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
