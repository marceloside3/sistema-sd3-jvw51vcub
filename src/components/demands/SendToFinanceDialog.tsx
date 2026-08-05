import { useState } from 'react'
import { Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/financial'
import { createFinanceRequest } from '@/services/finance-requests'
import { logDemandAuditEntry } from '@/services/demand-audit'
import { useToast } from '@/hooks/use-toast'

interface SendToFinanceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: {
    id: string
    item_name: string
    quantity: number
    supplier_id: string | null
    supplier_name: string | null
    unit_cost: number | null
    total_cost: number | null
  } | null
  demandId: string
  userId: string
  onSent: (itemId: string, financeRequestId: string) => void
}

export function SendToFinanceDialog({
  open,
  onOpenChange,
  item,
  demandId,
  userId,
  onSent,
}: SendToFinanceDialogProps) {
  const { toast } = useToast()
  const [sending, setSending] = useState(false)

  const handleConfirm = async () => {
    if (!item || !userId) return
    setSending(true)
    try {
      const fr = await createFinanceRequest({
        demand_item_id: item.id,
        demand_id: demandId,
        supplier_id: item.supplier_id,
        supplier_name: item.supplier_name,
        unit_cost: item.unit_cost,
        quantity: item.quantity,
        total_cost: item.total_cost,
        created_by: userId,
      })

      await logDemandAuditEntry({
        demand_id: demandId,
        item_id: item.id,
        user_id: userId,
        field_name: 'finance_request',
        old_value: null,
        new_value: fr.id,
      })

      onSent(item.id, fr.id)
      onOpenChange(false)
      toast({ title: 'Item enviado para o Financeiro' })
    } catch {
      toast({ title: 'Erro ao enviar para o Financeiro', variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar para o Financeiro</DialogTitle>
          <DialogDescription>
            Confirme as informações do item antes de enviá-lo para o módulo financeiro.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Item</span>
            <span className="font-medium">{item.item_name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Fornecedor</span>
            <span className="font-medium">{item.supplier_name || '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Quantidade</span>
            <span className="font-medium">{item.quantity}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Custo Unitário</span>
            <span className="font-mono font-medium">{formatCurrency(item.unit_cost)}</span>
          </div>
          <div className="flex justify-between text-sm border-t pt-3">
            <span className="font-semibold">Custo Total</span>
            <span className="font-mono font-bold">{formatCurrency(item.total_cost)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={sending}>
            {sending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Send className="w-4 h-4 mr-2" />
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
