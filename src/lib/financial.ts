export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '—'
  return `${value.toFixed(2)}%`
}

export function parseNumber(value: string): number {
  if (!value || value.trim() === '') return 0
  let cleaned = value.replace(/\s/g, '')
  if (cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.')
  }
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

export function sanitizeDecimalInput(value: string): string {
  let result = value.replace(/[^\d,]/g, '')
  const firstComma = result.indexOf(',')
  if (firstComma !== -1) {
    const intPart = result.substring(0, firstComma)
    const decPart = result
      .substring(firstComma + 1)
      .replace(/,/g, '')
      .substring(0, 2)
    result = intPart + ',' + decPart
  }
  return result
}

export function formatInputDecimal(value: string): string {
  const num = parseNumber(value)
  if (num === 0 && value.trim() === '') return ''
  return num.toFixed(2).replace('.', ',')
}

export interface FinancialCalc {
  grossTotal: number
  feeAmount: number
  totalRevenue: number
  totalCost: number
  marginR$: number
  marginPct: number
}

export function calculateFinancials(params: {
  quantity: number
  unitPrice: number | null
  unitCost: number | null
  extraCost: number | null
  honorariosPercentage: number | null
}): FinancialCalc {
  const { quantity, unitPrice, unitCost, extraCost, honorariosPercentage } = params

  const price = unitPrice ?? 0
  const cost = unitCost ?? 0
  const extra = extraCost ?? 0
  const pct = honorariosPercentage ?? 0

  const grossTotal = quantity * price
  const feeAmount = grossTotal * (pct / 100)
  const totalRevenue = grossTotal + feeAmount
  const totalCost = quantity * cost + extra
  const marginR$ = totalRevenue - totalCost
  const marginPct = totalRevenue > 0 ? (marginR$ / totalRevenue) * 100 : 0

  return { grossTotal, feeAmount, totalRevenue, totalCost, marginR$, marginPct }
}

export function getMarginColor(pct: number): string {
  if (pct < 25) return 'text-red-500'
  if (pct <= 40) return 'text-yellow-500'
  return 'text-green-500'
}

export function getMarginBadgeClass(pct: number): string {
  if (pct < 25) return 'bg-red-100 text-red-800 hover:bg-red-100'
  if (pct <= 40) return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
  return 'bg-green-100 text-green-800 hover:bg-green-100'
}
