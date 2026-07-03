import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FolderKanban, Clock, AlertTriangle, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

export type HubKpiCardKey = 'total' | 'onTrack' | 'overdue' | 'pendingDistribution'

interface HubKpiCardsProps {
  total: number
  onTrack: number
  overdue: number
  pendingDistribution: number
  activeCard?: HubKpiCardKey | null
  onCardClick?: (card: HubKpiCardKey) => void
}

export function HubKpiCards({
  total,
  onTrack,
  overdue,
  pendingDistribution,
  activeCard,
  onCardClick,
}: HubKpiCardsProps) {
  const cards: {
    key: HubKpiCardKey
    label: string
    value: number
    icon: typeof FolderKanban
    color: string
    border: string
    activeBg: string
    activeRing: string
  }[] = [
    {
      key: 'total',
      label: 'Total de Projetos',
      value: total,
      icon: FolderKanban,
      color: 'text-blue-600',
      border: 'border-l-blue-500',
      activeBg: 'bg-blue-50',
      activeRing: 'ring-2 ring-blue-400',
    },
    {
      key: 'onTrack',
      label: 'No Prazo',
      value: onTrack,
      icon: Clock,
      color: 'text-green-600',
      border: 'border-l-green-500',
      activeBg: 'bg-green-50',
      activeRing: 'ring-2 ring-green-400',
    },
    {
      key: 'overdue',
      label: 'Vencidos',
      value: overdue,
      icon: AlertTriangle,
      color: 'text-red-600',
      border: 'border-l-red-500',
      activeBg: 'bg-red-50',
      activeRing: 'ring-2 ring-red-400',
    },
    {
      key: 'pendingDistribution',
      label: 'Não Distribuídos',
      value: pendingDistribution,
      icon: Send,
      color: 'text-amber-600',
      border: 'border-l-amber-500',
      activeBg: 'bg-amber-50',
      activeRing: 'ring-2 ring-amber-400',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const isActive = activeCard === card.key
        return (
          <Card
            key={card.key}
            onClick={() => onCardClick?.(card.key)}
            className={cn(
              'border-l-4 transition-all duration-200 cursor-pointer select-none',
              'hover:shadow-md hover:-translate-y-0.5',
              card.border,
              isActive && cn(card.activeBg, card.activeRing, 'shadow-md'),
              !isActive && 'hover-card-elevate',
            )}
          >
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
        )
      })}
    </div>
  )
}
