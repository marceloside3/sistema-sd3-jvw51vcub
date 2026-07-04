import { TrendingUp, DollarSign, Percent } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatPercent, getMarginColor } from '@/lib/financial'

interface FinancialSummaryCardsProps {
  totalBruto: number
  totalCustos: number
  margemPct: number
  margemR$: number
}

function getMarginDotColor(pct: number): string {
  if (pct < 25) return 'bg-red-500'
  if (pct <= 40) return 'bg-yellow-500'
  return 'bg-green-500'
}

export function FinancialSummaryCards({
  totalBruto,
  totalCustos,
  margemPct,
  margemR$,
}: FinancialSummaryCardsProps) {
  const cards = [
    {
      label: 'Total Bruto (Venda)',
      value: formatCurrency(totalBruto),
      icon: DollarSign,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-l-blue-500',
      dotColor: null,
    },
    {
      label: 'Total Custos',
      value: formatCurrency(totalCustos),
      icon: TrendingUp,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-l-red-500',
      dotColor: null,
    },
    {
      label: 'Margem Total (%)',
      value: formatPercent(margemPct),
      subValue: formatCurrency(margemR$),
      icon: Percent,
      color: getMarginColor(margemPct),
      bg: 'bg-muted/50',
      border: 'border-l-green-500',
      dotColor: getMarginDotColor(margemPct),
    },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-3 mb-4">
      {cards.map((card) => (
        <Card key={card.label} className={`border-l-4 ${card.border}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {card.label}
            </CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold font-mono flex items-center ${card.color}`}>
              {card.dotColor && (
                <span className={`inline-block w-2.5 h-2.5 rounded-full mr-2 ${card.dotColor}`} />
              )}
              {card.value}
            </div>
            {card.subValue && (
              <div className="text-xs text-muted-foreground mt-1">{card.subValue}</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
