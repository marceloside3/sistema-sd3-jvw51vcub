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

const LPU_PAGE_SIZE = 1000

/**
 * Busca todos os itens de LPU de um cliente com paginação automática (.range)
 * em lotes de 1.000 para superar o limite padrão de linhas do PostgREST.
 */
export async function fetchAllLpuItems(clientId: string): Promise<LpuItem[]> {
  const allItems: LpuItem[] = []
  let from = 0

  while (true) {
    const to = from + LPU_PAGE_SIZE - 1
    const { data, error } = await supabase
      .from('client_lpu_items')
      .select('*')
      .eq('client_id', clientId)
      .order('item_name', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)

    if (error) throw error
    if (!data || data.length === 0) break

    allItems.push(...(data as LpuItem[]))

    if (data.length < LPU_PAGE_SIZE) {
      break
    }

    from += LPU_PAGE_SIZE
  }

  return allItems
}

/**
 * Retorna a contagem total exata de itens da LPU no banco de dados para um cliente.
 */
export async function countLpuItems(clientId: string): Promise<number> {
  const { count, error } = await supabase
    .from('client_lpu_items')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId)

  if (error) throw error
  return count || 0
}

/**
 * Alias mantido para retrocompatibilidade; usa fetchAllLpuItems por padrão.
 */
export async function getLpuItems(clientId: string): Promise<LpuItem[]> {
  return fetchAllLpuItems(clientId)
}

export async function deleteAllLpuItems(clientId: string): Promise<void> {
  const { error } = await supabase.from('client_lpu_items').delete().eq('client_id', clientId)
  if (error) throw error
}

export interface ParsedRange {
  min: number
  max: number
  raw?: string
}

export interface RangeValidationResult {
  isValid: boolean
  matchedItem: LpuItem | null
  hasRanges: boolean
  minAllowed: number | null
  maxAllowed: number | null
  errorMessage: string | null
  warningMessage: string | null
}

/**
 * Normaliza um número que pode conter pontos como separador de milhar (ex: "1.001" -> 1001)
 */
function parseNumberWithThousands(numStr: string): number {
  const normalized = numStr.replace(/\./g, '').trim()
  return parseInt(normalized, 10)
}

/**
 * Analisa e extrai o intervalo (min/max) a partir de descrições textuais de faixa de LPU.
 * Suporta qualquer unidade (diárias, unidades, kit, peças, metros, m², pessoas, km etc.):
 * - "X ou mais", "X+", "acima de X", "a partir de X", "X ou acima" -> min = X (ou X+1), max = Infinity
 * - "até X", "ate X" -> min = 1, max = X
 * - "X a Y", "X-Y", "X até Y", "De X a Y", "X à Y", "X á Y" -> min = X, max = Y
 * - "X unidade(s)", "1 diária", número isolado -> min = X, max = X
 */
