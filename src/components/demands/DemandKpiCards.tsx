import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Inbox, Send, CheckCircle2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DemandKpiCardsProps {
  received: number
  sent: number
  completed: number
  overdue: number
}

export function DemandKpiCards({ received, sent, completed, overdue }: DemandKpiCardsProps) {
  const cards = [
    {
      label: 'Recebidas',
      value: received,
      icon: Inbox,
      color: 'text-blue-600',
      border: 'border-l-blue-500',
    },
    {
      label: 'Enviadas',
      value: sent,
      icon: Send,
      color: 'text-purple-600',
      border: 'border-l-purple-500',
    },
    {
      label: 'Concluídas',
      value: completed,
      icon: CheckCircle2,
      color: 'text-green-600',
      border: 'border-l-green-500',
    },
    {
      label: 'Atrasadas',
      value: overdue,
      icon: AlertTriangle,
      color: 'text-red-600',
      border: 'border-l-red-500',
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
