import { Skeleton } from '@/components/ui/skeleton'

/**
 * Loading skeleton for the Client form page.
 *
 * Mirrors the page layout: a header row with back button + title, then a Card
 * echoing the field grid (empresa, contato principal, LPU) plus the optional
 * LPU upload section, with the same rounded-xl inputs used by the real form.
 */
function FieldSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-3 w-24 rounded-md" />
      <Skeleton className="h-10 w-full rounded-xl" />
    </div>
  )
}

export function ClientFormSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <Skeleton className="h-7 w-40 rounded-xl" />
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="p-6 space-y-6">
          {/* Empresa */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FieldSkeleton />
            <FieldSkeleton />
            <FieldSkeleton />
            <FieldSkeleton />
          </div>

          {/* Contato Principal */}
          <div className="col-span-full border-t pt-4">
            <Skeleton className="h-4 w-36 rounded-md mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FieldSkeleton />
              <FieldSkeleton />
              <FieldSkeleton />
            </div>
          </div>

          {/* LPU + upload */}
          <div className="col-span-full border-t pt-4 space-y-4">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>

          {/* Footer */}
          <div className="flex justify-end pt-4 border-t">
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}
