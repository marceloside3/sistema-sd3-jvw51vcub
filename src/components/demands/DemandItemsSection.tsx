import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Package,
  Pencil,
  Plus,
  Trash2,
  Lock,
  ListChecks,
  Maximize2,
  Minimize2,
  Send,
  CheckCircle2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
  Sparkles,
  HelpCircle,
  FileSpreadsheet,
  TrendingUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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
import { getFinanceRequestsByDemand } from '@/services/finance-requests'
import { SendToFinanceDialog } from '@/components/demands/SendToFinanceDialog'
import { useToast } from '@/hooks/use-toast'
import { useCurrentUser } from '@/hooks/use-current-user'
import { logDemandAuditBatch } from '@/services/demand-audit'
import { ItemCostEditorDialog } from '@/components/demands/ItemCostEditorDialog'
import { AddItemDialog } from '@/components/demands/AddItemDialog'
import { AddFromLpuDialog } from '@/components/demands/AddFromLpuDialog'
import { SavingIndicator, type SaveStatus } from '@/components/demands/SavingIndicator'
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
  supplier_id: string | null
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

type SortField =
  | 'item_name'
  | 'quantity'
  | 'unit_price'
  | 'totalRevenue'
  | 'unit_cost'
  | 'totalCost'
  | 'marginR$'
  | 'marginPct'
  | 'supplier_name'
  | 'cost_status'

type SortDirection = 'asc' | 'desc'

function isCostCompleted(item: DemandItem): boolean {
  return item.cost_status === 'completed' && !!item.supplier_name && item.unit_cost !== null
}

