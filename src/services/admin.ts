import { supabase } from '@/lib/supabase/client'

export const getUsers = async (
  page = 1,
  limit = 25,
  search = '',
  profileFilter = 'all',
  statusFilter = 'all',
) => {
  let query = supabase.from('users').select(
    `
    id, full_name, email, is_active, last_login_at, profile_id,
    profile:profiles(id, name, is_admin, is_system),
    areas:area_responsibles(is_principal, area:areas(id, name))
  `,
    { count: 'exact' },
  )

  if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
  if (profileFilter !== 'all') query = query.eq('profile_id', profileFilter)
  if (statusFilter !== 'all') query = query.eq('is_active', statusFilter === 'active')

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to)
  if (error) throw error

  return {
    data,
    total: count || 0,
    totalPages: Math.ceil((count || 0) / limit),
  }
}

export const inviteUser = async (payload: any) => {
  const { data, error } = await supabase.functions.invoke('invite-user', {
    body: payload,
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}

export const updateUser = async (id: string, payload: any) => {
  const { full_name, profile_id, is_active, areas } = payload

  const { error: userError } = await supabase
    .from('users')
    .update({
      full_name,
      profile_id,
      is_active,
    })
    .eq('id', id)
  if (userError) throw userError

  if (areas) {
    await supabase.from('area_responsibles').delete().eq('user_id', id)
    if (areas.length > 0) {
      const { error: areaError } = await supabase.from('area_responsibles').insert(
        areas.map((a: any) => ({
          user_id: id,
          area_id: a.area_id,
          is_principal: a.is_principal,
        })),
      )
      if (areaError) throw areaError
    }
  }
  return true
}

export const countActiveAdmins = async () => {
  const { count, error } = await supabase
    .from('users')
    .select('id, profile:profiles!inner(is_admin)', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('profile.is_admin', true)
  if (error) throw error
  return count || 0
}

export const getProfiles = async () => {
  const { data, error } = await supabase.from('profiles').select('*').order('name')
  if (error) throw error
  return data
}

export const createProfile = async (payload: any) => {
  const { error } = await supabase.from('profiles').insert([payload])
  if (error) throw error
  return true
}

export const updateProfile = async (id: string, payload: any) => {
  const { error } = await supabase.from('profiles').update(payload).eq('id', id)
  if (error) throw error
  return true
}

export const countProfileUsers = async (id: string) => {
  const { count, error } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', id)
    .eq('is_active', true)
  if (error) throw error
  return count || 0
}

export const getAreas = async () => {
  const { data, error } = await supabase.from('areas').select(`*`).order('display_order')
  if (error) throw error

  const { data: responsibles, error: respError } = await supabase
    .from('area_responsibles')
    .select('area_id')
  if (respError) throw respError

  const countMap: Record<string, number> = {}
  for (const r of responsibles || []) {
    countMap[r.area_id] = (countMap[r.area_id] || 0) + 1
  }

  return data.map((a: any) => ({
    ...a,
    responsibles: [{ count: countMap[a.id] || 0 }],
  }))
}

export const createArea = async (payload: any) => {
  const { error } = await supabase.from('areas').insert([payload])
  if (error) throw error
  return true
}

export const updateArea = async (id: string, payload: any) => {
  const { error } = await supabase.from('areas').update(payload).eq('id', id)
  if (error) throw error
  return true
}

export const countAreaUsers = async (id: string) => {
  const { count, error } = await supabase
    .from('area_responsibles')
    .select('id', { count: 'exact', head: true })
    .eq('area_id', id)
  if (error) throw error
  return count || 0
}