export function parseRange(rangeStr: string | null): ParsedRange | null {
  if (!rangeStr) return null
  const cleaned = rangeStr
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos (diária -> diaria, até -> ate, etc.)
    .trim()

  if (!cleaned) return null

  // 1. "X ou mais", "X ou acima", "X+", "X ou superior"
  // Ex: "6 ou mais diárias", "1 unidade ou mais", "31 m2 ou acima", "501 ou mais", "4.001 ou mais unidades"
  const orMorePattern1 =
    /(\d+(?:\.\d+)?)\s*(?:[a-z²³º°\s]*)\s*(?:ou\s+mais|ou\s+acima|\+|ou\s+superior)/
  const matchOrMore1 = cleaned.match(orMorePattern1)
  if (matchOrMore1) {
    const val = parseNumberWithThousands(matchOrMore1[1])
    if (!Number.isNaN(val)) {
      return { min: val, max: Infinity, raw: rangeStr }
    }
  }

  // Variação invertida: "ou mais" no final mas precedida por número e unidade
  // Ex: "6 diárias ou mais", "301 pessoas ou mais", "1 unidade ou mais"
  const orMorePattern2 = /(\d+(?:\.\d+)?)[^0-9]*ou\s+(?:mais|acima)/
  const matchOrMore2 = cleaned.match(orMorePattern2)
  if (matchOrMore2) {
    const val = parseNumberWithThousands(matchOrMore2[1])
    if (!Number.isNaN(val)) {
      return { min: val, max: Infinity, raw: rangeStr }
    }
  }

  // 2. "acima de X", "de X acima", "superior a X"
  // Ex: "acima de 1.001 peças", "acima de 101", "de 31 acima", "de 8 acima"
  const abovePattern1 = /acima\s+de\s+(\d+(?:\.\d+)?)/
  const matchAbove1 = cleaned.match(abovePattern1)
  if (matchAbove1) {
    const val = parseNumberWithThousands(matchAbove1[1])
    if (!Number.isNaN(val)) {
      // "Acima de 1000" pode ser tratado como a partir de 1001
      return { min: val, max: Infinity, raw: rangeStr }
    }
  }

  const abovePattern2 = /(?:de\s+)?(\d+(?:\.\d+)?)\s*(?:[a-z²³º°\s]*)\s*acima/
  const matchAbove2 = cleaned.match(abovePattern2)
  if (matchAbove2) {
    const val = parseNumberWithThousands(matchAbove2[1])
    if (!Number.isNaN(val)) {
      return { min: val, max: Infinity, raw: rangeStr }
    }
  }

  // 3. "a partir de X", "a partir X"
  // Ex: "a partir de 50", "a partir 1 unidade"
  const startPattern = /a\s*partir(?:\s+de)?\s+(\d+(?:\.\d+)?)/
  const matchStart = cleaned.match(startPattern)
  if (matchStart) {
    const val = parseNumberWithThousands(matchStart[1])
    if (!Number.isNaN(val)) {
      return { min: val, max: Infinity, raw: rangeStr }
    }
  }

  // 4. "até X", "ate X", "no maximo X" (min aberto, padrão 1)
  // Ex: "até 30 m²", "até 50 unidades"
  const maxPattern = /^(?:de\s+)?ate\s+(\d+(?:\.\d+)?)/
  const matchMax = cleaned.match(maxPattern)
  if (matchMax) {
    const val = parseNumberWithThousands(matchMax[1])
    if (!Number.isNaN(val)) {
      return { min: 1, max: val, raw: rangeStr }
    }
  }

  // 5. Intervalo fechado: "X a Y", "X até Y", "X-Y", "de X a Y"
  // Ex: "50 a 60", "De 10 a 49 unidades", "2 diárias à 5 diárias", "1 até 30 m²", "1.001 a 4.000 unidades"
  const rangePattern =
    /(?:de\s+)?(\d+(?:\.\d+)?)\s*(?:[a-z²³º°\s]*)\s*(?:a|ate|-|–|—)\s*(\d+(?:\.\d+)?)/
  const matchRange = cleaned.match(rangePattern)
  if (matchRange) {
    const minVal = parseNumberWithThousands(matchRange[1])
    const maxVal = parseNumberWithThousands(matchRange[2])
    if (!Number.isNaN(minVal) && !Number.isNaN(maxVal)) {
      return {
        min: Math.min(minVal, maxVal),
        max: Math.max(minVal, maxVal),
        raw: rangeStr,
      }
    }
  }

  // 6. Número isolado ou único especificado: "1 diária", "1 unidade", "10", "1"
  const singlePattern = /(\d+(?:\.\d+)?)/
  const matchSingle = cleaned.match(singlePattern)
  if (matchSingle) {
    const val = parseNumberWithThousands(matchSingle[1])
    if (!Number.isNaN(val)) {
      return { min: val, max: val, raw: rangeStr }
    }
  }

  return null
}

/**
 * Encontra o item da LPU correspondente ao nome e à quantidade especificada.
 * Apenas retorna um item se a quantidade se enquadrar no intervalo (range) definido,
 * ou se o item não tiver range cadastrado (preço único).
 *
 * Se a quantidade estiver FORA de todos os ranges definidos, retorna `null`
 * (nunca cai no primeiro item silenciosamente).
 */
