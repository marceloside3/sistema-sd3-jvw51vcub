import { useState } from 'react'
import { History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { DemandAuditHistory } from '@/components/demands/DemandAuditHistory'
import type { AuditFilters } from '@/hooks/use-demand-audit-filters'

interface DemandAuditHistoryDialogProps {
  demandId: string
  refreshKey?: number
  filters: AuditFilters
}

export function DemandAuditHistoryDialog({
  demandId,
  refreshKey,
  filters,
}: DemandAuditHistoryDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <History className="w-4 h-4 mr-2" />
        Histórico de Alterações
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Histórico de Alterações
            </DialogTitle>
            <DialogDescription>
              Registro de todas as alterações feitas nos itens desta demanda.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 -mx-6 px-6 pb-6">
            <DemandAuditHistory
              key={open ? 'open' : 'closed'}
              demandId={demandId}
              refreshKey={refreshKey}
              filters={filters}
              embedded
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
