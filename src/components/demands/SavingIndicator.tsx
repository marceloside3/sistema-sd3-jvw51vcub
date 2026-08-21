import { Loader2, Check, AlertCircle, RotateCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface SavingIndicatorProps {
  status: SaveStatus
  className?: string
  lastSavedAt?: Date | null
  onRetry?: () => void
  showSavedTime?: boolean
}

export function SavingIndicator({
  status,
  className,
  lastSavedAt,
  onRetry,
  showSavedTime = false,
}: SavingIndicatorProps) {
  if (status === 'idle' && (!showSavedTime || !lastSavedAt)) return null

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md transition-all duration-300 border shadow-2xs select-none',
        status === 'saving' && 'text-muted-foreground bg-muted/80 border-border animate-pulse',
        status === 'saved' &&
          'text-emerald-700 bg-emerald-50 border-emerald-200/80 dark:text-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-800/50',
        status === 'error' &&
          'text-destructive bg-destructive/10 border-destructive/30 dark:bg-destructive/20 dark:border-destructive/40',
        status === 'idle' &&
          lastSavedAt &&
          'text-muted-foreground bg-background/80 border-border/60',
        className,
      )}
    >
      {status === 'saving' && (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          <span>Salvando...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
          <span>Salvo ✓</span>
        </>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
          <span>Erro ao salvar</span>
          {onRetry && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onRetry()
              }}
              className="h-5 px-1.5 text-[10px] font-semibold text-destructive hover:text-destructive hover:bg-destructive/15 underline-offset-2 ml-0.5"
            >
              <RotateCw className="w-3 h-3 mr-1" />
              Tentar novamente
            </Button>
          )}
        </div>
      )}
      {status === 'idle' && lastSavedAt && (
        <>
          <Check className="w-3 h-3 text-emerald-600/70 dark:text-emerald-400/70" />
          <span className="text-[11px] text-muted-foreground">
            Salvo às{' '}
            {lastSavedAt.toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </>
      )}
    </div>
  )
}
