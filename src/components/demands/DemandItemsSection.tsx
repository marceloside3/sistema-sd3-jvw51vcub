import { useEffect, useState } from 'react'
import { Package, Pencil, Plus, Trash2, Lock, ListChecks, Maximize2, Minimize2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { getDemandItems, deleteDemandItem } from '@/services/demands'
import { useToast } from '@/hooks/use-toast'
import { useCurrentUser } from '@/hooks/use-current-user'
import { logDemandAuditEntry } from '@/services/demand-audit'
import { ItemCostEditorDialog } from '@/components/demands/ItemCostEditorDialog'
import { AddItemDialog } from '@/components/demands/AddItemDialog'
import { AddFromLpuDialog } from '@/components/demands/AddFromLpuDialog'
import { formatCurrency, formatPercent, calculateFinancials, getMarginColor } from '@/lib/financial'

interface DemandItem {
  id: string
  item_name: string
  description: string | null
  quantity: number
  unit_price: number | null
  is_custom: boolean
  deadline: string | null
  delivery_location: string | null
  supplier_name: string | null
  unit_cost: number | null
  extra_cost: number | null
  honorarios_percentage: number | null
  total_cost: number | null
  cost_status: string
}

interface DemandItemsSectionProps {
  demandId: string
  clientId: string | null
  isLocked?: boolean
  isAdmin?: boolean
  onItemsChanged?: () => void
  isExpanded?: boolean
  onToggleExpand?: () => void
}

function isCostCompleted(item: DemandItem): boolean {
  return item.cost_status === 'completed' && !!item.supplier_name && item.unit_cost !== null
}

function MarginIndicator({ pct }: { pct: number }) {
  const dotColor = pct < 25 ? 'bg-red-500' : pct <= 40 ? 'bg-yellow-500' : 'bg-green-500'
  return <span className={`inline-block w-2 h-2 rounded-full ${dotColor} mr-1.5 shrink-0`} />
}

export function DemandItemsSection({
  demandId,
  clientId,
  isLocked = false,
  isAdmin = false,
  onItemsChanged,
  isExpanded = false,
  onToggleExpand,
}: DemandItemsSectionProps) {
  const { toast } = useToast()
  const { data: userCtx } = useCurrentUser()
  const canEdit = !isLocked || isAdmin || !!userCtx?.profile?.is_director
  const [items, setItems] = useState<DemandItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<DemandItem | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [lpuDialogOpen, setLpuDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DemandItem | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadItems() {
      setLoading(true)
      try {
        const data = await getDemandItems(demandId)
        if (!cancelled) setItems(data as DemandItem[])
      } catch {
        if (!cancelled)
          toast({ title: 'Erro ao carregar itens da demanda', variant: 'destructive' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadItems()
    return () => {
      cancelled = true
    }
  }, [demandId, toast])

  const itemFinancials = items.map((item) =>
    calculateFinancials({
      quantity: item.quantity,
      unitPrice: item.unit_price,
      unitCost: item.unit_cost,
      extraCost: item.extra_cost,
      honorariosPercentage: item.honorarios_percentage,
    }),
  )

  const grandTotal = itemFinancials.reduce((sum, f) => sum + f.totalRevenue, 0)
  const totalCostSum = itemFinancials.reduce((sum, f) => sum + f.totalCost, 0)
  const totalRevenueSum = itemFinancials.reduce((sum, f) => sum + f.totalRevenue, 0)
  const totalMarginR$ = itemFinancials.reduce((sum, f) => sum + f.marginR$, 0)
  const totalMarginPct = totalRevenueSum > 0 ? (totalMarginR$ / totalRevenueSum) * 100 : 0

  const handleEditClick = (item: DemandItem) => {
    setEditingItem(item)
    setDialogOpen(true)
  }

  const reloadItems = async () => {
    try {
      const data = await getDemandItems(demandId)
      setItems(data as DemandItem[])
    } catch {
      toast({ title: 'Erro ao recarregar itens', variant: 'destructive' })
    }
  }

  const handleSaved = () => {
    reloadItems()
    toast({ title: 'Custos atualizados com sucesso!' })
    onItemsChanged?.()
  }

  const handleAddSaved = () => {
    reloadItems()
    toast({ title: 'Item adicionado com sucesso!' })
    onItemsChanged?.()
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    try {
      if (userCtx?.user?.id) {
        await logDemandAuditEntry({
          demand_id: demandId,
          item_id: deleteTarget.id,
          user_id: userCtx.user.id,
          field_name: 'item_removed',
          old_value: deleteTarget.item_name,
        })
      }
      await deleteDemandItem(deleteTarget.id)
      await reloadItems()
      toast({ title: 'Item removido com sucesso!' })
      onItemsChanged?.()
    } catch {
      toast({ title: 'Erro ao remover item', variant: 'destructive' })
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="w-5 h-5 text-muted-foreground" />
            Itens da Demanda
          </CardTitle>
          <div className="flex items-center gap-2">
            {onToggleExpand && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={onToggleExpand}
                aria-label={isExpanded ? 'Recolher seção de itens' : 'Expandir seção de itens'}
                title={isExpanded ? 'Recolher seção de itens' : 'Expandir seção de itens'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            )}
            {clientId && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLpuDialogOpen(true)}
                disabled={!canEdit}
              >
                <ListChecks className="w-4 h-4 mr-1" />
                Adicionar da LPU
              </Button>
            )}
            <Button size="sm" onClick={() => setAddDialogOpen(true)} disabled={!canEdit}>
              <Plus className="w-4 h-4 mr-1" />
              Adicionar Item
            </Button>
            {onToggleExpand && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={onToggleExpand}
                title={isExpanded ? 'Retrair seção de itens' : 'Expandir seção de itens'}
                aria-label={isExpanded ? 'Retrair seção de itens' : 'Expandir seção de itens'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-3">
              Nenhum item encontrado para esta demanda.
            </p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {clientId && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setLpuDialogOpen(true)}
                  disabled={!canEdit}
                >
                  <ListChecks className="w-4 h-4 mr-1" />
                  Adicionar da LPU
                </Button>
              )}
              <Button size="sm" onClick={() => setAddDialogOpen(true)} disabled={!canEdit}>
                <Plus className="w-4 h-4 mr-1" />
                Adicionar Primeiro Item
              </Button>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="internal">
            <TabsList className="mb-3">
              <TabsTrigger value="internal">Visão Interna</TabsTrigger>
              <TabsTrigger value="external">Visão Orçamento</TabsTrigger>
            </TabsList>

            <TabsContent value="internal">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-center">Qtd.</TableHead>
                      <TableHead className="text-right">Valor Unit.</TableHead>
                      <TableHead className="text-right">Total Bruto</TableHead>
                      <TableHead className="text-right">Honorários (%)</TableHead>
                      <TableHead className="text-right">Total Geral</TableHead>
                      <TableHead className="text-right">Custo Unit.</TableHead>
                      <TableHead className="text-right">Custo Extra</TableHead>
                      <TableHead className="text-right">Custo Total</TableHead>
                      <TableHead className="text-right">Margem (R$)</TableHead>
                      <TableHead className="text-right">Margem (%)</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => {
                      const f = itemFinancials[idx]
                      const completed = isCostCompleted(item)
                      const marginColor = getMarginColor(f.marginPct)
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {item.item_name}
                              {item.is_custom && (
                                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                                  Personalizado
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatCurrency(item.unit_price)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm font-semibold">
                            {formatCurrency(f.grossTotal)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatPercent(item.honorarios_percentage)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm font-semibold">
                            {formatCurrency(f.totalRevenue)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatCurrency(item.unit_cost)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatCurrency(item.extra_cost)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatCurrency(f.totalCost)}
                          </TableCell>
                          <TableCell
                            className={`text-right font-mono text-sm font-semibold ${marginColor}`}
                          >
                            {formatCurrency(f.marginR$)}
                          </TableCell>
                          <TableCell
                            className={`text-right font-mono text-sm font-bold ${marginColor}`}
                          >
                            <span className="inline-flex items-center">
                              <MarginIndicator pct={f.marginPct} />
                              {formatPercent(f.marginPct)}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">
                            {item.supplier_name || <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-center">
                            {completed ? (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                Concluído
                              </Badge>
                            ) : (
                              <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                                Pendente
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              {canEdit ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleEditClick(item)}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => setDeleteTarget(item)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              ) : (
                                <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    <TableRow className="border-t-2 font-bold">
                      <TableCell colSpan={5} className="text-right">
                        Totais
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(totalRevenueSum)}
                      </TableCell>
                      <TableCell colSpan={2} />
                      <TableCell className="text-right font-mono">
                        {formatCurrency(totalCostSum)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono ${getMarginColor(totalMarginPct)}`}
                      >
                        {formatCurrency(totalMarginR$)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono ${getMarginColor(totalMarginPct)}`}
                      >
                        <span className="inline-flex items-center">
                          <MarginIndicator pct={totalMarginPct} />
                          {formatPercent(totalMarginPct)}
                        </span>
                      </TableCell>
                      <TableCell colSpan={3} />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="external">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-center">Qtd.</TableHead>
                      <TableHead className="text-right">Valor Unit.</TableHead>
                      <TableHead className="text-right">Honorários (%)</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => {
                      const f = itemFinancials[idx]
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.item_name}</TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatCurrency(item.unit_price)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatPercent(item.honorarios_percentage)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm font-semibold">
                            {formatCurrency(f.grossTotal)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    <TableRow className="border-t-2 font-bold">
                      <TableCell colSpan={4} className="text-right">
                        Total Geral
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(grandTotal)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>

      <ItemCostEditorDialog
        item={editingItem}
        demandId={demandId}
        isLocked={isLocked}
        isAdmin={isAdmin}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={handleSaved}
      />

      <AddItemDialog
        demandId={demandId}
        clientId={clientId}
        isLocked={isLocked}
        isAdmin={isAdmin}
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSaved={handleAddSaved}
      />

      <AddFromLpuDialog
        demandId={demandId}
        clientId={clientId}
        open={lpuDialogOpen}
        onOpenChange={setLpuDialogOpen}
        onSaved={handleAddSaved}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Item</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover "{deleteTarget?.item_name}"? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
