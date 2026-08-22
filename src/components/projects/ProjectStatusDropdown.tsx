import { useEffect, useState } from 'react'
import { Calendar, Loader2 } from 'lucide-react'
import { getProjectAreaStatus, type ProjectAreaStatus } from '@/services/projects'
import { formatDateBR } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface ProjectStatusDropdownProps {
  projectId: string
  end_date: string | null
}

/**
 * Expandable status panel shown below a project card on the projects list.
 *
 * Loads the per-area demand breakdown on demand (only when first expanded),
 * then caches it in component state so re-toggling is instant. Shows the
 * project's due date in highlight at the top, followed by one row per area
 * with a count-by-status summary and an orange progress bar.
 */
export function ProjectStatusDropdown({ projectId, end_date }: ProjectStatusDropdownProps) {
  const [areas, setAreas] = useState<ProjectAreaStatus[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (areas || loading) return
    let cancelled = false
    setLoading(true)
    setError(null)
    getProjectAreaStatus(projectId)
      .then((data) => {
        if (!cancelled) setAreas(data)
      })
      .catch((err) => {
        console.error('[ProjectStatusDropdown] failed to load area status:', err)
        if (!cancelled) setError('Não foi possível carregar o status das áreas.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  return (
    <div className="bg-zinc-50 border-t border-zinc-200/60 px-4 py-4 animate-expand-down">
      {/* Due date in highlight */}
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="h-4 w-4 text-orange-500" />
        <span className="text-xs font-medium text-zinc-500">Entrega prevista:</span>
        {end_date ? (
          <span className="text-sm font-semibold text-zinc-900">{formatDateBR(end_date)}</span>
        ) : (
          <span className="text-sm font-medium text-zinc-400 italic">Sem prazo definido</span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32 rounded-lg" />
                <Skeleton className="h-4 w-24 rounded-lg" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : !areas || areas.length === 0 ? (
        <p className="text-sm text-zinc-400 italic">Nenhuma demanda vinculada a este projeto.</p>
      ) : (
        <div className="space-y-3">
          {areas.map((a) => (
            <AreaStatusRow key={a.areaId} area={a} />
          ))}
        </div>
      )}
    </div>
  )
}

function AreaStatusRow({ area }: { area: ProjectAreaStatus }) {
  const summary = buildStatusSummary(area)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-zinc-700 truncate">{area.areaName}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-zinc-500">{summary}</span>
          <span className="text-xs font-semibold text-zinc-700 tabular-nums">
            {area.completedPct}% ({area.done}/{area.total})
          </span>
        </div>
      </div>
      <div className="h-2 w-full rounded-full bg-zinc-200 overflow-hidden">
        <div
          className={cn('h-full rounded-full bg-orange-500 transition-all duration-500 ease-out')}
          style={{ width: `${area.completedPct}%` }}
        />
      </div>
    </div>
  )
}

function buildStatusSummary(a: ProjectAreaStatus): string {
  const parts: string[] = []
  if (a.pending) parts.push(`${a.pending} pendente${a.pending > 1 ? 's' : ''}`)
  if (a.in_progress) parts.push(`${a.in_progress} em andamento`)
  if (a.review) parts.push(`${a.review} em revisão`)
  if (a.done) parts.push(`${a.done} concluída${a.done > 1 ? 's' : ''}`)
  if (a.cancelled) parts.push(`${a.cancelled} cancelada${a.cancelled > 1 ? 's' : ''}`)
  if (a.rejected) parts.push(`${a.rejected} rejeitada${a.rejected > 1 ? 's' : ''}`)
  return parts.length > 0 ? parts.join(', ') : 'sem demandas'
}
