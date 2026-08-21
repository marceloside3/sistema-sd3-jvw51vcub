import { useState, useEffect, useRef } from 'react'
import { Loader2, Plus, Zap, Info, DollarSign, Package, Layers, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
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
import {
  formatInputDecimal,
  sanitizeDecimalInput,
  parseNumber,
  formatCurrency,
} from '@/lib/financial'

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
  const [keepOpenAfterSave, setKeepOpenAfterSave] = useState(false)
  const [addedCountSession, setAddedCountSession] = useState(0)
  const firstInputRef = useRef<HTMLInputElement>(null)

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
      setAddedCountSession(0)
    }
  }, [open])

  const parsedQty = Math.max(1, parseNumber(quantity) || 1)
  const matchedLpu = itemName ? findMatchingLpuItem(lpuItems, itemName, parsedQty) : null
  const isLpu = !!matchedLpu
  const effectiveUnitPrice = isLpu ? matchedLpu.unit_value : parseNumber(unitPrice)
  const estimatedSubtotal = parsedQty * (effectiveUnitPrice || 0)

  const handleSave = async (quickSequence = false) => {
    if (!itemName.trim()) {
      toast({
        title: 'Nome do item obrigatório',
        description: 'Informe o nome do item ou selecione uma opção da LPU.',
        variant: 'destructive',
      })
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
      setAddedCountSession((c) => c + 1)

      if (quickSequence || keepOpenAfterSave) {
        toast({
          title: 'Item cadastrado!',
          description: `"${itemName.trim()}" salvo. Pronto para adicionar o próximo item.`,
        })
        // Limpa para o próximo item
        setItemName('')
        setQuantity('1')
        setDescription('')
        setUnitPrice('')
      } else {
        toast({
          title: 'Item adicionado com sucesso!',
          description: `"${itemName.trim()}" foi incluído na demanda.`,
        })
        onOpenChange(false)
      }
    } catch {
      toast({ title: 'Erro ao adicionar item', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Package className="w-5 h-5 text-primary" />
              Adicionar Item à Demanda
            </DialogTitle>
            {addedCountSession > 0 && (
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary border-primary/20 text-xs"
              >
                <Sparkles className="w-3 h-3 mr-1" />
                {addedCountSession} {addedCountSession === 1 ? 'adicionado' : 'adicionados'} nesta
                sessão
              </Badge>
            )}
          </div>
          <DialogDescription className="text-xs">
            Preencha os dados guiados para produção. Você pode escolher um item da tabela LPU do
            cliente ou criar um item personalizado sob demanda.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* GRUPO 1: Identificação do Item */}
          <div className="p-3.5 rounded-lg border bg-muted/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                1. Identificação do Item
              </span>
              <span className="text-[11px] text-destructive font-medium">* Campo obrigatório</span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="item-picker" className="text-xs font-medium">
                Nome ou Código do Item <span className="text-destructive">*</span>
              </Label>
              {loadingLpu ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Carregando itens cadastrados da LPU...
                </div>
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
              <p className="text-[11px] text-muted-foreground">
                Exemplos:{' '}
                <em>Cenografia Principal, Backdrop 3x2m, Painel LED P3, Camiseta Promocional</em>.
              </p>
            </div>

            <div className="space-y-1.5 pt-1">
              <Label
                htmlFor="add-description"
                className="text-xs font-medium flex items-center justify-between"
              >
                <span>Especificações / Detalhes de Produção</span>
                <span className="text-[11px] font-normal text-muted-foreground">Opcional</span>
              </Label>
              <Textarea
                id="add-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Ex: Medidas 300x200cm, lona fosca 440g com acabamento em ilhós a cada 20cm, cor Pantone 286C..."
                className="text-xs resize-none"
              />
            </div>
          </div>

          {/* GRUPO 2: Quantidades e Valores Estimados */}
          <div className="p-3.5 rounded-lg border bg-muted/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-primary" />
                2. Quantidades e Valor de Venda
              </span>
              {isLpu ? (
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 text-[10px]">
                  Preço fixado pela LPU
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">
                  Item Personalizado
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="add-quantity" className="text-xs font-medium">
                  Quantidade <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="add-quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Ex: 1, 10, 100"
                  className="h-9 text-sm"
                />
                <span className="text-[10px] text-muted-foreground">
                  Unidades ou peças estimadas
                </span>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="add-unit-price"
                  className="text-xs font-medium flex items-center justify-between"
                >
                  <span>Valor Unitário de Venda</span>
                  <span className="text-[11px] font-normal text-muted-foreground">
                    {isLpu ? 'Automático' : 'Opcional'}
                  </span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">
                    R$
                  </span>
                  <Input
                    id="add-unit-price"
                    value={isLpu ? formatInputDecimal(String(matchedLpu.unit_value)) : unitPrice}
                    onChange={(e) => setUnitPrice(sanitizeDecimalInput(e.target.value))}
                    onBlur={() => unitPrice && setUnitPrice(formatInputDecimal(unitPrice))}
                    placeholder="0,00"
                    inputMode="decimal"
                    readOnly={isLpu}
                    className={`h-9 pl-9 text-sm font-mono ${
                      isLpu ? 'bg-muted cursor-not-allowed text-foreground font-semibold' : ''
                    }`}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {isLpu ? 'Tabela contratual do cliente' : 'Ex: 150,00 (pode ser definido depois)'}
                </span>
              </div>
            </div>

            {/* Pré-visualização do Subtotal Estimado */}
            <div className="flex items-center justify-between pt-2 border-t text-xs">
              <span className="text-muted-foreground font-medium">
                Subtotal Estimado (Qtd × Venda):
              </span>
              <span className="font-mono font-semibold text-sm text-foreground">
                {formatCurrency(estimatedSubtotal)}
              </span>
            </div>
          </div>

          {/* Opção de sequência rápida */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-primary/5 border-primary/20">
            <div className="space-y-0.5">
              <Label
                htmlFor="keep-open-toggle"
                className="text-xs font-medium cursor-pointer flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-primary" />
                Modo Adição Rápida em Sequência
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Ao salvar o item atual, limpa o formulário e mantém a janela aberta para o próximo.
              </p>
            </div>
            <Switch
              id="keep-open-toggle"
              checked={keepOpenAfterSave}
              onCheckedChange={setKeepOpenAfterSave}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            {addedCountSession > 0 ? 'Concluir' : 'Cancelar'}
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {!keepOpenAfterSave && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleSave(true)}
                disabled={saving || !canEdit || !itemName.trim()}
                className="w-full sm:w-auto text-xs"
                title="Salva este item e já prepara o formulário para cadastrar o próximo"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Salvar e Adicionar Outro
              </Button>
            )}

            <Button
              onClick={() => handleSave(false)}
              disabled={saving || !canEdit || !itemName.trim()}
              className="w-full sm:w-auto text-xs bg-primary"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {keepOpenAfterSave ? 'Salvar Item' : 'Adicionar Item'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
