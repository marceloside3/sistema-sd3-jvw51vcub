import { useEffect } from 'react'
import { ExternalLink } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { DemandDetails } from '@/components/demands/DemandDetails'

interface DemandDetailSheetProps {
  /** Demand id to display. When `null`, the sheet is closed. */
  demandId: string | null
  /** Controlled open state. */
  open: boolean
  /** Fired when the user dismisses the sheet (overlay click, ESC, close button). */
  onOpenChange: (open: boolean) => void
  /** Called when the demand is mutated from inside the sheet so the Kanban can refresh. */
  onDemandChanged?: () => void
}

/**
 * Right-side flyout (shadcn Sheet) that renders the full demand details over
 * the Kanban, without changing the URL. The user stays on `/criacao`; closing
 * the sheet returns them to exactly the board they were looking at.
 *
 * - Desktop: ~65% of the viewport width (tunable via `--sd3-sheet-w`).
 * - Mobile: full-screen via `w-full`.
 *
 * The "Abrir em tela cheia" button opens `/demandas/:id` in a new browser tab.
 */
export function DemandDetailSheet({
  demandId,
  open,
  onOpenChange,
  onDemandChanged,
}: DemandDetailSheetProps) {
  // Close on Escape is handled natively by Radix; nothing extra needed here.
  // Lock body scroll while open is also handled by Radix Dialog primitives.

  // When the sheet closes, give back focus cleanly (Radix handles this too).
  useEffect(() => {
    if (!open) return
    // nothing to do — Radix manages focus trap & body scroll lock.
  }, [open])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        // Full-screen on mobile; ~65% width on sm+ (overrides the default `sm:max-w-sm`).
        className="w-full sm:w-[65vw] sm:max-w-none p-0 flex flex-col gap-0"
      >
        {/* Sticky header with title + "Abrir em tela cheia" */}
        <SheetHeader className="flex flex-row items-center justify-between gap-3 border-b px-5 py-4 space-y-0">
          <div className="min-w-0">
            <SheetTitle className="truncate text-base">Detalhes da Demanda</SheetTitle>
            <SheetDescription className="sr-only">
              Veja e edite os detalhes da demanda sem sair do Kanban.
            </SheetDescription>
          </div>
          {demandId && (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="shrink-0 h-8 text-xs rounded-xl border-zinc-200 dark:border-slate-700"
              title="Abrir a página completa da demanda em uma nova aba"
            >
              <a href={`/demandas/${demandId}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                Abrir em tela cheia
              </a>
            </Button>
          )}
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5">
          {demandId ? (
            <DemandDetails
              demandId={demandId}
              showBackButton={false}
              onDemandChanged={onDemandChanged}
            />
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Selecione uma demanda para ver os detalhes.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
