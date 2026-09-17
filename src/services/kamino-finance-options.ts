import { supabase } from '@/lib/supabase/client'

export interface KaminoFinanceOption {
  id: string
  name: string
}

export interface KaminoFinanceOptions {
  classifications: KaminoFinanceOption[]
  costCenters: KaminoFinanceOption[]
  businessUnits: KaminoFinanceOption[]
}

export async function getKaminoFinanceOptions(): Promise<KaminoFinanceOptions> {
  const { data, error } = await supabase.functions.invoke('kamino-suppliers', {
    body: { action: 'finance-options' },
  })

  if (error) throw error
  if (!data || data.error) {
    throw new Error(data?.error || 'Não foi possível carregar os cadastros financeiros da Kamino.')
  }

  return {
    classifications: Array.isArray(data.classifications) ? data.classifications : [],
    costCenters: Array.isArray(data.costCenters) ? data.costCenters : [],
    businessUnits: Array.isArray(data.businessUnits) ? data.businessUnits : [],
  }
}
