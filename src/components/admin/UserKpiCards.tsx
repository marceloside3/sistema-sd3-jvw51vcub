import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, UserCheck, UserX } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserKpiCardsProps {
  total: number
  active: number
  inactive: number
}

export function UserKpiCards({ total, active, inactive }: UserKpiCardsProps) {
  const cards = [
    {
      label: 'Total de Usuários',
      value: total,
      icon: Users,
      color: 'text-blue-600',
      border: 'border-l-blue-500',
    },
    {
      label: 'Ativos',
      value: active,
      icon: UserCheck,
      color: 'text-green-600',
      border: 'border-l-green-500',
    },
    {
      label: 'Inativos',
      value: inactive,
      icon: UserX,
      color: 'text-red-600',
      border: 'border-l-red-500',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-3">
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