function MarginIndicator({ pct }: { pct: number }) {
  const dotColor = pct < 25 ? 'bg-red-500' : pct <= 40 ? 'bg-amber-500' : 'bg-emerald-500'
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
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [retryAction, setRetryAction] = useState<(() => void) | null>(null)
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [financeRequestIds, setFinanceRequestIds] = useState<Set<string>>(new Set())
  const [financeDialogOpen, setFinanceDialogOpen] = useState(false)
  const [financeTarget, setFinanceTarget] = useState<DemandItem | null>(null)

  // Ordenação
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  useEffect(() => {
    let cancelled = false
    async function loadItems() {
      setLoading(true)
      try {
        const [data, frData] = await Promise.all([
          getDemandItems(demandId),
          getFinanceRequestsByDemand(demandId),
        ])
        if (!cancelled) {
          setItems(data as DemandItem[])
          setFinanceRequestIds(new Set(frData.map((fr) => fr.demand_item_id)))
        }
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

  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)
    }
  }, [])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else {
        setSortField(null)
        setSortDirection('asc')
      }
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Mapeamento enriquecido com cálculos financeiros
  const itemsWithFinancials = useMemo(() => {
    return items.map((item) => {
      const financial = calculateFinancials({
        quantity: item.quantity,
        unitPrice: item.unit_price,
        unitCost: item.unit_cost,
        extraCost: item.extra_cost,
        honorariosPercentage: item.honorarios_percentage,
      })
      return {
        ...item,
        financial,
        completed: isCostCompleted(item),
      }
    })
  }, [items])

  // Ordenação dos itens
  const sortedItems = useMemo(() => {
    if (!sortField) return itemsWithFinancials
    return [...itemsWithFinancials].sort((a, b) => {
      let valA: any
      let valB: any

      switch (sortField) {
        case 'item_name':
          valA = a.item_name.toLowerCase()
          valB = b.item_name.toLowerCase()
          break
        case 'quantity':
          valA = a.quantity
          valB = b.quantity
          break
        case 'unit_price':
          valA = a.unit_price ?? 0
          valB = b.unit_price ?? 0
          break
        case 'totalRevenue':
          valA = a.financial.totalRevenue
          valB = b.financial.totalRevenue
          break
        case 'unit_cost':
          valA = a.unit_cost ?? 0
          valB = b.unit_cost ?? 0
          break
        case 'totalCost':
          valA = a.financial.totalCost
          valB = b.financial.totalCost
          break
        case 'marginR$':
          valA = a.financial.marginR$
          valB = b.financial.marginR$
          break
        case 'marginPct':
          valA = a.financial.marginPct
          valB = b.financial.marginPct
          break
        case 'supplier_name':
          valA = (a.supplier_name || '').toLowerCase()
          valB = (b.supplier_name || '').toLowerCase()
          break
        case 'cost_status':
          valA = a.completed ? 1 : 0
          valB = b.completed ? 1 : 0
          break
        default:
          return 0
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [itemsWithFinancials, sortField, sortDirection])

  // Métricas agregadas
  const totalItemsCount = items.length
  const completedCostsCount = itemsWithFinancials.filter((i) => i.completed).length
  const totalQuantitySum = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalRevenueSum = itemsWithFinancials.reduce((sum, i) => sum + i.financial.totalRevenue, 0)
  const totalCostSum = itemsWithFinancials.reduce((sum, i) => sum + i.financial.totalCost, 0)
  const totalMarginR$ = itemsWithFinancials.reduce((sum, i) => sum + i.financial.marginR$, 0)
  const totalMarginPct = totalRevenueSum > 0 ? (totalMarginR$ / totalRevenueSum) * 100 : 0
  const completionPercentage =
    totalItemsCount > 0 ? Math.round((completedCostsCount / totalItemsCount) * 100) : 0

  const handleEditClick = (item: DemandItem) => {
    setEditingItem(item)
    setDialogOpen(true)
  }

  const transitionToSaved = () => {
    setSaveStatus('saved')
    setLastSavedAt(new Date())
    setRetryAction(null)
    if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)
    savedTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 2500)
  }

  const transitionToError = (retryFn?: () => void) => {
    setSaveStatus('error')
    if (retryFn) {
      setRetryAction(() => retryFn)
    }
    // Erros persistem visíveis até nova ação ou nova tentativa
    if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)
  }

  const reloadItems = async () => {
    setSaveStatus('saving')
    try {
      const data = await getDemandItems(demandId)
      setItems(data as DemandItem[])
      transitionToSaved()
    } catch {
      transitionToError(() => reloadItems())
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
    const target = deleteTarget
    setSaveStatus('saving')
    try {
      if (userCtx?.id) {
        await logDemandAuditBatch([
          {
            demand_id: demandId,
            item_id: target.id,
            user_id: userCtx.id,
            field_name: 'item_removed',
            old_value: target.item_name,
          },
          {
            demand_id: demandId,
            item_id: target.id,
            user_id: userCtx.id,
            field_name: 'item_name',
            old_value: target.item_name,
          },
          {
            demand_id: demandId,
            item_id: target.id,
            user_id: userCtx.id,
            field_name: 'quantity',
            old_value: String(target.quantity),
          },
        ])
      }
      await deleteDemandItem(target.id)
      await reloadItems()
      toast({ title: 'Item removido com sucesso!' })
      onItemsChanged?.()
    } catch {
      transitionToError(() => handleDeleteConfirm())
      toast({ title: 'Erro ao remover item', variant: 'destructive' })
    } finally {
      setDeleteTarget(null)
    }
  }

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30 group-hover:opacity-100" />
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 ml-1 text-primary" />
    ) : (
      <ArrowDown className="w-3 h-3 ml-1 text-primary" />
    )
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Card
        className={`border-2 transition-all duration-200 overflow-hidden ${
          isExpanded
            ? 'border-primary shadow-xl ring-2 ring-primary/20 bg-card'
            : 'border-primary/20 shadow-md ring-1 ring-primary/10'
        }`}
      >
        {/* CABEÇALHO HERO DA SEÇÃO DE ITENS */}
        <CardHeader
          className={`bg-gradient-to-r from-primary/5 via-background to-muted/40 border-b ${
            isExpanded ? 'p-5 sm:p-6 pb-5' : 'pb-4'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-500 text-white shadow-xs">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle
                    className={`${
                      isExpanded ? 'text-2xl' : 'text-xl'
                    } font-bold flex items-center gap-2`}
                  >
                    <span>Itens da Demanda</span>
                    <Badge
                      variant="secondary"
                      className="font-semibold font-mono text-xs px-2 py-0.5"
                    >
                      {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'itens'}
                    </Badge>
                    {isExpanded && (
                      <Badge
                        variant="outline"
                        className="text-xs bg-primary/10 text-primary border-primary/30 font-medium"
                      >
                        Modo Foco / Expandido
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Área principal de produção: gerencie especificações, fornecedores, custos e
                    margem comercial.
                  </p>
                </div>
              </div>
            </div>

            {/* BOTÕES DE AÇÃO PRINCIPAIS (DESTAQUE PARA PRODUÇÃO) */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <SavingIndicator
                status={saveStatus}
                lastSavedAt={lastSavedAt}
                onRetry={retryAction ? () => retryAction() : undefined}
                showSavedTime={isExpanded}
              />

              {clientId && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setLpuDialogOpen(true)}
                  disabled={!canEdit}
                  className="text-xs font-medium border-primary/30 hover:bg-primary/5"
                  title="Importar múltiplos itens cadastrados na tabela do cliente"
                >
                  <ListChecks className="w-4 h-4 mr-1.5 text-primary" />
                  Importar da LPU
                </Button>
              )}

              <Button
                size="sm"
                onClick={() => setAddDialogOpen(true)}
                disabled={!canEdit}
                className="text-xs font-semibold shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 px-3.5"
                title="Adicionar novo item de produção com fluxo rápido"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                Adicionar Item
              </Button>

              {onToggleExpand && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 ml-1 text-muted-foreground hover:text-foreground"
                      onClick={onToggleExpand}
                      aria-label={isExpanded ? 'Modo normal' : 'Modo tela ampla'}
                    >
                      {isExpanded ? (
                        <Minimize2 className="w-4 h-4" />
                      ) : (
                        <Maximize2 className="w-4 h-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isExpanded ? 'Reduzir para visão padrão' : 'Modo Foco em Tela Ampla'}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {/* BARRA DE PROGRESSO & STATUS DE PREENCHIMENTO DE CUSTOS */}
          {totalItemsCount > 0 && (
            <div className="mt-4 pt-3 border-t grid grid-cols-1 md:grid-cols-12 gap-3 items-center text-xs">
              <div className="md:col-span-5 space-y-1.5">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    Completude de Custos de Produção:
                  </span>
                  <span className="font-semibold text-foreground">
                    {completedCostsCount} de {totalItemsCount} ({completionPercentage}%)
                  </span>
                </div>
                <Progress value={completionPercentage} className="h-2 bg-muted" />
              </div>

              <div className="md:col-span-7 flex flex-wrap items-center justify-start md:justify-end gap-3 text-muted-foreground">
                <div className="flex items-center gap-1.5 bg-white/80 px-2.5 py-1 rounded-lg border border-zinc-200 text-xs">
                  <span className="text-muted-foreground">Total de Peças:</span>
                  <span className="font-semibold font-mono text-foreground">
                    {totalQuantitySum}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/80 px-2.5 py-1 rounded-lg border border-zinc-200 text-xs">
                  <span className="text-muted-foreground">Receita Venda:</span>
                  <span className="font-semibold font-mono text-foreground">
                    {formatCurrency(totalRevenueSum)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/80 px-2.5 py-1 rounded-lg border border-zinc-200 text-xs">
                  <span className="text-muted-foreground">Custo Total:</span>
                  <span className="font-semibold font-mono text-foreground">
                    {formatCurrency(totalCostSum)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/80 px-2.5 py-1 rounded-lg border border-zinc-200 text-xs">
                  <span className="text-muted-foreground">Margem Geral:</span>
                  <span className={`font-bold font-mono ${getMarginColor(totalMarginPct)}`}>
                    {formatPercent(totalMarginPct)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className={isExpanded ? 'p-5 sm:p-8' : 'p-4 sm:p-6'}>
          {loading ? (
            <div className="space-y-3 py-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/10 space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Package className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="font-semibold text-base text-foreground">
                  Nenhum item cadastrado nesta demanda
                </h3>
                <p className="text-xs text-muted-foreground">
                  A equipe de Produção deve cadastrar os itens necessários para execução do projeto.
                  Você pode criar itens sob medida ou importar a tabela LPU contratada.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
                {clientId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setLpuDialogOpen(true)}
                    disabled={!canEdit}
                  >
                    <ListChecks className="w-4 h-4 mr-1.5" />
                    Adicionar da LPU do Cliente
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => setAddDialogOpen(true)}
                  disabled={!canEdit}
                  className="bg-primary text-primary-foreground shadow-xs"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Cadastrar Primeiro Item
                </Button>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="internal" className="w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <TabsList className="bg-muted/80 p-1">
                  <TabsTrigger value="internal" className="text-xs gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Visão Interna (Produção & Custos)
                  </TabsTrigger>
                  <TabsTrigger value="external" className="text-xs gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Visão Orçamento (Cliente)
                  </TabsTrigger>
                </TabsList>

                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  Clique nos cabeçalhos com setas para ordenar por coluna.
                </p>
              </div>

              {/* ABA 1: VISÃO INTERNA COMPLETA COM CUSTOS, FORNECEDORES E MARGENS */}
              <TabsContent value="internal" className="m-0 focus-visible:outline-hidden">
                <div
                  className={`rounded-xl border border-zinc-200/60 bg-white shadow-xs overflow-hidden ${
                    isExpanded ? 'min-h-[480px]' : ''
                  }`}
                >
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow className="hover:bg-transparent">
                          <TableHead
                            onClick={() => handleSort('item_name')}
                            className="cursor-pointer font-semibold select-none group text-xs text-foreground min-w-[200px]"
                          >
                            <span className="flex items-center">
                              Item / Descrição {renderSortIcon('item_name')}
                            </span>
                          </TableHead>

                          <TableHead
                            onClick={() => handleSort('quantity')}
                            className="cursor-pointer font-semibold select-none group text-xs text-center min-w-[70px]"
                          >
                            <span className="flex items-center justify-center">
                              Qtd {renderSortIcon('quantity')}
                            </span>
                          </TableHead>

                          <TableHead
                            onClick={() => handleSort('unit_price')}
                            className="cursor-pointer font-semibold select-none group text-xs text-right min-w-[100px]"
                          >
                            <span className="flex items-center justify-end">
                              Venda Unit. {renderSortIcon('unit_price')}
                            </span>
                          </TableHead>

                          <TableHead
                            onClick={() => handleSort('totalRevenue')}
                            className="cursor-pointer font-semibold select-none group text-xs text-right min-w-[110px]"
                          >
                            <span className="flex items-center justify-end">
                              Total Geral {renderSortIcon('totalRevenue')}
                            </span>
                          </TableHead>

                          <TableHead
                            onClick={() => handleSort('supplier_name')}
                            className="cursor-pointer font-semibold select-none group text-xs min-w-[140px]"
                          >
                            <span className="flex items-center">
                              Fornecedor {renderSortIcon('supplier_name')}
                            </span>
                          </TableHead>

                          <TableHead
                            onClick={() => handleSort('unit_cost')}
                            className="cursor-pointer font-semibold select-none group text-xs text-right min-w-[100px]"
                          >
                            <span className="flex items-center justify-end">
                              Custo Unit. {renderSortIcon('unit_cost')}
                            </span>
                          </TableHead>

                          <TableHead
                            onClick={() => handleSort('totalCost')}
                            className="cursor-pointer font-semibold select-none group text-xs text-right min-w-[100px]"
                          >
                            <span className="flex items-center justify-end">
                              Custo Total {renderSortIcon('totalCost')}
                            </span>
                          </TableHead>

                          <TableHead
                            onClick={() => handleSort('marginR$')}
                            className="cursor-pointer font-semibold select-none group text-xs text-right min-w-[100px]"
                          >
                            <span className="flex items-center justify-end">
                              Margem R$ {renderSortIcon('marginR$')}
                            </span>
                          </TableHead>

                          <TableHead
                            onClick={() => handleSort('marginPct')}
                            className="cursor-pointer font-semibold select-none group text-xs text-right min-w-[90px]"
                          >
                            <span className="flex items-center justify-end">
                              Margem % {renderSortIcon('marginPct')}
                            </span>
                          </TableHead>

                          <TableHead
                            onClick={() => handleSort('cost_status')}
                            className="cursor-pointer font-semibold select-none group text-xs text-center min-w-[90px]"
                          >
                            <span className="flex items-center justify-center">
                              Status {renderSortIcon('cost_status')}
                            </span>
                          </TableHead>

                          <TableHead className="text-center font-semibold text-xs min-w-[130px]">
                            Ações
                          </TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {sortedItems.map((item) => {
                          const f = item.financial
                          const completed = item.completed
                          const marginColor = getMarginColor(f.marginPct)
                          const hasFinanceReq = financeRequestIds.has(item.id)

                          return (
                            <TableRow
                              key={item.id}
                              className="group transition-colors hover:bg-muted/40 data-[state=selected]:bg-muted"
                            >
                              {/* Nome e badges */}
                              <TableCell className="font-medium align-middle">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-semibold text-sm text-foreground">
                                      {item.item_name}
                                    </span>
                                    {item.is_custom ? (
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] bg-amber-50 text-amber-800 border-amber-200"
                                      >
                                        Personalizado
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] bg-blue-50 text-blue-700 border-blue-200"
                                      >
                                        LPU
                                      </Badge>
                                    )}
                                  </div>
                                  {item.description && (
                                    <p
                                      className="text-xs text-muted-foreground line-clamp-1"
                                      title={item.description}
                                    >
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                              </TableCell>

                              {/* Quantidade */}
                              <TableCell className="text-center align-middle font-mono font-medium text-xs">
                                {item.quantity}
                              </TableCell>

                              {/* Valor unitário */}
                              <TableCell className="text-right align-middle font-mono text-xs text-muted-foreground">
                                {formatCurrency(item.unit_price)}
                              </TableCell>

                              {/* Total Geral (Venda) */}
                              <TableCell className="text-right align-middle font-mono text-xs font-semibold text-foreground">
                                {formatCurrency(f.totalRevenue)}
                              </TableCell>

                              {/* Fornecedor */}
                              <TableCell className="align-middle text-xs">
                                {item.supplier_name ? (
                                  <div
                                    className="flex items-center gap-1 font-medium text-foreground truncate max-w-[160px]"
                                    title={item.supplier_name}
                                  >
                                    <Building2 className="w-3 h-3 text-muted-foreground shrink-0" />
                                    <span className="truncate">{item.supplier_name}</span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground italic text-[11px] flex items-center gap-1">
                                    Não definido
                                  </span>
                                )}
                              </TableCell>

                              {/* Custo unitário */}
                              <TableCell className="text-right align-middle font-mono text-xs">
                                {item.unit_cost !== null ? (
                                  formatCurrency(item.unit_cost)
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>

                              {/* Custo Total */}
                              <TableCell className="text-right align-middle font-mono text-xs font-medium">
                                {item.unit_cost !== null ? (
                                  formatCurrency(f.totalCost)
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>

                              {/* Margem R$ */}
                              <TableCell
                                className={`text-right align-middle font-mono text-xs font-semibold ${marginColor}`}
                              >
                                {formatCurrency(f.marginR$)}
                              </TableCell>

                              {/* Margem % */}
                              <TableCell
                                className={`text-right align-middle font-mono text-xs font-bold ${marginColor}`}
                              >
                                <span className="inline-flex items-center justify-end">
                                  <MarginIndicator pct={f.marginPct} />
                                  {formatPercent(f.marginPct)}
                                </span>
                              </TableCell>

                              {/* Status do Custo */}
                              <TableCell className="text-center align-middle">
                                {completed ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 text-[10px] font-semibold">
                                    Concluído
                                  </Badge>
                                ) : (
                                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 text-[10px] font-medium">
                                    Pendente
                                  </Badge>
                                )}
                              </TableCell>

                              {/* Ações */}
                              <TableCell className="text-center align-middle">
                                <div className="flex items-center justify-center gap-1">
                                  {hasFinanceReq ? (
                                    <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 whitespace-nowrap text-[10px]">
                                      <CheckCircle2 className="w-3 h-3 mr-1" />
                                      No Financeiro
                                    </Badge>
                                  ) : canEdit ? (
                                    <>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                                            onClick={() => handleEditClick(item)}
                                            aria-label={`Editar custos de ${item.item_name}`}
                                          >
                                            <Pencil className="w-3.5 h-3.5" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          Preencher custos e fornecedor
                                        </TooltipContent>
                                      </Tooltip>

                                      {(item.supplier_id || item.supplier_name) &&
                                      (item.unit_cost !== null || item.total_cost !== null) ? (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950/40"
                                              onClick={() => {
                                                setFinanceTarget(item)
                                                setFinanceDialogOpen(true)
                                              }}
                                              aria-label={`Enviar ${item.item_name} ao financeiro`}
                                            >
                                              <Send className="w-3.5 h-3.5" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            Enviar item para o Financeiro
                                          </TooltipContent>
                                        </Tooltip>
                                      ) : null}

                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => setDeleteTarget(item)}
                                            aria-label={`Excluir ${item.item_name}`}
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Excluir item da demanda</TooltipContent>
                                      </Tooltip>
                                    </>
                                  ) : (
                                    <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}

                        {/* LINHA DE TOTAIS VISÍVEIS */}
                        <TableRow className="border-t-2 bg-muted/30 font-semibold hover:bg-muted/30">
                          <TableCell className="font-bold text-xs">
                            Totais ({totalItemsCount} {totalItemsCount === 1 ? 'item' : 'itens'})
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs font-bold">
                            {totalQuantitySum}
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            —
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold text-foreground">
                            {formatCurrency(totalRevenueSum)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">—</TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            —
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold text-foreground">
                            {formatCurrency(totalCostSum)}
                          </TableCell>
                          <TableCell
                            className={`text-right font-mono text-xs font-bold ${getMarginColor(
                              totalMarginPct,
                            )}`}
                          >
                            {formatCurrency(totalMarginR$)}
                          </TableCell>
                          <TableCell
                            className={`text-right font-mono text-xs font-bold ${getMarginColor(
                              totalMarginPct,
                            )}`}
                          >
                            <span className="inline-flex items-center justify-end">
                              <MarginIndicator pct={totalMarginPct} />
                              {formatPercent(totalMarginPct)}
                            </span>
                          </TableCell>
                          <TableCell
                            colSpan={2}
                            className="text-center text-xs text-muted-foreground"
                          >
                            {completedCostsCount}/{totalItemsCount} precificados
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              {/* ABA 2: VISÃO CLIENTE / ORÇAMENTO EXTERNO */}
              <TabsContent value="external" className="m-0 focus-visible:outline-hidden">
                <div
                  className={`rounded-xl border border-zinc-200/60 bg-white shadow-xs overflow-hidden ${
                    isExpanded ? 'min-h-[480px]' : ''
                  }`}
                >
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="font-semibold text-xs text-foreground">
                            Item / Serviço
                          </TableHead>
                          <TableHead className="text-center font-semibold text-xs">Qtd.</TableHead>
                          <TableHead className="text-right font-semibold text-xs">
                            Valor Unitário
                          </TableHead>
                          <TableHead className="text-right font-semibold text-xs">
                            Honorários (%)
                          </TableHead>
                          <TableHead className="text-right font-semibold text-xs">
                            Total Proposta
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedItems.map((item) => {
                          const f = item.financial
                          return (
                            <TableRow key={item.id} className="hover:bg-muted/40">
                              <TableCell className="font-medium text-xs">
                                <div>
                                  <p className="font-semibold text-foreground">{item.item_name}</p>
                                  {item.description && (
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-center font-mono text-xs">
                                {item.quantity}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs">
                                {formatCurrency(item.unit_price)}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                {formatPercent(item.honorarios_percentage)}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs font-semibold text-foreground">
                                {formatCurrency(f.totalRevenue)}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                        <TableRow className="border-t-2 bg-muted/30 font-bold hover:bg-muted/30">
                          <TableCell colSpan={4} className="text-right text-xs">
                            Total Geral da Proposta
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold text-foreground">
                            {formatCurrency(totalRevenueSum)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
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
              <AlertDialogTitle>Remover Item da Demanda</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover "{deleteTarget?.item_name}"? Esta ação não pode ser
                desfeita e removerá os dados de custos associados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remover Item
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <SendToFinanceDialog
          open={financeDialogOpen}
          onOpenChange={setFinanceDialogOpen}
          item={financeTarget}
          demandId={demandId}
          userId={userCtx?.id || ''}
          onSent={(itemId) => {
            setFinanceRequestIds((prev) => new Set(prev).add(itemId))
            onItemsChanged?.()
          }}
        />
      </Card>
    </TooltipProvider>
  )
}
