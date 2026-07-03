import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Inbox, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import type { DashboardDemand } from '@/hooks/use-dashboard-data'
import { formatDateBR } from '@/lib/utils'

interface RecentDemandsProps {
  demands: DashboardDemand[]
  loading: boolean
}

const statusConfig: Record<string, { label: string; icon: typeof Inbox; color: string }> = {
  pending: { label: 'Pendente', icon: Clock, color: 'text-orange-500' },
  in_progress: { label: 'Em Andamento', icon: AlertCircle, color: 'text-blue-500' },
  completed: { label: 'Concluída', icon: CheckCircle2, color: 'text-green-500' },
  cancelled: { label: 'Cancelada', icon: AlertCircle, color: 'text-zinc-400' },
}

const priorityConfig: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  normal: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  low: 'bg-blue-100 text-blue-700 border-blue-200',
}

export function RecentDemands({ demands, loading }: RecentDemandsProps) {
  return (
    <Card className="shadow-premium border-zinc-100">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Inbox className="h-4 w-4 text-orange-500" />
          Demandas Recentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : demands.length === 0 ? (
          <p className="text-sm text-zinc-400 italic py-6 text-center">Nenhuma demanda recente.</p>
        ) : (
          <ul className="space-y-1">
            {demands.map((demand) => {
              const config = statusConfig[demand.status] || statusConfig.pending
              const StatusIcon = config.icon
              return (
                <li key={demand.id}>
                  <Link
                    to={`/demandas/${demand.id}`}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-zinc-50 transition-colors duration-200 group"
                  >
                    <div className="p-2 bg-zinc-50 rounded-lg group-hover:bg-white transition-colors">
                      <StatusIcon className={config.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 truncate">{demand.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {demand.project_name && (
                          <span className="text-xs text-zinc-400 truncate">
                            {demand.project_name}
                          </span>
                        )}
                        {demand.due_date && (
                          <span className="text-xs text-zinc-400">
                            • {formatDateBR(demand.due_date)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs border ${priorityConfig[demand.priority] || priorityConfig.normal}`}
                    >
                      {demand.priority === 'high'
                        ? 'Alta'
                        : demand.priority === 'low'
                          ? 'Baixa'
                          : 'Normal'}
                    </Badge>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
