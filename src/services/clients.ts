import { supabase } from '@/lib/supabase/client'

export const getClients = async (page = 1, limit = 25, search = '', statusFilter = 'active') => {
  let query = supabase.from('clients').select('*', { count: 'exact' })

  if (search) {
    query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`)
  }

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  }

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, count, error } = await query.order('code', { ascending: true }).range(from, to)

  if (error) throw error

  return {
    data,
    total: count || 0,
    totalPages: Math.ceil((count || 0) / limit),
  }
}

export const getClientById = async (id: string) => {
  const { data, error } = await supabase.from('clients').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export const createClient = async (payload: any) => {
  const { error } = await supabase.from('clients').insert([payload])
  if (error) throw error
  return true
}

export const updateClient = async (id: string, payload: any) => {
  const { error } = await supabase.from('clients').update(payload).eq('id', id)
  if (error) throw error
  return true
}
