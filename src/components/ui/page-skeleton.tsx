import { Skeleton } from '@/components/ui/skeleton'

interface PageSkeletonProps {
  /** Number of KPI cards to render (default 4). */
  kpiCount?: number
  /** Title width in tailwind units (e.g. "w-48"). */
  titleClassName?: string
  children?: React.ReactNode
}

/**
 * Generic top-of-page skeleton: a heading + a row of KPI cards + an optional
 * block of children. Used as the shared loading state across Dashboard,
 * Projects list, Demands list, and Admin lists.
 *
 * The rounded shapes (`rounded-2xl` / `rounded-xl`) follow the system's
 * visual identity.
 */
export function PageSkeleton({
  kpiCount = 4,
  titleClassName = 'h-8 w-48',
  children,
}: PageSkeletonProps) {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className={`rounded-xl ${titleClassName}`} />
          <Skeleton className="h-4 w-64 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-40 rounded-xl" />
      </div>

      {kpiCount > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: kpiCount }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-zinc-200/60 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-xl" />
              </div>
              <Skeleton className="h-7 w-16 rounded-lg" />
            </div>
          ))}
        </div>
      )}

      {children ?? <TableSkeleton rows={6} cols={5} />}
    </div>
  )
}

interface TableSkeletonProps {
  rows?: number
  cols?: number
}

/** A skeleton of a data table with a header row and `rows` body rows. */
export function TableSkeleton({ rows = 5, cols = 5 }: TableSkeletonProps) {
  return (
    <div className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
      <div className="border-b border-zinc-200/60 dark:border-zinc-800 p-4 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1 rounded-lg" />
        ))}
      </div>
      <div className="divide-y divide-zinc-200/60 dark:divide-zinc-800">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-4 flex gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-5 flex-1 rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** A skeleton of a detail page header + card sections. */
export function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-72 rounded-xl" />
          <Skeleton className="h-4 w-56 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-zinc-200/60 p-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full rounded-lg" />
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-200/60 p-6 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
