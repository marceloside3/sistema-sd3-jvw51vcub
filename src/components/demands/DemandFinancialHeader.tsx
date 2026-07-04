import { useEffect, useState } from 'react'
import { FinancialSummaryCards } from '@/components/demands/FinancialSummaryCards'
import { Skeleton } from '@/components/ui/skeleton'
import { getDemandItems } from '@/services/demands'
import { calculateFinancials } from '@/lib/financial'

interface DemandFinancialHeaderProps {
  demandId: string
  refreshKey?: number
}

export function DemandFinancialHeader({ demandId, refreshKey }: DemandFinancialHeaderProps) {
  const [financials, setFinancials] = useState<{
    totalBruto: number
    totalCustos: number
    margemPct: number
    margemR$: number
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const items = await getDemandItems(demandId)
        if (cancelled) return
        const fins = items.map((item: any) =>
          calculateFinancials({
            quantity: item.quantity,
            unitPrice: item.unit_price,
            unitCost: item.unit_cost,
            extraCost: item.extra_cost,
            honorariosPercentage: item.honorarios_percentage,
          }),
        )
        const totalBruto = fins.reduce((s, f) => s + f.grossTotal, 0)
        const totalCustos = fins.reduce((s, f) => s + f.totalCost, 0)
        const margemR$ = fins.reduce((s, f) => s + f.marginR$, 0)
        const margemPct = totalBruto > 0 ? (margemR$ / totalBruto) * 100 : 0
        if (!cancelled) setFinancials({ totalBruto, totalCustos, margemPct, margemR$ })
      } catch {
        if (!cancelled) setFinancials({ totalBruto: 0, totalCustos: 0, margemPct: 0, margemR$: 0 })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [demandId, refreshKey])

  if (loading || !financials) {
    return (
      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    )
  }

  return (
    <FinancialSummaryCards
      totalBruto={financials.totalBruto}
      totalCustos={financials.totalCustos}
      margemPct={financials.margemPct}
      margemR$={financials.margemR$}
    />
  )
}
