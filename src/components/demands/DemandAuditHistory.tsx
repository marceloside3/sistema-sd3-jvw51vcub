import { useEffect, useState, useMemo } from 'react'
import { History } from 'lucide-react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getDemandAuditLog, DemandAuditEntry } from '@/services/demand-audit'
import { formatAuditValue, DEMAND_AUDIT_FIELD_LABELS } from '@/lib/demand-audit-format'
import { DemandAuditFilters } from '@/components/demands/DemandAuditFilters'
import type { AuditFilters } from '@/hooks/use-demand-audit-filters'

interface DemandAuditHistoryProps {
  demandId: string
  refreshKey?: number
  embedded?: boolean
  filters: AuditFilters
}

export function DemandAuditHistory({
  demandId,
  refreshKey,
  embedded = false,
  filters,
}: DemandAuditHistoryProps) {
  const [entries, setEntries] = useState<DemandAuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const data = await getDemandAuditLog(demandId)
        if (!cancelled) setEntries(data)
      } catch {
        if (!cancelled) setEntries([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [demandId, refreshKey])

  const distinctUsers = useMemo(() => {
    const map = new Map<string, string>()
    entries.forEach((e) => {
      const name = e.user?.full_name || 'Usuário'
      map.set(e.user_id, name)
    })
    return Array.from(map, ([id, name]) => ({ id, name }))
  }, [entries])

  const distinctFields = useMemo(() => {
    const set = new Set<string>()
    entries.forEach((e) => set.add(e.field_name))
    return Array.from(set)
  }, [entries])

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (filters.selectedUserId && entry.user_id !== filters.selectedUserId) return false
      if (filters.selectedField && entry.field_name !== filters.selectedField) return false
      if (filters.dateFrom) {
        const entryDate = new Date(entry.created_at)
        const fromDate = new Date(filters.dateFrom + 'T00:00:00')
        if (entryDate < fromDate) return false
      }
      if (filters.dateTo) {
        const entryDate = new Date(entry.created_at)
        const toDate = new Date(filters.dateTo + 'T23:59:59')
        if (entryDate > toDate) return false
      }
      return true
    })
  }, [entries, filters.selectedUserId, filters.selectedField, filters.dateFrom, filters.dateTo])

  const content = (
    <>
      {!loading && entries.length > 0 && (
        <DemandAuditFilters filters={filters} users={distinctUsers} fields={distinctFields} />
      )}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Nenhuma alteração registrada.
        </p>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-6 space-y-2">
          <p className="text-sm text-muted-foreground">
            Nenhum resultado para os filtros selecionados.
          </p>
          <button onClick={filters.reset} className="text-sm text-blue-600 hover:underline">
            Limpar Filtros
          </button>
        </div>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {filteredEntries.map((entry) => (
            <div key={entry.id} className="flex flex-col gap-1 border-b pb-2 last:border-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {entry.item?.item_name ? `${entry.item.item_name} — ` : ''}
                  {DEMAND_AUDIT_FIELD_LABELS[entry.field_name] || entry.field_name}
                </span>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                  {format(new Date(entry.created_at), 'dd/MM/yyyy HH:mm')}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-red-500 line-through">
                  {formatAuditValue(entry.field_name, entry.old_value)}
                </span>
                <span className="text-muted-foreground">→</span>
                <span className="text-green-600 font-medium">
                  {formatAuditValue(entry.field_name, entry.new_value)}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                por {entry.user?.full_name || 'Usuário'}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  )

  if (embedded) {
    return <div className="space-y-3">{content}</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="w-5 h-5 text-muted-foreground" />
          Histórico de Alterações
        </CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  )
}
