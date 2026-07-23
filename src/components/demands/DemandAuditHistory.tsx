import { useEffect, useState } from 'react'
import { History } from 'lucide-react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getDemandAuditLog, DemandAuditEntry } from '@/services/demand-audit'
import { formatAuditValue } from '@/lib/demand-audit-format'

const FIELD_LABELS: Record<string, string> = {
  item_name: 'Nome do Item',
  description: 'Descrição',
  quantity: 'Quantidade',
  unit_price: 'Preço Unitário',
  unit_cost: 'Custo Unitário',
  extra_cost: 'Custo Extra',
  honorarios_percentage: 'Honorários (%)',
  supplier_name: 'Fornecedor',
  total_cost: 'Custo Total',
  cost_status: 'Status de Custo',
  delivery_location: 'Local de Entrega',
  deadline: 'Prazo',
  is_custom: 'Item Personalizado',
  status: 'Status da Demanda',
  budget_status: 'Status do Orçamento',
  payment_status: 'Status do Pagamento',
  is_locked: 'Bloqueio de Edição',
  item_added: 'Item Adicionado',
  item_removed: 'Item Removido',
}

interface DemandAuditHistoryProps {
  demandId: string
  refreshKey?: number
  embedded?: boolean
}

export function DemandAuditHistory({
  demandId,
  refreshKey,
  embedded = false,
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

  const content = (
    <>
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
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {entries.map((entry) => (
            <div key={entry.id} className="flex flex-col gap-1 border-b pb-2 last:border-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {entry.item?.item_name ? `${entry.item.item_name} — ` : ''}
                  {FIELD_LABELS[entry.field_name] || entry.field_name}
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
