import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
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
import { SlaBadge } from '@/components/sla/SlaBadge'

export default function HubDashboardPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [originFilter, setOriginFilter] = useState('all')
  const [slaFilter, setSlaFilter] = useState('all')
  const navigate = useNavigate()
  const { configs } = useSlaConfig()

  useEffect(() => {
    fetchProjects()
  }, [])

  async function fetchProjects() {
    setLoading(true)
    const { data, error } = await supabase
      .from('projects')
      .select('*, clients(name), project_areas(area:areas(name))')
      .order('created_at', { ascending: false })

    if (data && !error) {
      setProjects(data)
    }
    setLoading(false)
  }

  const filteredProjects = projects.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false
    if (originFilter !== 'all' && p.origin_type !== originFilter) return false
    if (slaFilter !== 'all') {
      const slaLimit = configs['atendimento_to_areas']?.hours_limit || 24
      const { status } = calculateSla(p.distributed_at, slaLimit)
      if (slaFilter === 'not_distributed' && status !== 'not_distributed') return false
      if (slaFilter === 'safe' && status !== 'safe') return false
      if (slaFilter === 'warning' && status !== 'warning') return false
      if (slaFilter === 'overdue' && status !== 'overdue') return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">HUB Atendimento</h1>
        <Button onClick={() => navigate('/projetos/novo')}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Projeto
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
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
        </div>
        <div className="w-48">
          <Select value={originFilter} onValueChange={setOriginFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Origens</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="handoff_comercial">Handoff Comercial</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Select value={slaFilter} onValueChange={setSlaFilter}>
            <SelectTrigger>
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
      </div>

      <div className="bg-white rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Projeto</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>SLA</TableHead>
              <TableHead>Áreas envolvidas</TableHead>
              <TableHead>Briefing</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center h-24">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filteredProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center h-24">
                  Nenhum projeto encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredProjects.map((p) => (
                <TableRow
                  key={p.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => navigate(`/projetos/${p.id}`)}
                >
                  <TableCell className="font-medium text-blue-600">
                    {p.project_code || '-'}
                  </TableCell>
                  <TableCell>{p.clients?.name}</TableCell>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {p.origin_type === 'handoff_comercial' ? 'Handoff Comercial' : 'Manual'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <SlaBadge
                      startedAt={p.distributed_at}
                      hoursLimit={configs['atendimento_to_areas']?.hours_limit || 24}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {p.project_areas?.map((pa: any, idx: number) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="text-[10px] px-1 py-0 h-4 font-normal"
                        >
                          {pa.area?.name}
                        </Badge>
                      ))}
                      {(!p.project_areas || p.project_areas.length === 0) && (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {p.briefing_completed_at ? (
                      <span className="text-green-600 flex items-center text-sm font-medium">
                        ✅ completo
                      </span>
                    ) : (
                      <span className="text-amber-600 flex items-center text-sm font-medium">
                        ⏳ pendente
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{getProjectStatusBadge(p.status)}</TableCell>
                  <TableCell className="text-gray-500 whitespace-nowrap">
                    {formatDateBR(p.created_at)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
