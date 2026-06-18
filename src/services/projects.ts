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
  const { data, error } = await supabase.from('projects').insert([payload]).select().single()

  if (error) throw error

  if (areaIds.length > 0) {
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
