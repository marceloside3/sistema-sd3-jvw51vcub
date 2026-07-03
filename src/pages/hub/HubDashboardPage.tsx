import { Fragment, useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, X, ChevronRight, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { formatDateBR } from '@/lib/utils'
import { getProjectStatusBadge, PROJECT_STATUS_LABELS } from '@/lib/constants/project-status'
import { useSlaConfig } from '@/hooks/use-sla-config'
import { calculateSla } from '@/lib/sla'
import { HubKpiCards } from '@/components/hub/HubKpiCards'
import { HubExpandedRow } from '@/components/hub/HubExpandedRow'

export default function HubDashboardPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [originFilter, setOriginFilter] = useState('all')
  const [slaFilter, setSlaFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const navigate = useNavigate()
  const { configs } = useSlaConfig()

  useEffect(() => {
    fetchProjects()
  }, [])

  async function fetchProjects() {
    setLoading(true)
    const { data, error } = await supabase
      .from('projects')
      .select('*, clients(name), project_areas(area:areas(name), is_lead)')
      .order('created_at', { ascending: false })
    if (data && !error) setProjects(data)
    setLoading(false)
  }

  const slaLimit = configs['atendimento_to_areas']?.hours_limit || 24

  const kpiData = useMemo(() => {
    let onTrack = 0,
      overdue = 0,
      pendingDist = 0
    projects.forEach((p) => {
      const { status } = calculateSla(p.distributed_at, slaLimit)
      if (status === 'not_distributed') pendingDist++
      else if (status === 'safe') onTrack++
      else if (status === 'overdue') overdue++
    })
    return { total: projects.length, onTrack, overdue, pendingDist }
  }, [projects, slaLimit])

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (search) {
        const q = search.toLowerCase()
        if (
          !p.name?.toLowerCase().includes(q) &&
          !p.project_code?.toLowerCase().includes(q) &&
          !p.clients?.name?.toLowerCase().includes(q)
        )
          return false
      }
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (originFilter !== 'all' && p.origin_type !== originFilter) return false
      if (slaFilter !== 'all') {
        const { status } = calculateSla(p.distributed_at, slaLimit)
        if (slaFilter !== status) return false
      }
      return true
    })
  }, [projects, search, statusFilter, originFilter, slaFilter, slaLimit])

  const hasFilters =
    search !== '' || statusFilter !== 'all' || originFilter !== 'all' || slaFilter !== 'all'

  function clearFilters() {
    setSearch('')
    setStatusFilter('all')
    setOriginFilter('all')
    setSlaFilter('all')
  }

  function getLeadArea(p: any): string {
    const lead = p.project_areas?.find((pa: any) => pa.is_lead)
    return lead?.area?.name || p.project_areas?.[0]?.area?.name || '-'
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">HUB Atendimento</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitoramento e gestão de projetos</p>
        </div>
        <Button onClick={() => navigate('/projetos/novo')}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Projeto
        </Button>
      </div>

      <HubKpiCards {...kpiData} />

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
                placeholder="Buscar por código, nome ou cliente..."
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
                {Object.entries(PROJECT_STATUS_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={originFilter} onValueChange={setOriginFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Origens</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="handoff_comercial">Handoff Comercial</SelectItem>
              </SelectContent>
            </Select>
            <Select value={slaFilter} onValueChange={setSlaFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="SLA" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos (SLA)</SelectItem>
                <SelectItem value="safe">No prazo</SelectItem>
                <SelectItem value="warning">Vencendo</SelectItem>
                <SelectItem value="overdue">Vencidas</SelectItem>
                <SelectItem value="not_distributed">Não distribuídos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="bg-white rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]" />
              <TableHead>Código</TableHead>
              <TableHead>Projeto</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Prazo</TableHead>
              <TableHead>Área Lead</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filteredProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                  Nenhum projeto encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredProjects.map((p) => (
                <Fragment key={p.id}>
                  <TableRow
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => navigate(`/projetos/${p.id}`)}
                  >
                    <TableCell
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedId(expandedId === p.id ? null : p.id)
                      }}
                      className="align-middle"
                    >
                      {expandedId === p.id ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-blue-600">
                      {p.project_code || '-'}
                    </TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.clients?.name || '-'}
                    </TableCell>
                    <TableCell>{getProjectStatusBadge(p.status)}</TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {formatDateBR(p.end_date)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {getLeadArea(p)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                  {expandedId === p.id && (
                    <HubExpandedRow project={p} slaLimit={slaLimit} colSpan={7} />
                  )}
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
