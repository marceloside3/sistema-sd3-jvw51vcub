import { Skeleton } from '@/components/ui/skeleton'

/**
 * Loading skeleton for the Criação Kanban page.
 *
 * Mirrors the page layout: a header row with filters, then a horizontal strip
 * of skeleton columns that echo the rounded kanban cards (rounded-2xl) used
 * by the real board.
 */
export function KanbanLoadingSkeleton() {
  return (
    <div className="space-y-6 max-w-full min-h-[calc(100vh-6rem)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-50" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48 rounded-xl" />
            <Skeleton className="h-3 w-64 rounded-lg" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      <div className="bg-white border border-zinc-100 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-9 flex-1 min-w-[200px] rounded-xl" />
          <Skeleton className="h-9 w-[180px] rounded-xl" />
          <Skeleton className="h-9 w-[140px] rounded-xl" />
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-6 items-start">
        {Array.from({ length: 5 }).map((_, colIdx) => (
          <div
            key={colIdx}
            className="flex flex-col flex-shrink-0 w-80 md:w-[22rem] rounded-3xl border border-zinc-100 p-3 bg-white min-h-[520px]"
          >
            <div className="flex items-center gap-2.5 px-1 pt-1 pb-3">
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-4 w-32 rounded-lg" />
            </div>
            <div className="flex-1 space-y-3 px-1">
              {Array.from({ length: 3 }).map((_, cardIdx) => (
                <div
                  key={cardIdx}
                  className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-3.5 space-y-3"
                >
                  <Skeleton className="h-4 w-full rounded-lg" />
                  <Skeleton className="h-3 w-2/3 rounded-lg" />
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-3 w-24 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
