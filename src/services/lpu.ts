import { supabase } from '@/lib/supabase/client'

export interface LpuItem {
  id: string
  client_id: string
  item_name: string
  range: string | null
  description: string | null
  unit_value: number
  created_at: string
  updated_at: string
}

export async function getLpuItems(clientId: string): Promise<LpuItem[]> {
  const { data, error } = await supabase
    .from('client_lpu_items')
    .select('*')
    .eq('client_id', clientId)
    .order('item_name', { ascending: true })

  if (error) throw error
  return (data || []) as LpuItem[]
}

export async function uploadLpuFile(
  clientId: string,
  file: File,
): Promise<{ success: boolean; count: number }> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Usuário não autenticado')

  const formData = new FormData()
  formData.append('file', file)
  formData.append('clientId', clientId)

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
  const response = await fetch(`${supabaseUrl}/functions/v1/parse-lpu`, {
    method: 'POST',
    body: formData,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || 'Falha ao processar arquivo LPU')
  }

  return result
}