export function findMatchingLpuItem(
  items: LpuItem[],
  itemName: string,
  quantity: number,
): LpuItem | null {
  const matchingItems = items.filter(
    (item) => item.item_name.toLowerCase() === itemName.toLowerCase(),
  )
  if (matchingItems.length === 0) return null

  // 1. Procurar por match exato no range
  for (const item of matchingItems) {
    const parsed = parseRange(item.range)
    if (parsed && quantity >= parsed.min && quantity <= parsed.max) {
      return item
    }
  }

  // 2. Se nenhum item possui range definido, retorna o item sem range
  const allWithoutRange = matchingItems.filter((item) => !item.range || !item.range.trim())
  if (allWithoutRange.length === matchingItems.length && allWithoutRange.length > 0) {
    return allWithoutRange[0]
  }

  // Se havia ranges definidos mas a quantidade não casou com nenhum,
  // NÃO fazemos fallback cego para o primeiro item.
  return null
}

/**
 * Valida a quantidade informada para um determinado item da LPU,
 * determinando se está dentro da faixa, abaixo do mínimo global ou acima do máximo global.
 */
export function validateLpuQuantity(
  items: LpuItem[],
  itemName: string,
  quantity: number,
): RangeValidationResult {
  const matchingItems = items.filter(
    (item) => item.item_name.toLowerCase() === itemName.toLowerCase(),
  )

  if (matchingItems.length === 0) {
    return {
      isValid: true,
      matchedItem: null,
      hasRanges: false,
      minAllowed: null,
      maxAllowed: null,
      errorMessage: null,
      warningMessage: null,
    }
  }

  // Analisa todos os ranges disponíveis para este item
  const rangesWithItems: { item: LpuItem; parsed: ParsedRange }[] = []
  let hasItemsWithoutRange = false

  for (const item of matchingItems) {
    const parsed = parseRange(item.range)
    if (parsed) {
      rangesWithItems.push({ item, parsed })
    } else {
      hasItemsWithoutRange = true
    }
  }

  // Se nenhum item tem range (preço fixo sem variação de escala)
  if (rangesWithItems.length === 0) {
    return {
      isValid: true,
      matchedItem: matchingItems[0],
      hasRanges: false,
      minAllowed: null,
      maxAllowed: null,
      errorMessage: null,
      warningMessage: null,
    }
  }

  // Tenta match direto
  const matched = findMatchingLpuItem(items, itemName, quantity)
  if (matched) {
    return {
      isValid: true,
      matchedItem: matched,
      hasRanges: true,
      minAllowed: Math.min(...rangesWithItems.map((r) => r.parsed.min)),
      maxAllowed: rangesWithItems.some((r) => r.parsed.max === Infinity)
        ? null
        : Math.max(...rangesWithItems.map((r) => r.parsed.max)),
      errorMessage: null,
      warningMessage: null,
    }
  }

  // Quantidade não casou com nenhum range.
  // Calcula limites globais do item
  const minAllowed = Math.min(...rangesWithItems.map((r) => r.parsed.min))
  const hasInfinity = rangesWithItems.some((r) => r.parsed.max === Infinity)
  const maxAllowed = hasInfinity ? null : Math.max(...rangesWithItems.map((r) => r.parsed.max))

  if (quantity < minAllowed) {
    return {
      isValid: false,
      matchedItem: null,
      hasRanges: true,
      minAllowed,
      maxAllowed,
      errorMessage: `Quantidade (${quantity}) inferior ao mínimo permitido (${minAllowed}) para este item na LPU.`,
      warningMessage: null,
    }
  }

  if (maxAllowed !== null && quantity > maxAllowed) {
    return {
      isValid: false,
      matchedItem: null,
      hasRanges: true,
      minAllowed,
      maxAllowed,
      errorMessage: `Quantidade (${quantity}) superior ao máximo permitido (${maxAllowed}) para este item na LPU.`,
      warningMessage: null,
    }
  }

  // Se houver algum buraco (gap) intermediário entre faixas:
  return {
    isValid: false,
    matchedItem: null,
    hasRanges: true,
    minAllowed,
    maxAllowed,
    errorMessage: `Quantidade (${quantity}) não se enquadra em nenhuma faixa cadastrada na LPU para este item.`,
    warningMessage: null,
  }
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
