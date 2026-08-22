import { Skeleton } from '@/components/ui/skeleton'

/**
 * Loading skeleton for the Nova Demanda page.
 *
 * Mirrors the page layout: a header row with back button + title, then the
 * rounded-2xl form card echoing the project/area/responsável selects and the
 * título/descrição fields. Areas, responsáveis, projetos, etc. are loaded
 * asynchronously on mount; this skeleton avoids a blank screen during that
 * initial fetch.
 */
function FieldSkeleton({ labelWidth = 'w-28' }: { labelWidth?: string }) {
  return (
    <div className="space-y-2">
      <Skeleton className={`h-3 ${labelWidth} rounded-md`} />
      <Skeleton className="h-10 w-full rounded-xl" />
    </div>
  )
}

export function NovaDemandaSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <Skeleton className="h-7 w-40 rounded-xl" />
      </div>

      <div className="bg-white p-6 rounded-2xl border border-zinc-200/60 shadow-sm space-y-6">
        {/* Projeto */}
        <FieldSkeleton labelWidth="w-20" />

        {/* Área + Responsável */}
        <div className="grid grid-cols-2 gap-4">
          <FieldSkeleton labelWidth="w-32" />
          <FieldSkeleton labelWidth="w-44" />
        </div>

        {/* Título + Descrição */}
        <FieldSkeleton labelWidth="w-16" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-20 rounded-md" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-4 pt-4 border-t">
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
