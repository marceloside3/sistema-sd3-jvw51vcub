import { supabase } from '@/lib/supabase/client'

// USERS
export async function getUsers(page = 1, pageSize = 25, search = '', profileId = '', status = '') {
  let query = supabase.from('users').select(
    `
      *,
      profile:profiles(id, name),
      areas:area_responsibles(
        is_principal,
        area:areas(id, name)
      )
    `,
    { count: 'exact' },
  )

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
  }
  if (profileId && profileId !== 'all') {
    query = query.eq('profile_id', profileId)
  }
  if (status === 'active') {
    query = query.eq('is_active', true)
  } else if (status === 'inactive') {
    query = query.eq('is_active', false)
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, count, error } = await query
    .range(from, to)
    .order('created_at', { ascending: false })

  if (error) throw error
  return { data, count }
}

export async function inviteUser(payload: {
  email: string
  full_name: string
  profile_id: string
  areas: any[]
}) {
  const { data, error } = await supabase.functions.invoke('invite-user', {
    body: payload,
  })
  if (error) throw error
  return data
}

export async function updateUser(id: string, payload: any) {
  const { error: userError } = await supabase
    .from('users')
    .update({
      full_name: payload.full_name,
      profile_id: payload.profile_id,
      is_active: payload.is_active,
    })
    .eq('id', id)

  if (userError) throw userError

  const { error: delError } = await supabase.from('area_responsibles').delete().eq('user_id', id)

  if (delError) throw delError

  if (payload.areas?.length > 0) {
    const areasToInsert = payload.areas.map((a: any) => ({
      user_id: id,
      area_id: a.area_id,
      is_principal: a.is_principal,
    }))
    const { error: insError } = await supabase.from('area_responsibles').insert(areasToInsert)

    if (insError) throw insError
  }
}

export async function countActiveAdmins() {
  const { count, error } = await supabase
    .from('users')
    .select('id, profiles!inner(is_admin)', { count: 'exact' })
    .eq('is_active', true)
    .eq('profiles.is_admin', true)
  if (error) throw error
  return count || 0
}

// AREAS
export async function getAreas() {
  const { data, error } = await supabase
    .from('areas')
    .select(`
      *,
      responsibles:area_responsibles(count)
    `)
    .order('display_order')
  if (error) throw error
  return data
}

export async function createArea(payload: any) {
  const { error } = await supabase.from('areas').insert([payload])
  if (error) throw error
}

export async function updateArea(id: string, payload: any) {
  const { error } = await supabase.from('areas').update(payload).eq('id', id)
  if (error) throw error
}

export async function countAreaUsers(areaId: string) {
  const { count, error } = await supabase
    .from('area_responsibles')
    .select('id, users!inner(is_active)', { count: 'exact' })
    .eq('area_id', areaId)
    .eq('users.is_active', true)
  if (error) throw error
  return count || 0
}

// PROFILES
export async function getProfiles() {
  const { data, error } = await supabase.from('profiles').select('*').order('name')
  if (error) throw error
  return data
}

export async function createProfile(payload: any) {
  const { error } = await supabase.from('profiles').insert([{ ...payload, is_system: false }])
  if (error) throw error
}

export async function updateProfile(id: string, payload: any) {
  const { error } = await supabase.from('profiles').update(payload).eq('id', id)
  if (error) throw error
}

export async function countProfileUsers(profileId: string) {
  const { count, error } = await supabase
    .from('users')
    .select('id', { count: 'exact' })
    .eq('profile_id', profileId)
    .eq('is_active', true)
  if (error) throw error
  return count || 0
}
