import { Loader2, Check, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface SavingIndicatorProps {
  status: SaveStatus
  className?: string
}

export function SavingIndicator({ status, className }: SavingIndicatorProps) {
  if (status === 'idle') return null

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md transition-all duration-300',
        status === 'saving' && 'text-muted-foreground bg-muted/50',
        status === 'saved' && 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950/30',
        status === 'error' && 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/30',
        className,
      )}
    >
      {status === 'saving' && (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Salvando...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <Check className="w-3.5 h-3.5" />
          <span>Salvo ✓</span>
        </>
      )}
      {status === 'error' && (
        <>
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Erro ao salvar</span>
        </>
      )}
    </div>
  )
}
