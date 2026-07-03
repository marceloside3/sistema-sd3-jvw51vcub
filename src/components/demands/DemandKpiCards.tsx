import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Inbox, Send, CheckCircle2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type KpiCardKey = 'received' | 'sent' | 'completed' | 'overdue'

interface DemandKpiCardsProps {
  received: number
  sent: number
  completed: number
  overdue: number
  activeCard?: KpiCardKey | null
  onCardClick?: (card: KpiCardKey) => void
}

export function DemandKpiCards({
  received,
  sent,
  completed,
  overdue,
  activeCard,
  onCardClick,
}: DemandKpiCardsProps) {
  const cards: {
    key: KpiCardKey
    label: string
    value: number
    icon: typeof Inbox
    color: string
    border: string
    activeBg: string
    activeRing: string
  }[] = [
    {
      key: 'received',
      label: 'Recebidas',
      value: received,
      icon: Inbox,
      color: 'text-blue-600',
      border: 'border-l-blue-500',
      activeBg: 'bg-blue-50',
      activeRing: 'ring-2 ring-blue-400',
    },
    {
      key: 'sent',
      label: 'Enviadas',
      value: sent,
      icon: Send,
      color: 'text-purple-600',
      border: 'border-l-purple-500',
      activeBg: 'bg-purple-50',
      activeRing: 'ring-2 ring-purple-400',
    },
    {
      key: 'completed',
      label: 'Concluídas',
      value: completed,
      icon: CheckCircle2,
      color: 'text-green-600',
      border: 'border-l-green-500',
      activeBg: 'bg-green-50',
      activeRing: 'ring-2 ring-green-400',
    },
    {
      key: 'overdue',
      label: 'Atrasadas',
      value: overdue,
      icon: AlertTriangle,
      color: 'text-red-600',
      border: 'border-l-red-500',
      activeBg: 'bg-red-50',
      activeRing: 'ring-2 ring-red-400',
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
