import { supabase } from '@/lib/supabase/client'

export interface Supplier {
  id: string
  document: string
  type: string
  name: string
  phone: string | null
  email: string | null
  cep: string | null
  logradouro: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  uf: string | null
  account_type: string | null
  bank: string | null
  agency: string | null
  account: string | null
  operation: string | null
  pix_key: string | null
  observations: string | null
  created_at: string
  updated_at: string
}

export async function getSuppliers(page = 1, limit = 25, search = '', typeFilter = 'all') {
  let query = supabase.from('suppliers').select('*', { count: 'exact' })
  if (search) {
    query = query.or(`name.ilike.%${search}%,document.ilike.%${search}%`)
  }
  if (typeFilter !== 'all') {
    query = query.eq('type', typeFilter)
  }
  const from = (page - 1) * limit
  const to = from + limit - 1
  const { data, count, error } = await query.order('name', { ascending: true }).range(from, to)
  if (error) throw error
  return {
    data: (data as Supplier[]) || [],
    total: count || 0,
    totalPages: Math.ceil((count || 0) / limit),
  }
}

export async function getSupplierById(id: string): Promise<Supplier> {
  const { data, error } = await supabase.from('suppliers').select('*').eq('id', id).single()
  if (error) throw error
  return data as Supplier
}

export async function createSupplier(payload: Record<string, any>) {
  const { error } = await supabase.from('suppliers').insert([payload])
  if (error) throw error
  return true
}

export async function updateSupplier(id: string, payload: Record<string, any>) {
  const { error } = await supabase.from('suppliers').update(payload).eq('id', id)
  if (error) throw error
  return true
}

export async function searchSuppliers(query: string): Promise<Supplier[]> {
  let q = supabase.from('suppliers').select('*').limit(50)
  if (query) {
    q = q.or(`name.ilike.%${query}%,document.ilike.%${query}%`)
  }
  const { data, error } = await q.order('name')
  if (error) throw error
  return (data as Supplier[]) || []
}

export async function batchInsertSuppliers(suppliers: Record<string, any>[]) {
  const results = { success: 0, errors: [] as string[] }
  const batchSize = 50
  for (let i = 0; i < suppliers.length; i += batchSize) {
    const batch = suppliers.slice(i, i + batchSize)
    const { error } = await supabase.from('suppliers').insert(batch)
    if (error) {
      results.errors.push(`Lote ${Math.floor(i / batchSize) + 1}: ${error.message}`)
    } else {
      results.success += batch.length
    }
  }
  return results
}
