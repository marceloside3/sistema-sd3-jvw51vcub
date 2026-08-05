import { useMemo, useState } from 'react'
import { differenceInCalendarDays, format } from 'date-fns'
import { Loader2, Send, AlertTriangle, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/financial'
import {
  createFinanceRequest,
  notifyFinanceUsersOfUrgentRequest,
} from '@/services/finance-requests'
import { logDemandAuditBatch } from '@/services/demand-audit'
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
  const [dueDate, setDueDate] = useState('')
  const [justification, setJustification] = useState('')

  const isUrgent = useMemo(() => {
    if (!dueDate) return false
    return differenceInCalendarDays(new Date(dueDate), new Date()) < 30
  }, [dueDate])

  const canConfirm = useMemo(() => {
    if (!dueDate || !item || !userId) return false
    if (isUrgent && justification.trim().length < 20) return false
    return true
  }, [dueDate, isUrgent, justification, item, userId])

  const handleConfirm = async () => {
    if (!item || !userId || !dueDate) return
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
        due_date: dueDate,
        is_urgent: isUrgent,
        justification: isUrgent ? justification.trim() : null,
      })

      await logDemandAuditBatch([
        {
          demand_id: demandId,
          item_id: item.id,
          user_id: userId,
          field_name: 'finance_request',
          old_value: null,
          new_value: fr.id,
        },
        {
          demand_id: demandId,
          item_id: item.id,
          user_id: userId,
          field_name: 'finance_due_date',
          old_value: null,
          new_value: dueDate,
        },
        {
          demand_id: demandId,
          item_id: item.id,
          user_id: userId,
          field_name: 'finance_is_urgent',
          old_value: null,
          new_value: String(isUrgent),
        },
        ...(isUrgent
          ? [
              {
                demand_id: demandId,
                item_id: item.id,
                user_id: userId,
                field_name: 'finance_justification',
                old_value: null,
                new_value: justification.trim(),
              },
            ]
          : []),
      ])

      if (isUrgent) {
        await notifyFinanceUsersOfUrgentRequest({
          demandId,
          itemName: item.item_name,
          supplierName: item.supplier_name,
          totalCost: item.total_cost,
          dueDate,
        })
      }

      onSent(item.id, fr.id)
      onOpenChange(false)
      setDueDate('')
      setJustification('')
      toast({ title: 'Item enviado para o Financeiro' })
    } catch {
      toast({ title: 'Erro ao enviar para o Financeiro', variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setDueDate('')
      setJustification('')
    }
    onOpenChange(open)
  }

  if (!item) return null

  const todayStr = format(new Date(), 'yyyy-MM-dd')

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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

          <div className="space-y-2 pt-2">
            <Label htmlFor="due-date" className="flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              Data de Vencimento <span className="text-red-500">*</span>
            </Label>
            <Input
              id="due-date"
              type="date"
              min={todayStr}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {isUrgent && (
            <div className="space-y-2 pt-2 animate-fade-in-up">
              <div className="flex items-center gap-1.5 text-amber-600">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">
                  Prazo inferior a 30 dias — justificativa obrigatória
                </span>
              </div>
              <Label htmlFor="justification">
                Justificativa <span className="text-red-500">*</span>
                <span className="text-muted-foreground ml-1">
                  ({justification.trim().length}/20 mínimo)
                </span>
              </Label>
              <Textarea
                id="justification"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={3}
                placeholder="Explique a urgência do pagamento..."
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={sending || !canConfirm}>
            {sending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Send className="w-4 h-4 mr-2" />
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
