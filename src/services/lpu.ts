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
  return data || []
}

export async function deleteAllLpuItems(clientId: string): Promise<void> {
  const { error } = await supabase.from('client_lpu_items').delete().eq('client_id', clientId)
  if (error) throw error
}

export interface ParsedRange {
  min: number
  max: number
}

export function parseRange(rangeStr: string | null): ParsedRange | null {
  if (!rangeStr) return null
  const cleaned = rangeStr.toLowerCase().trim()

  const aboveMatch = cleaned.match(/acima\s+de\s+(\d+)/)
  if (aboveMatch) {
    return { min: parseInt(aboveMatch[1]) + 1, max: Infinity }
  }

  const rangeMatch = cleaned.match(/(\d+)\s*(?:a|até|-|–)\s*(\d+)/)
  if (rangeMatch) {
    return { min: parseInt(rangeMatch[1]), max: parseInt(rangeMatch[2]) }
  }

  const singleMatch = cleaned.match(/^(\d+)/)
  if (singleMatch) {
    const val = parseInt(singleMatch[1])
    return { min: val, max: val }
  }

  return null
}

export function findMatchingLpuItem(
  items: LpuItem[],
  itemName: string,
  quantity: number,
): LpuItem | null {
  const matchingItems = items.filter(
    (item) => item.item_name.toLowerCase() === itemName.toLowerCase(),
  )
  if (matchingItems.length === 0) return null

  for (const item of matchingItems) {
    const parsed = parseRange(item.range)
    if (parsed && quantity >= parsed.min && quantity <= parsed.max) {
      return item
    }
  }

  const noRange = matchingItems.find((item) => !item.range)
  if (noRange) return noRange

  return matchingItems[0]
}

export function calculateUnitPrice(
  items: LpuItem[],
  itemName: string,
  quantity: number,
): number | null {
  const matched = findMatchingLpuItem(items, itemName, quantity)
  return matched ? matched.unit_value : null
}

export function getUniqueItemNames(items: LpuItem[]): string[] {
  const names = new Set(items.map((item) => item.item_name))
  return Array.from(names).sort()
}
