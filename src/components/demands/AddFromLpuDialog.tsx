import { useState, useEffect } from 'react'
import { Loader2, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { getLpuItems, LpuItem } from '@/services/lpu'
import { addDemandItem } from '@/services/demands'
import { useCurrentUser } from '@/hooks/use-current-user'
import { logDemandAuditEntry } from '@/services/demand-audit'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/financial'

interface AddFromLpuDialogProps {
  demandId: string
  clientId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function AddFromLpuDialog({
  demandId,
  clientId,
  open,
  onOpenChange,
  onSaved,
}: AddFromLpuDialogProps) {
  const { toast } = useToast()
  const { data: userCtx } = useCurrentUser()
  const [lpuItems, setLpuItems] = useState<LpuItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (open && clientId) {
      setLoading(true)
      getLpuItems(clientId)
        .then(setLpuItems)
        .catch(() => setLpuItems([]))
        .finally(() => setLoading(false))
    }
  }, [open, clientId])

  useEffect(() => {
    if (!open) {
      setSelectedIds(new Set())
      setLpuItems([])
    }
  }, [open])

  const uniqueByName = (() => {
    const seen = new Set<string>()
    return lpuItems.filter((item) => {
      const key = item.item_name.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  })()

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === uniqueByName.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(uniqueByName.map((i) => i.id)))
    }
  }

  const handleSave = async () => {
    if (selectedIds.size === 0) {
      toast({ title: 'Selecione ao menos um item da LPU', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const itemsToAdd = lpuItems.filter((item) => selectedIds.has(item.id))

      for (const item of itemsToAdd) {
        const newItem = await addDemandItem(demandId, {
          item_name: item.item_name,
          description: item.description || null,
          quantity: 1,
          lpu_item_id: item.id,
          unit_price: item.unit_value,
          is_custom: false,
        })

        if (userCtx?.user?.id) {
          await logDemandAuditEntry({
            demand_id: demandId,
            item_id: newItem.id,
            user_id: userCtx.user.id,
            field_name: 'item_added',
            new_value: item.item_name,
          })
        }
      }

      toast({
        title: 'Itens adicionados!',
        description: `${selectedIds.size} item(ns) da LPU adicionados à demanda.`,
      })
      onSaved()
      onOpenChange(false)
    } catch {
      toast({ title: 'Erro ao adicionar itens da LPU', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-muted-foreground" />
            Adicionar da LPU
          </DialogTitle>
          <DialogDescription>
            Selecione um ou mais itens da Lista de Preços Unitários do cliente para adicionar à
            demanda.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !clientId ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Selecione um cliente para ver os itens da LPU.
          </div>
        ) : uniqueByName.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Este cliente não possui itens de LPU cadastrados.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-1 pb-2">
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} de {uniqueByName.length} selecionado(s)
              </span>
              <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
                {selectedIds.size === uniqueByName.length ? 'Desmarcar todos' : 'Selecionar todos'}
              </Button>
            </div>
            <ScrollArea className="h-[360px] rounded-md border">
              <div className="divide-y">
                {uniqueByName.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedIds.has(item.id)}
                      onCheckedChange={() => toggleSelect(item.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm truncate">{item.item_name}</span>
                        <span className="font-mono text-sm font-semibold whitespace-nowrap">
                          {formatCurrency(item.unit_value)}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      {item.range && (
                        <span className="inline-block mt-1 text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded">
                          Faixa: {item.range}
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading || uniqueByName.length === 0 || selectedIds.size === 0}
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Adicionar {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
