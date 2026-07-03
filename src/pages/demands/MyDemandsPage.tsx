import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, X, Loader2, ArrowUpDown, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDateBR, cn } from '@/lib/utils'
import { getAllUserDemands } from '@/services/demands'
import { useCurrentUser } from '@/hooks/use-current-user'
import { DemandKpiCards, type KpiCardKey } from '@/components/demands/DemandKpiCards'
import { DEMAND_PRIORITY_CONFIG, DEMAND_STATUS_CONFIG } from '@/lib/constants/demand-status'

type TabKey = 'received' | 'sent' | 'completed'
type SortKey = 'title' | 'due_date' | 'priority' | 'status'

export default function MyDemandsPage() {
  const { data: userCtx, loading: userLoading } = useCurrentUser()
  const [allDemands, setAllDemands] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('received')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [sortBy, setSortBy] = useState<SortKey>('due_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [activeCard, setActiveCard] = useState<KpiCardKey | null>(null)
  const navigate = useNavigate()

  function handleCardClick(card: KpiCardKey) {
    if (card === 'overdue') {
      if (activeCard === 'overdue') {
        setOverdueOnly(false)
        setActiveCard(null)
      } else {
        setOverdueOnly(true)
        setActiveCard('overdue')
      }
      return
    }
    setOverdueOnly(false)
    const tabMap: Record<string, TabKey> = {
      received: 'received',
      sent: 'sent',
      completed: 'completed',
    }
    const newTab = tabMap[card]
    if (activeCard === card) {
      setActiveCard(null)
    } else {
      setActiveCard(card)
    }
    setActiveTab(newTab)
  }

  useEffect(() => {
    if (userCtx?.id) fetchDemands()
  }, [userCtx?.id])

  async function fetchDemands() {
    setLoading(true)
    try {
      const data = await getAllUserDemands(userCtx!.id)
      setAllDemands(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const kpiData = useMemo(() => {
    const uid = userCtx?.id
    if (!uid) return { received: 0, sent: 0, completed: 0, overdue: 0 }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let received = 0,
      sent = 0,
      completed = 0,
      overdue = 0
    allDemands.forEach((d) => {
      const isTo = d.to_user_id === uid
      const isFrom = d.from_user_id === uid
      const isDone = d.status === 'done'
      const isCancelled = d.status === 'cancelled'
      if (isTo && !isDone && !isCancelled) received++
      if (isFrom && !isDone && !isCancelled) sent++
      if (isDone && (isTo || isFrom)) completed++
      if (d.due_date && new Date(d.due_date) < today && !isDone && !isCancelled && (isTo || isFrom))
        overdue++
    })
    return { received, sent, completed, overdue }
  }, [allDemands, userCtx?.id])

  const filteredDemands = useMemo(() => {
    const uid = userCtx?.id
    if (!uid) return []
    const result = allDemands.filter((d) => {
      const isTo = d.to_user_id === uid
      const isFrom = d.from_user_id === uid
      if (overdueOnly) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        if (
          !d.due_date ||
          new Date(d.due_date) >= today ||
          d.status === 'done' ||
          d.status === 'cancelled'
        )
          return false
        if (!isTo && !isFrom) return false
      } else {
        if (activeTab === 'received' && !(isTo && d.status !== 'done' && d.status !== 'cancelled'))
          return false
        if (activeTab === 'sent' && !(isFrom && d.status !== 'done' && d.status !== 'cancelled'))
          return false
        if (activeTab === 'completed' && !(d.status === 'done' && (isTo || isFrom))) return false
      }
      if (search) {
        const q = search.toLowerCase()
        if (
          !d.title?.toLowerCase().includes(q) &&
          !d.project?.name?.toLowerCase().includes(q) &&
          !d.project?.project_code?.toLowerCase().includes(q)
        )
          return false
      }
      if (statusFilter !== 'all' && d.status !== statusFilter) return false
      if (priorityFilter !== 'all' && d.priority !== priorityFilter) return false
      return true
    })
    result.sort((a, b) => {
      let cmp = 0
      if (sortBy === 'title') cmp = (a.title || '').localeCompare(b.title || '')
      else if (sortBy === 'due_date') cmp = (a.due_date || '').localeCompare(b.due_date || '')
      else if (sortBy === 'priority') cmp = (a.priority || '').localeCompare(b.priority || '')
      else if (sortBy === 'status') cmp = (a.status || '').localeCompare(b.status || '')
      return sortDir === 'asc' ? cmp : -cmp
    })
    return result
  }, [
    allDemands,
    activeTab,
    search,
    statusFilter,
    priorityFilter,
    sortBy,
    sortDir,
    userCtx?.id,
    overdueOnly,
  ])

  const hasFilters =
    search !== '' || statusFilter !== 'all' || priorityFilter !== 'all' || overdueOnly

  function clearFilters() {
    setSearch('')
    setStatusFilter('all')
    setPriorityFilter('all')
    setOverdueOnly(false)
    setActiveCard(null)
  }

  function toggleSort(col: SortKey) {
    if (sortBy === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else {
      setSortBy(col)
      setSortDir('asc')
    }
  }

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Minhas Demandas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie as tarefas que você pediu ou que pediram para você.
          </p>
        </div>
        <Button asChild>
          <Link to="/demandas/nova">
            <Plus className="w-4 h-4 mr-2" />
            Nova Demanda
          </Link>
        </Button>
      </div>

      <DemandKpiCards {...kpiData} activeCard={activeCard} onCardClick={handleCardClick} />

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v as TabKey)
          setOverdueOnly(false)
          setActiveCard(null)
        }}
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="received">Recebidas ({kpiData.received})</TabsTrigger>
          <TabsTrigger value="sent">Enviadas ({kpiData.sent})</TabsTrigger>
          <TabsTrigger value="completed">Concluídas ({kpiData.completed})</TabsTrigger>
        </TabsList>
      </Tabs>
      {overdueOnly && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          <AlertTriangle className="h-4 w-4" />
          <span>Mostrando apenas demandas atrasadas.</span>
          <button
            className="ml-auto text-xs font-medium text-red-700 hover:underline"
            onClick={() => {
              setOverdueOnly(false)
              setActiveCard(null)
            }}
          >
            Remover filtro
          </button>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Filtros</CardTitle>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7">
                <X className="w-3 h-3 mr-1" />
                Limpar filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título, projeto ou código..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="review">Em Revisão</SelectItem>
                <SelectItem value="done">Concluída</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Prioridades</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="bg-white rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('title')}>
                <span className="inline-flex items-center gap-1">
                  Título <ArrowUpDown className="h-3 w-3" />
                </span>
              </TableHead>
              <TableHead>Projeto</TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort('priority')}
              >
                <span className="inline-flex items-center gap-1">
                  Prioridade <ArrowUpDown className="h-3 w-3" />
                </span>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort('due_date')}
              >
                <span className="inline-flex items-center gap-1">
                  Prazo <ArrowUpDown className="h-3 w-3" />
                </span>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort('status')}
              >
                <span className="inline-flex items-center gap-1">
                  Status <ArrowUpDown className="h-3 w-3" />
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filteredDemands.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  Nenhuma demanda encontrada.
                </TableCell>
              </TableRow>
            ) : (
              filteredDemands.map((d) => {
                const pCfg = DEMAND_PRIORITY_CONFIG[d.priority] || DEMAND_PRIORITY_CONFIG.normal
                const sCfg = DEMAND_STATUS_CONFIG[d.status] || {
                  label: d.status,
                  className: 'bg-zinc-100 text-zinc-600 border-zinc-200',
                }
                return (
                  <TableRow
                    key={d.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => navigate(`/demandas/${d.id}`)}
                  >
                    <TableCell className="font-medium text-blue-600">{d.title}</TableCell>
                    <TableCell className="text-muted-foreground">
                      <span className="font-medium">{d.project?.project_code || '-'}</span>
                      <span className="block text-xs text-gray-400">{d.project?.name}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={pCfg.className}>
                        {pCfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {formatDateBR(d.due_date)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={sCfg.className}>
                        {sCfg.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
