import { useState, useEffect } from 'react'
import {
  Loader2,
  Lock,
  Building2,
  Receipt,
  Calculator,
  Percent,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { logDemandAuditBatch } from '@/services/demand-audit'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { SupplierSelect } from '@/components/suppliers/SupplierSelect'
import type { Supplier } from '@/services/suppliers'

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
  supplier_id: string | null
  unit_cost: number | null
  extra_cost: number | null
  honorarios_percentage: number | null
  is_custom: boolean
}

interface ItemCostEditorDialogProps {
  item: DemandItemCostData | null
  demandId: string
  isLocked?: boolean
  isAdmin?: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function ItemCostEditorDialog({
  item,
  demandId,
  isLocked = false,
  isAdmin = false,
  open,
  onOpenChange,
  onSaved,
}: ItemCostEditorDialogProps) {
  const canEdit = !isLocked || isAdmin
  const [unitPrice, setUnitPrice] = useState('')
  const [supplierId, setSupplierId] = useState<string | null>(null)
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
      setSupplierId(item.supplier_id || null)
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

  const parsedQuantity = Math.max(1, parseInt(quantity) || 1)
  const calc = calculateFinancials({
    quantity: parsedQuantity,
    unitPrice: parsedUnitPrice > 0 ? parsedUnitPrice : null,
    unitCost: parsedUnitCost > 0 ? parsedUnitCost : null,
    extraCost: parsedExtraCost,
    honorariosPercentage: parsedHonorariosPct,
  })

  const isComplete = Boolean(supplierName.trim() && parsedUnitCost > 0)

  const handleSave = async () => {
    if (!item) return
    setSaving(true)
    try {
      const { updateDemandItemCosts } = await import('@/services/demands')
      await updateDemandItemCosts(item.id, {
        quantity: parsedQuantity,
        unit_price: parsedUnitPrice > 0 ? parsedUnitPrice : null,
        supplier_id: supplierId,
        supplier_name: supplierName.trim() || null,
        unit_cost: parsedUnitCost > 0 ? parsedUnitCost : null,
        extra_cost: parsedExtraCost,
        honorarios_percentage: parsedHonorariosPct,
        total_cost: calc.totalCost,
        cost_status: isComplete ? 'completed' : 'pending',
      })

      if (userCtx?.id) {
        const changes: { field: string; old: string; new: string }[] = []
        if (String(item.unit_price ?? 0) !== String(parsedUnitPrice > 0 ? parsedUnitPrice : 0))
          changes.push({
            field: 'unit_price',
            old: String(item.unit_price ?? 0),
            new: String(parsedUnitPrice > 0 ? parsedUnitPrice : 0),
          })
        if ((item.supplier_id || '') !== supplierId)
          changes.push({
            field: 'supplier_id',
            old: item.supplier_id || '',
            new: supplierId,
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

        await logDemandAuditBatch(
          changes.map((c) => ({
            demand_id: demandId,
            item_id: item.id,
            user_id: userCtx.id,
            field_name: c.field,
            old_value: c.old,
            new_value: c.new,
          })),
        )
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
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-lg flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              Preenchimento de Custos e Fornecedor
            </DialogTitle>
            {isComplete ? (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 border-green-200 text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Custos Completos
              </Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
                Pendente Fornecedor/Custo
              </Badge>
            )}
          </div>
          <DialogDescription className="text-xs">
            Guia de produção: defina o fornecedor selecionado, custos reais de execução e percentual
            de honorários da Side3.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* BLOCO 1: Item & Quantidade & Venda */}
          <div className="p-3.5 rounded-lg border bg-muted/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-primary" />
                1. Item & Valor de Venda (Cliente)
              </span>
              {isLpuItem ? (
                <Badge
                  variant="outline"
                  className="text-[10px] bg-blue-50 text-blue-700 border-blue-200"
                >
                  <Lock className="w-2.5 h-2.5 mr-1" />
                  Preço Fixo LPU
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">
                  Preço Personalizado
                </Badge>
              )}
            </div>

            <div className="bg-background p-2.5 rounded border">
              <span className="text-[11px] text-muted-foreground uppercase font-semibold block">
                Nome do Item
              </span>
              <p className="font-semibold text-sm text-foreground">{item?.item_name}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="item-quantity" className="text-xs font-medium">
                  Quantidade Produzida <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="item-quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="h-9 text-sm"
                />
                <span className="text-[10px] text-muted-foreground">Ex: 1, 5, 20 peças</span>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="unit-price"
                  className="text-xs font-medium flex items-center justify-between"
                >
                  <span>Valor Unit. de Venda</span>
                  {isLpuItem && (
                    <span className="text-[10px] text-muted-foreground font-normal">Fixo LPU</span>
                  )}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">
                    R$
                  </span>
                  <Input
                    id="unit-price"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(sanitizeDecimalInput(e.target.value))}
                    onBlur={() => unitPrice && setUnitPrice(formatInputDecimal(unitPrice))}
                    placeholder="0,00"
                    inputMode="decimal"
                    readOnly={isLpuItem}
                    className={`h-9 pl-9 text-sm font-mono ${
                      isLpuItem ? 'bg-muted cursor-not-allowed font-semibold' : ''
                    }`}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">Preço cobrado na proposta</span>
              </div>
            </div>
          </div>

          {/* BLOCO 2: Fornecedor e Custos de Produção (Destaque para Produção) */}
          <div className="p-3.5 rounded-lg border-2 border-primary/20 bg-primary/[0.02] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                2. Fornecedor & Custos Diretos
              </span>
              <span className="text-[11px] text-primary/80 font-medium">
                Essencial para Financeiro
              </span>
            </div>

            {/* Destaque Seleção de Fornecedor */}
            <div className="space-y-1.5 p-3 rounded-md bg-background border shadow-xs">
              <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>
                  Fornecedor / Prestador de Serviço <span className="text-destructive">*</span>
                </span>
                {supplierName && (
                  <Badge variant="secondary" className="text-[10px] font-normal">
                    Vinculado
                  </Badge>
                )}
              </Label>
              <SupplierSelect
                value={supplierId}
                supplierName={supplierName}
                onChange={(supplier: Supplier | null) => {
                  if (supplier) {
                    setSupplierId(supplier.id)
                    setSupplierName(supplier.name)
                  } else {
                    setSupplierId(null)
                    setSupplierName('')
                  }
                }}
                disabled={!canEdit}
              />
              <p className="text-[11px] text-muted-foreground">
                Digite o nome ou CNPJ/CPF da gráfica, cenografia, locadora ou fornecedor cadastrado.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="unit-cost" className="text-xs font-medium">
                  Custo Unitário (R$) <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">
                    R$
                  </span>
                  <Input
                    id="unit-cost"
                    value={unitCost}
                    onChange={(e) => setUnitCost(sanitizeDecimalInput(e.target.value))}
                    onBlur={() => unitCost && setUnitCost(formatInputDecimal(unitCost))}
                    placeholder="0,00"
                    inputMode="decimal"
                    className="h-9 pl-9 text-sm font-mono font-medium"
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">
                  Custo por unidade do fornecedor
                </span>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="extra-cost"
                  className="text-xs font-medium flex items-center justify-between"
                >
                  <span>Custos Extras / Frete</span>
                  <span className="text-[10px] text-muted-foreground">Opcional</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">
                    R$
                  </span>
                  <Input
                    id="extra-cost"
                    value={extraCost}
                    onChange={(e) => setExtraCost(sanitizeDecimalInput(e.target.value))}
                    onBlur={() => extraCost && setExtraCost(formatInputDecimal(extraCost))}
                    placeholder="0,00"
                    inputMode="decimal"
                    className="h-9 pl-9 text-sm font-mono"
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">
                  Frete, montagem, taxas extras
                </span>
              </div>
            </div>
          </div>

          {/* BLOCO 3: Honorários e Taxa de Agência */}
          <div className="p-3.5 rounded-lg border bg-muted/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-primary" />
                3. Honorários / BV (%)
              </span>
              <span className="text-[11px] text-muted-foreground">Margem de agenciamento</span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="honorarios-pct" className="text-xs font-medium">
                Percentual de Honorários sobre a Venda Bruta
              </Label>
              <div className="relative max-w-[200px]">
                <Input
                  id="honorarios-pct"
                  value={honorariosPct}
                  onChange={(e) => setHonorariosPct(sanitizeDecimalInput(e.target.value))}
                  onBlur={() =>
                    honorariosPct && setHonorariosPct(formatInputDecimal(honorariosPct))
                  }
                  placeholder="0,00"
                  inputMode="decimal"
                  className="h-9 pr-8 text-sm font-mono"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">
                  %
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                Ex: 10,00% (acrescenta honorários sobre a receita bruta)
              </span>
            </div>
          </div>

          {/* BLOCO 4: Simulação Financeira em Tempo Real */}
          <div className="p-3.5 rounded-lg border bg-card shadow-xs space-y-2.5">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
                Resultado Financeiro do Item
              </span>
              <span className={`text-xs font-bold font-mono ${marginColor}`}>
                Margem: {formatPercent(calc.marginPct)}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded bg-muted/40">
                <span className="text-[10px] text-muted-foreground block">Receita Total</span>
                <span className="font-mono font-semibold text-foreground">
                  {formatCurrency(calc.totalRevenue)}
                </span>
              </div>
              <div className="p-2 rounded bg-muted/40">
                <span className="text-[10px] text-muted-foreground block">Custo Total</span>
                <span className="font-mono font-semibold text-foreground">
                  {formatCurrency(calc.totalCost)}
                </span>
              </div>
              <div className="p-2 rounded bg-muted/40">
                <span className="text-[10px] text-muted-foreground block">Honorários (R$)</span>
                <span className="font-mono font-semibold text-foreground">
                  {formatCurrency(calc.feeAmount)}
                </span>
              </div>
              <div className="p-2 rounded bg-muted/40">
                <span className="text-[10px] text-muted-foreground block">Lucro / Margem R$</span>
                <span className={`font-mono font-bold ${marginColor}`}>
                  {formatCurrency(calc.marginR$)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !canEdit}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar Custos do Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
