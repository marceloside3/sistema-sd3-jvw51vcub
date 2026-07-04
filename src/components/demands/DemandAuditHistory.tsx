import { useEffect, useState } from 'react'
import { History } from 'lucide-react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getDemandAuditLog, DemandAuditEntry } from '@/services/demand-audit'

const FIELD_LABELS: Record<string, string> = {
  unit_price: 'Preço Unitário',
  quantity: 'Quantidade',
  unit_cost: 'Custo Unitário',
  extra_cost: 'Custo Extra',
  honorarios_percentage: 'Honorários (%)',
  supplier_name: 'Fornecedor',
  total_cost: 'Custo Total',
  cost_status: 'Status de Custo',
  status: 'Status da Demanda',
}

interface DemandAuditHistoryProps {
  demandId: string
  refreshKey?: number
}

export function DemandAuditHistory({ demandId, refreshKey }: DemandAuditHistoryProps) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="w-5 h-5 text-muted-foreground" />
          Histórico de Alterações
        </CardTitle>
      </CardHeader>
      <CardContent>
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
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {entries.map((entry) => (
              <div key={entry.id} className="flex flex-col gap-1 border-b pb-2 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {entry.item?.item_name ? `${entry.item.item_name} — ` : ''}
                    {FIELD_LABELS[entry.field_name] || entry.field_name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(entry.created_at), 'dd/MM/yyyy HH:mm')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-red-500 line-through">{entry.old_value || '—'}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-green-600 font-medium">{entry.new_value || '—'}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  por {entry.user?.full_name || 'Usuário'}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
