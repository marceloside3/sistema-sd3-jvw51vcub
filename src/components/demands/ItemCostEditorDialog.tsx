import { useState, useEffect, useRef, useCallback } from 'react'
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
  Sparkles,
} from 'lucide-react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { logDemandAuditBatch } from '@/services/demand-audit'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { SupplierSelect } from '@/components/suppliers/SupplierSelect'
import type { Supplier } from '@/services/suppliers'
import { SavingIndicator, type SaveStatus } from '@/components/demands/SavingIndicator'

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
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [quantity, setQuantity] = useState('')
  const { data: userCtx } = useCurrentUser()

  const isLpuItem = item ? !item.is_custom : false

  // Ref com os últimos dados salvos no backend para detecção exata de diff e prevenção de concorrência
  const lastSavedSnapshotRef = useRef<{
    quantity: number
    unit_price: number | null
    supplier_id: string | null
    supplier_name: string | null
    unit_cost: number | null
    extra_cost: number | null
    honorarios_percentage: number | null
  } | null>(null)

  const isInitialMountRef = useRef(true)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestSaveSeqRef = useRef<number>(0)

  useEffect(() => {
    if (open && item) {
      isInitialMountRef.current = true
      setSaveStatus('idle')

      const initialUnitPrice =
        item.unit_price !== null && item.unit_price !== 0
          ? formatInputDecimal(String(item.unit_price))
          : ''
      const initialSupplierId = item.supplier_id || null
      const initialSupplierName = item.supplier_name || ''
      const initialUnitCost =
        item.unit_cost !== null && item.unit_cost !== 0
          ? formatInputDecimal(String(item.unit_cost))
          : ''
      const initialExtraCost =
        item.extra_cost !== null && item.extra_cost !== 0
          ? formatInputDecimal(String(item.extra_cost))
          : ''
      const initialHonorariosPct =
        item.honorarios_percentage !== null && item.honorarios_percentage !== 0
          ? formatInputDecimal(String(item.honorarios_percentage))
          : ''
      const initialQuantity = String(item.quantity)

      setUnitPrice(initialUnitPrice)
      setSupplierId(initialSupplierId)
      setSupplierName(initialSupplierName)
      setUnitCost(initialUnitCost)
      setExtraCost(initialExtraCost)
      setHonorariosPct(initialHonorariosPct)
      setQuantity(initialQuantity)

      lastSavedSnapshotRef.current = {
        quantity: item.quantity,
        unit_price: item.unit_price,
        supplier_id: initialSupplierId,
        supplier_name: initialSupplierName || null,
        unit_cost: item.unit_cost,
        extra_cost: item.extra_cost ?? 0,
        honorarios_percentage: item.honorarios_percentage ?? 0,
      }

      // Após popular o form inicial, liberar para debounce
      const unlockTimer = setTimeout(() => {
        isInitialMountRef.current = false
      }, 150)
      return () => clearTimeout(unlockTimer)
    } else {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      setSaveStatus('idle')
    }
  }, [open, item?.id])

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

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

  // Função core de persistência que suporta tanto o auto-save com debounce quanto o botão manual
  const persistChanges = useCallback(
    async (isManualClose = false) => {
      if (!item || !canEdit) return

      const currentSnapshot = {
        quantity: parsedQuantity,
        unit_price: parsedUnitPrice > 0 ? parsedUnitPrice : null,
        supplier_id: supplierId,
        supplier_name: supplierName.trim() || null,
        unit_cost: parsedUnitCost > 0 ? parsedUnitCost : null,
        extra_cost: parsedExtraCost > 0 ? parsedExtraCost : 0,
        honorarios_percentage: parsedHonorariosPct > 0 ? parsedHonorariosPct : 0,
      }

      const prev = lastSavedSnapshotRef.current

      // Verifica se houve mudança real em relação ao último salvo
      const hasChanged =
        !prev ||
        prev.quantity !== currentSnapshot.quantity ||
        (prev.unit_price ?? 0) !== (currentSnapshot.unit_price ?? 0) ||
        (prev.supplier_id ?? '') !== (currentSnapshot.supplier_id ?? '') ||
        (prev.supplier_name ?? '') !== (currentSnapshot.supplier_name ?? '') ||
        (prev.unit_cost ?? 0) !== (currentSnapshot.unit_cost ?? 0) ||
        (prev.extra_cost ?? 0) !== (currentSnapshot.extra_cost ?? 0) ||
        (prev.honorarios_percentage ?? 0) !== (currentSnapshot.honorarios_percentage ?? 0)

      if (!hasChanged) {
        if (isManualClose) {
          onOpenChange(false)
        }
        return
      }

      const currentSeq = ++latestSaveSeqRef.current
      setSaveStatus('saving')
      if (isManualClose) setSaving(true)

      try {
        const { updateDemandItemCosts } = await import('@/services/demands')
        await updateDemandItemCosts(item.id, {
          quantity: currentSnapshot.quantity,
          unit_price: currentSnapshot.unit_price,
          supplier_id: currentSnapshot.supplier_id,
          supplier_name: currentSnapshot.supplier_name,
          unit_cost: currentSnapshot.unit_cost,
          extra_cost: currentSnapshot.extra_cost,
          honorarios_percentage: currentSnapshot.honorarios_percentage,
          total_cost: calc.totalCost,
          cost_status: isComplete ? 'completed' : 'pending',
        })

        // Concorrência: se disparou outro save mais recente no meio do caminho, descarta estado deste
        if (currentSeq !== latestSaveSeqRef.current) {
          return
        }

        // Registrar auditoria para cada campo alterado
        if (userCtx?.id && prev) {
          const changes: { field: string; old: string; new: string }[] = []
          if ((prev.unit_price ?? 0) !== (currentSnapshot.unit_price ?? 0)) {
            changes.push({
              field: 'unit_price',
              old: String(prev.unit_price ?? 0),
              new: String(currentSnapshot.unit_price ?? 0),
            })
          }
          if ((prev.supplier_id || '') !== (currentSnapshot.supplier_id || '')) {
            changes.push({
              field: 'supplier_id',
              old: prev.supplier_id || '',
              new: currentSnapshot.supplier_id || '',
            })
          }
          if ((prev.supplier_name || '') !== (currentSnapshot.supplier_name || '')) {
            changes.push({
              field: 'supplier_name',
              old: prev.supplier_name || '',
              new: currentSnapshot.supplier_name || '',
            })
          }
          if ((prev.unit_cost ?? 0) !== (currentSnapshot.unit_cost ?? 0)) {
            changes.push({
              field: 'unit_cost',
              old: String(prev.unit_cost ?? 0),
              new: String(currentSnapshot.unit_cost ?? 0),
            })
          }
          if ((prev.extra_cost ?? 0) !== (currentSnapshot.extra_cost ?? 0)) {
            changes.push({
              field: 'extra_cost',
              old: String(prev.extra_cost ?? 0),
              new: String(currentSnapshot.extra_cost ?? 0),
            })
          }
          if ((prev.honorarios_percentage ?? 0) !== (currentSnapshot.honorarios_percentage ?? 0)) {
            changes.push({
              field: 'honorarios_percentage',
              old: String(prev.honorarios_percentage ?? 0),
              new: String(currentSnapshot.honorarios_percentage ?? 0),
            })
          }
          if (prev.quantity !== currentSnapshot.quantity) {
            changes.push({
              field: 'quantity',
              old: String(prev.quantity),
              new: String(currentSnapshot.quantity),
            })
          }

          if (changes.length > 0) {
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
        }

        lastSavedSnapshotRef.current = currentSnapshot
        setLastSavedAt(new Date())
        setSaveStatus('saved')
        onSaved()

        if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
        savedTimerRef.current = setTimeout(() => {
          setSaveStatus((curr) => (curr === 'saved' ? 'idle' : curr))
        }, 2500)

        if (isManualClose) {
          onOpenChange(false)
        }
      } catch (err) {
        console.error('Erro no autosave do item:', err)
        if (currentSeq === latestSaveSeqRef.current) {
          setSaveStatus('error')
        }
      } finally {
        if (isManualClose) setSaving(false)
      }
    },
    [
      item,
      canEdit,
      parsedQuantity,
      parsedUnitPrice,
      supplierId,
      supplierName,
      parsedUnitCost,
      parsedExtraCost,
      parsedHonorariosPct,
      calc.totalCost,
      isComplete,
      userCtx?.id,
      demandId,
      onSaved,
      onOpenChange,
    ],
  )

  // Disparador do Debounce Autosave (700ms após última digitação/alteração)
  useEffect(() => {
    if (!open || isInitialMountRef.current || !canEdit || !item) {
      return
    }

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)

    // Checa se há algo diferente do snapshot
    const prev = lastSavedSnapshotRef.current
    const currentPrice = parsedUnitPrice > 0 ? parsedUnitPrice : null
    const currentCost = parsedUnitCost > 0 ? parsedUnitCost : null
    const currentExtra = parsedExtraCost > 0 ? parsedExtraCost : 0
    const currentHon = parsedHonorariosPct > 0 ? parsedHonorariosPct : 0
    const currentSuppName = supplierName.trim() || null

    const hasChanged =
      !prev ||
      prev.quantity !== parsedQuantity ||
      (prev.unit_price ?? 0) !== (currentPrice ?? 0) ||
      (prev.supplier_id ?? '') !== (supplierId ?? '') ||
      (prev.supplier_name ?? '') !== (currentSuppName ?? '') ||
      (prev.unit_cost ?? 0) !== (currentCost ?? 0) ||
      (prev.extra_cost ?? 0) !== currentExtra ||
      (prev.honorarios_percentage ?? 0) !== currentHon

    if (!hasChanged) {
      return
    }

    debounceTimerRef.current = setTimeout(() => {
      persistChanges(false)
    }, 700)

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [
    open,
    canEdit,
    item,
    parsedQuantity,
    parsedUnitPrice,
    supplierId,
    supplierName,
    parsedUnitCost,
    parsedExtraCost,
    parsedHonorariosPct,
    persistChanges,
  ])

  const handleManualSave = async () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    await persistChanges(true)
  }

  const marginColor = getMarginColor(calc.marginPct)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pr-6">
            <DialogTitle className="text-lg flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              <span>Modo Foco do Item</span>
            </DialogTitle>

            <div className="flex items-center gap-2 flex-wrap">
              <SavingIndicator
                status={saveStatus}
                lastSavedAt={lastSavedAt}
                onRetry={() => persistChanges(false)}
              />

              {isComplete ? (
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 text-xs font-semibold">
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
          </div>
          <DialogDescription className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>
              Edição com <strong>autosalvamento automático</strong>. As alterações são gravadas
              imediatamente no banco ao parar de digitar.
            </span>
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

        <DialogFooter className="gap-2 sm:gap-0 border-t pt-3 flex items-center justify-between">
          <div className="text-xs text-muted-foreground hidden sm:flex items-center gap-1.5">
            <SavingIndicator
              status={saveStatus}
              lastSavedAt={lastSavedAt}
              onRetry={() => persistChanges(false)}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Fechar
            </Button>
            <Button onClick={handleManualSave} disabled={saving || !canEdit} className="gap-1.5">
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Salvar e Concluir
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
