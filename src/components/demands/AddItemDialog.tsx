import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
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
import { LpuItemPicker } from '@/components/demands/LpuItemPicker'
import { getLpuItems, findMatchingLpuItem, LpuItem } from '@/services/lpu'
import { addDemandItem } from '@/services/demands'
import { useCurrentUser } from '@/hooks/use-current-user'
import { logDemandAuditBatch } from '@/services/demand-audit'
import { useToast } from '@/hooks/use-toast'
import { formatInputDecimal, sanitizeDecimalInput, parseNumber } from '@/lib/financial'

interface AddItemDialogProps {
  demandId: string
  clientId: string | null
  isLocked?: boolean
  isAdmin?: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function AddItemDialog({
  demandId,
  clientId,
  isLocked = false,
  isAdmin = false,
  open,
  onOpenChange,
  onSaved,
}: AddItemDialogProps) {
  const canEdit = !isLocked || isAdmin
  const { toast } = useToast()
  const { data: userCtx } = useCurrentUser()
  const [lpuItems, setLpuItems] = useState<LpuItem[]>([])
  const [loadingLpu, setLoadingLpu] = useState(false)
  const [itemName, setItemName] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [description, setDescription] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && clientId) {
      setLoadingLpu(true)
      getLpuItems(clientId)
        .then(setLpuItems)
        .catch(() => setLpuItems([]))
        .finally(() => setLoadingLpu(false))
    }
  }, [open, clientId])

  useEffect(() => {
    if (!open) {
      setItemName('')
      setQuantity('1')
      setDescription('')
      setUnitPrice('')
    }
  }, [open])

  const parsedQty = parseNumber(quantity) || 1
  const matchedLpu = itemName ? findMatchingLpuItem(lpuItems, itemName, parsedQty) : null
  const isLpu = !!matchedLpu
  const effectiveUnitPrice = isLpu ? matchedLpu.unit_value : parseNumber(unitPrice)

  const handleSave = async () => {
    if (!itemName.trim()) {
      toast({ title: 'Informe o nome do item', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const newItem = await addDemandItem(demandId, {
        item_name: itemName.trim(),
        description: description.trim() || null,
        quantity: parsedQty,
        lpu_item_id: matchedLpu?.id || null,
        unit_price: effectiveUnitPrice > 0 ? effectiveUnitPrice : null,
        is_custom: !isLpu,
      })

      if (userCtx?.id) {
        await logDemandAuditBatch([
          {
            demand_id: demandId,
            item_id: newItem.id,
            user_id: userCtx.id,
            field_name: 'item_added',
            new_value: itemName.trim(),
          },
          {
            demand_id: demandId,
            item_id: newItem.id,
            user_id: userCtx.id,
            field_name: 'item_name',
            new_value: itemName.trim(),
          },
          {
            demand_id: demandId,
            item_id: newItem.id,
            user_id: userCtx.id,
            field_name: 'description',
            new_value: description.trim() || null,
          },
          {
            demand_id: demandId,
            item_id: newItem.id,
            user_id: userCtx.id,
            field_name: 'quantity',
            new_value: String(parsedQty),
          },
          {
            demand_id: demandId,
            item_id: newItem.id,
            user_id: userCtx.id,
            field_name: 'unit_price',
            new_value: effectiveUnitPrice > 0 ? String(effectiveUnitPrice) : null,
          },
          {
            demand_id: demandId,
            item_id: newItem.id,
            user_id: userCtx.id,
            field_name: 'is_custom',
            new_value: String(!isLpu),
          },
        ])
      }

      onSaved()
      onOpenChange(false)
    } catch {
      toast({ title: 'Erro ao adicionar item', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Item</DialogTitle>
          <DialogDescription>
            Selecione um item da LPU do cliente ou crie um item personalizado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="item-picker">Item</Label>
            {loadingLpu ? (
              <p className="text-sm text-muted-foreground">Carregando LPU...</p>
            ) : (
              <LpuItemPicker
                items={lpuItems}
                value={itemName}
                onSelect={(name) => {
                  setItemName(name)
                  setUnitPrice('')
                }}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="add-quantity">Quantidade</Label>
              <Input
                id="add-quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-unit-price">Valor Unit.</Label>
              <Input
                id="add-unit-price"
                value={isLpu ? formatInputDecimal(String(matchedLpu.unit_value)) : unitPrice}
                onChange={(e) => setUnitPrice(sanitizeDecimalInput(e.target.value))}
                onBlur={() => unitPrice && setUnitPrice(formatInputDecimal(unitPrice))}
                placeholder="0,00"
                inputMode="decimal"
                readOnly={isLpu}
                className={isLpu ? 'bg-muted/50 cursor-not-allowed' : ''}
              />
              {isLpu && <p className="text-xs text-muted-foreground">Preço definido pela LPU</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="add-description">Descrição (opcional)</Label>
            <Textarea
              id="add-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Descrição do item..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !canEdit}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
