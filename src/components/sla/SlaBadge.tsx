import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { calculateSla } from '@/lib/sla'
import { cn } from '@/lib/utils'

interface SlaBadgeProps {
  startedAt?: string | null
  hoursLimit: number
}

export function SlaBadge({ startedAt, hoursLimit }: SlaBadgeProps) {
  const { status, elapsedHours, label } = calculateSla(startedAt, hoursLimit)

  let badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline'
  let text = 'Não distribuído'
  let className = 'text-gray-500 bg-gray-50'

  if (status === 'safe') {
    badgeVariant = 'default'
    text = 'No prazo'
    className = 'bg-green-600 hover:bg-green-700 text-white border-transparent'
  } else if (status === 'warning') {
    badgeVariant = 'secondary'
    text = 'Vencendo'
    className = 'bg-yellow-500 hover:bg-yellow-600 text-white border-transparent'
  } else if (status === 'overdue') {
    badgeVariant = 'destructive'
    text = 'Vencido'
    className = ''
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={badgeVariant} className={cn('cursor-help whitespace-nowrap', className)}>
            {text}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm space-y-1">
            <p>
              <strong>Limite SLA:</strong> {hoursLimit}h
            </p>
            {status !== 'not_distributed' && (
              <>
                <p>
                  <strong>Decorrido:</strong> {elapsedHours.toFixed(1)}h
                </p>
                <p>
                  <strong>Status:</strong> {label}
                </p>
              </>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
