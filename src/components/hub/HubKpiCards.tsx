import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FolderKanban, Clock, AlertTriangle, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HubKpiCardsProps {
  total: number
  onTrack: number
  overdue: number
  pendingDistribution: number
}

export function HubKpiCards({ total, onTrack, overdue, pendingDistribution }: HubKpiCardsProps) {
  const cards = [
    {
      label: 'Total de Projetos',
      value: total,
      icon: FolderKanban,
      color: 'text-blue-600',
      border: 'border-l-blue-500',
    },
    {
      label: 'No Prazo',
      value: onTrack,
      icon: Clock,
      color: 'text-green-600',
      border: 'border-l-green-500',
    },
    {
      label: 'Vencidos',
      value: overdue,
      icon: AlertTriangle,
      color: 'text-red-600',
      border: 'border-l-red-500',
    },
    {
      label: 'Não Distribuídos',
      value: pendingDistribution,
      icon: Send,
      color: 'text-amber-600',
      border: 'border-l-amber-500',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className={cn('hover-card-elevate border-l-4', card.border)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.label}
            </CardTitle>
            <card.icon className={cn('h-5 w-5', card.color)} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
