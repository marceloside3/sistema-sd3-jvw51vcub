import { useState, useEffect } from 'react'
import { Loader2, Lock } from 'lucide-react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { logDemandAuditEntry } from '@/services/demand-audit'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  formatCurrency,
  formatPercent,
  parseNumber,
  formatInputDecimal,
  calculateFinancials,
  getMarginColor,
  sanitizeDecimalInput,
} from '@/lib/financial'

interface DemandItemCostData {
  id: string
  item_name: string
  quantity: number
  unit_price: number | null
  supplier_name: string | null
  unit_cost: number | null
  extra_cost: number | null
  honorarios_percentage: number | null
  is_custom: boolean
}

interface ItemCostEditorDialogProps {
  item: DemandItemCostData | null
  demandId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function ItemCostEditorDialog({
  item,
  demandId,
  open,
  onOpenChange,
  onSaved,
}: ItemCostEditorDialogProps) {
  const [unitPrice, setUnitPrice] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [extraCost, setExtraCost] = useState('')
  const [honorariosPct, setHonorariosPct] = useState('')
  const [saving, setSaving] = useState(false)
  const [quantity, setQuantity] = useState('')
  const { data: userCtx } = useCurrentUser()

  const isLpuItem = item ? !item.is_custom : false

  useEffect(() => {
    if (item) {
      setUnitPrice(
        item.unit_price !== null && item.unit_price !== 0
          ? formatInputDecimal(String(item.unit_price))
          : '',
      )
      setSupplierName(item.supplier_name || '')
      setUnitCost(
        item.unit_cost !== null && item.unit_cost !== 0
          ? formatInputDecimal(String(item.unit_cost))
          : '',
      )
      setExtraCost(
        item.extra_cost !== null && item.extra_cost !== 0
          ? formatInputDecimal(String(item.extra_cost))
          : '',
      )
      setHonorariosPct(
        item.honorarios_percentage !== null && item.honorarios_percentage !== 0
          ? formatInputDecimal(String(item.honorarios_percentage))
          : '',
      )
      setQuantity(String(item.quantity))
    }
  }, [item])

  const parsedUnitPrice = parseNumber(unitPrice)
  const parsedUnitCost = parseNumber(unitCost)
  const parsedExtraCost = parseNumber(extraCost)
  const parsedHonorariosPct = parseNumber(honorariosPct)

  const parsedQuantity = parseInt(quantity) || 0
  const calc = calculateFinancials({
    quantity: parsedQuantity,
    unitPrice: parsedUnitPrice > 0 ? parsedUnitPrice : null,
    unitCost: parsedUnitCost > 0 ? parsedUnitCost : null,
    extraCost: parsedExtraCost,
    honorariosPercentage: parsedHonorariosPct,
  })

  const handleSave = async () => {
    if (!item) return
    setSaving(true)
    try {
      const { updateDemandItemCosts } = await import('@/services/demands')
      await updateDemandItemCosts(item.id, {
        quantity: parsedQuantity,
        unit_price: parsedUnitPrice > 0 ? parsedUnitPrice : null,
        supplier_name: supplierName.trim() || null,
        unit_cost: parsedUnitCost > 0 ? parsedUnitCost : null,
        extra_cost: parsedExtraCost,
        honorarios_percentage: parsedHonorariosPct,
        total_cost: calc.totalCost,
        cost_status: supplierName.trim() && parsedUnitCost > 0 ? 'completed' : 'pending',
      })

      if (userCtx?.user?.id) {
        const changes: { field: string; old: string; new: string }[] = []
        if (String(item.unit_price ?? 0) !== String(parsedUnitPrice > 0 ? parsedUnitPrice : 0))
          changes.push({
            field: 'unit_price',
            old: String(item.unit_price ?? 0),
            new: String(parsedUnitPrice > 0 ? parsedUnitPrice : 0),
          })
        if ((item.supplier_name || '') !== supplierName.trim())
          changes.push({
            field: 'supplier_name',
            old: item.supplier_name || '',
            new: supplierName.trim(),
          })
        if (String(item.unit_cost ?? 0) !== String(parsedUnitCost > 0 ? parsedUnitCost : 0))
          changes.push({
            field: 'unit_cost',
            old: String(item.unit_cost ?? 0),
            new: String(parsedUnitCost > 0 ? parsedUnitCost : 0),
          })
        if (String(item.extra_cost ?? 0) !== String(parsedExtraCost))
          changes.push({
            field: 'extra_cost',
            old: String(item.extra_cost ?? 0),
            new: String(parsedExtraCost),
          })
        if (String(item.honorarios_percentage ?? 0) !== String(parsedHonorariosPct))
          changes.push({
            field: 'honorarios_percentage',
            old: String(item.honorarios_percentage ?? 0),
            new: String(parsedHonorariosPct),
          })
        if (String(item.quantity) !== String(parsedQuantity))
          changes.push({
            field: 'quantity',
            old: String(item.quantity),
            new: String(parsedQuantity),
          })

        for (const c of changes) {
          await logDemandAuditEntry({
            demand_id: demandId,
            item_id: item.id,
            user_id: userCtx.user.id,
            field_name: c.field,
            old_value: c.old,
            new_value: c.new,
          })
        }
      }

      onSaved()
      onOpenChange(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const marginColor = getMarginColor(calc.marginPct)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Custos do Item</DialogTitle>
          <DialogDescription>
            Informe o valor de venda, dados do fornecedor, custos e percentual de honorários para
            este item.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Item</Label>
              <p className="text-sm font-medium">{item?.item_name}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-quantity">Quantidade</Label>
              <Input
                id="item-quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="unit-price">Valor Unit. de Venda</Label>
              {isLpuItem && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Lock className="w-3 h-3" />
                  Preço fixo LPU
                </span>
              )}
            </div>
            <Input
              id="unit-price"
              value={unitPrice}
              onChange={(e) => setUnitPrice(sanitizeDecimalInput(e.target.value))}
              onBlur={() => unitPrice && setUnitPrice(formatInputDecimal(unitPrice))}
              placeholder="0,00"
              inputMode="decimal"
              readOnly={isLpuItem}
              className={isLpuItem ? 'bg-muted/50 cursor-not-allowed' : ''}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier-name">Nome do Fornecedor</Label>
            <Input
              id="supplier-name"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="Digite o nome do fornecedor"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit-cost">Custo Unitário</Label>
            <Input
              id="unit-cost"
              value={unitCost}
              onChange={(e) => setUnitCost(sanitizeDecimalInput(e.target.value))}
              onBlur={() => unitCost && setUnitCost(formatInputDecimal(unitCost))}
              placeholder="0,00"
              inputMode="decimal"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="extra-cost">Custo Extra</Label>
            <Input
              id="extra-cost"
              value={extraCost}
              onChange={(e) => setExtraCost(sanitizeDecimalInput(e.target.value))}
              onBlur={() => extraCost && setExtraCost(formatInputDecimal(extraCost))}
              placeholder="0,00"
              inputMode="decimal"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="honorarios-pct">Honorários (%)</Label>
            <Input
              id="honorarios-pct"
              value={honorariosPct}
              onChange={(e) => setHonorariosPct(sanitizeDecimalInput(e.target.value))}
              onBlur={() => honorariosPct && setHonorariosPct(formatInputDecimal(honorariosPct))}
              placeholder="0,00"
              inputMode="decimal"
            />
          </div>

          <div className="space-y-2 rounded-lg bg-muted/50 px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Bruto (Qtd × Venda)</span>
              <span className="font-mono font-medium">{formatCurrency(calc.grossTotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Honorários (sobre Bruto)</span>
              <span className="font-mono font-medium">{formatCurrency(calc.feeAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Geral (Bruto + Honorários)</span>
              <span className="font-mono font-medium">{formatCurrency(calc.totalRevenue)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Custo Total (Qtd × Custo + Extra)</span>
              <span className="font-mono font-medium">{formatCurrency(calc.totalCost)}</span>
            </div>
            <div className="flex items-center justify-between border-t pt-2 mt-2">
              <span className="text-sm font-semibold">Margem (R$) (Total Geral - Custos)</span>
              <span className={`font-mono font-bold ${marginColor}`}>
                {formatCurrency(calc.marginR$)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Margem (%) (sobre Total Geral)</span>
              <span className={`font-mono font-bold text-lg ${marginColor}`}>
                {formatPercent(calc.marginPct)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
