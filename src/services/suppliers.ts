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

export async function getSuppliers(
  page: number,
  perPage: number,
  search: string,
  typeFilter: string,
): Promise<{ data: Supplier[]; totalPages: number }> {
  let query = supabase.from('suppliers').select('*', { count: 'exact' })

  if (search) {
    query = query.or(`name.ilike.%${search}%,document.ilike.%${search}%`)
  }

  if (typeFilter && typeFilter !== 'all') {
    query = query.eq('supplier_type', typeFilter)
  }

  query = query.order('name', { ascending: true }).range((page - 1) * perPage, page * perPage - 1)

  const { data, error, count } = await query
  if (error) throw error

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / perPage))
  return { data: (data as Supplier[]) ?? [], totalPages }
}

export async function batchInsertSuppliers(
  inputs: Record<string, any>[],
): Promise<{ success: number; failed: number; errors: string[] }> {
  const mapped = inputs.map((item) => ({
    document: item.document ?? null,
    supplier_type: item.type ?? item.supplier_type ?? null,
    name: item.name ?? null,
    phone: item.phone ?? null,
    email: item.email ?? null,
    cep: item.cep ?? null,
    street: item.logradouro ?? item.street ?? null,
    number: item.number ?? null,
    complement: item.complement ?? null,
    neighborhood: item.neighborhood ?? null,
    city: item.city ?? null,
    uf: item.uf ?? null,
    account_type: item.account_type ?? null,
    bank: item.bank ?? null,
    agency: item.agency ?? null,
    account: item.account ?? null,
    operation: item.operation ?? null,
    pix_key: item.pix_key ?? null,
    observations: item.observations ?? null,
  }))

  const { data, error } = await supabase.from('suppliers').insert(mapped).select('*')

  if (!error) {
    return { success: data?.length ?? 0, failed: 0, errors: [] }
  }

  let success = 0
  let failed = 0
  const errors: string[] = []

  for (let i = 0; i < mapped.length; i++) {
    const csvRow = inputs[i]?._csvRow ?? i + 2
    const { error: singleError } = await supabase.from('suppliers').insert(mapped[i]).select('*')

    if (singleError) {
      failed++
      errors.push(`Linha ${csvRow}: ${singleError.message}`)
    } else {
      success++
    }
  }

  return { success, failed, errors }
}
