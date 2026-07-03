import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Inbox, FolderKanban, CheckCircle2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HomeKpiCardsProps {
  pendingDemands: number
  activeProjects: number
  completedDemands: number
  totalDemands: number
}

export function HomeKpiCards({
  pendingDemands,
  activeProjects,
  completedDemands,
  totalDemands,
}: HomeKpiCardsProps) {
  const cards = [
    {
      label: 'Demandas Pendentes',
      value: pendingDemands,
      icon: Inbox,
      color: 'text-orange-500',
      border: 'border-l-orange-500',
      bg: 'bg-orange-50',
    },
    {
      label: 'Projetos Ativos',
      value: activeProjects,
      icon: FolderKanban,
      color: 'text-blue-600',
      border: 'border-l-blue-500',
      bg: 'bg-blue-50',
    },
    {
      label: 'Demandas Concluídas',
      value: completedDemands,
      icon: CheckCircle2,
      color: 'text-green-600',
      border: 'border-l-green-500',
      bg: 'bg-green-50',
    },
    {
      label: 'Total de Demandas',
      value: totalDemands,
      icon: Clock,
      color: 'text-zinc-700',
      border: 'border-l-zinc-500',
      bg: 'bg-zinc-100',
    },
  ]

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className={cn('hover-card-elevate border-l-4', card.border)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              {card.label}
            </CardTitle>
            <div className={cn('p-1.5 rounded-lg', card.bg)}>
              <card.icon className={cn('h-4 w-4', card.color)} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
