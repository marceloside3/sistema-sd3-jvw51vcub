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

export default function HubDashboardPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [originFilter, setOriginFilter] = useState('all')
  const navigate = useNavigate()

  useEffect(() => {
    fetchProjects()
  }, [])

  async function fetchProjects() {
    setLoading(true)
    const { data, error } = await supabase
      .from('projects')
      .select('*, clients(name)')
      .order('created_at', { ascending: false })

    if (data && !error) {
      setProjects(data)
    }
    setLoading(false)
  }

  const filteredProjects = projects.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false
    if (originFilter !== 'all' && p.origin_type !== originFilter) return false
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
      </div>

      <div className="bg-white rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Projeto</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Briefing</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data Criação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filteredProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24">
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
