import { Skeleton } from '@/components/ui/skeleton'

/**
 * Loading skeleton for the Supplier form page.
 *
 * Mirrors the page layout: a header row with back button + title, then a Card
 * echoing the field sections (identificação, contato, endereço, dados bancários
 * e observações) with the same grid columns and rounded-xl inputs used by the
 * real form, so the loading state never shows a blank screen.
 */
function FieldSkeleton() {
  return (
    <div className="space-y-1.5">
      <Skeleton className="h-3 w-20 rounded-md" />
      <Skeleton className="h-10 w-full rounded-xl" />
    </div>
  )
}

export function SupplierFormSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <Skeleton className="h-7 w-48 rounded-xl" />
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="p-6 space-y-6">
          {/* Identificação */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FieldSkeleton />
            <FieldSkeleton />
            <FieldSkeleton />
          </div>

          {/* Contato */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldSkeleton />
            <FieldSkeleton />
          </div>

          {/* Endereço */}
          <div className="border-t pt-4">
            <Skeleton className="h-4 w-24 rounded-md mb-3" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FieldSkeleton />
              <div className="md:col-span-2">
                <FieldSkeleton />
              </div>
              <FieldSkeleton />
              <FieldSkeleton />
              <FieldSkeleton />
              <FieldSkeleton />
              <FieldSkeleton />
            </div>
          </div>

          {/* Dados Bancários */}
          <div className="border-t pt-4">
            <Skeleton className="h-4 w-36 rounded-md mb-3" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <FieldSkeleton key={i} />
              ))}
            </div>
          </div>

          {/* Observações */}
          <div className="border-t pt-4">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-24 rounded-md" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
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
