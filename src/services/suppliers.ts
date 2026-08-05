import { supabase } from '@/lib/supabase/client'

export interface Supplier {
  id: string
  document: string | null
  supplier_type: string | null
  name: string | null
  phone: string | null
  email: string | null
  cep: string | null
  street: string | null
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
  created_at: string | null
  updated_at: string | null
}

export interface SupplierInput {
  document?: string | null
  supplier_type?: string | null
  name?: string | null
  phone?: string | null
  email?: string | null
  cep?: string | null
  street?: string | null
  number?: string | null
  complement?: string | null
  neighborhood?: string | null
  city?: string | null
  uf?: string | null
  account_type?: string | null
  bank?: string | null
  agency?: string | null
  account?: string | null
  operation?: string | null
  pix_key?: string | null
  observations?: string | null
}

export async function getAllSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error
  return (data as Supplier[]) ?? []
}

export async function getSupplierById(id: string): Promise<Supplier | null> {
  const { data, error } = await supabase.from('suppliers').select('*').eq('id', id).single()
  if (error) throw error
  return data as Supplier
}

export async function createSupplier(input: SupplierInput): Promise<Supplier> {
  const { data, error } = await supabase.from('suppliers').insert(input).select('*').single()
  if (error) throw error
  return data as Supplier
}

export async function updateSupplier(id: string, input: SupplierInput): Promise<Supplier> {
  const { data, error } = await supabase
    .from('suppliers')
    .update(input)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as Supplier
}

export async function deleteSupplier(id: string): Promise<void> {
  const { error } = await supabase.from('suppliers').delete().eq('id', id)
  if (error) throw error
}
