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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-600 hover:bg-green-700">Ativo</Badge>
      case 'in_progress':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Em Andamento</Badge>
      case 'draft':
        return <Badge variant="secondary">Rascunho</Badge>
      case 'paused':
        return (
          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
            Pausado
          </Badge>
        )
      case 'completed':
        return <Badge className="bg-blue-600 hover:bg-blue-700">Concluído</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelado</Badge>
      default:
        return <Badge>{status}</Badge>
    }
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
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="in_progress">Em Andamento</SelectItem>
              <SelectItem value="draft">Rascunho</SelectItem>
              <SelectItem value="paused">Pausado</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
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
                  <TableCell>{getStatusBadge(p.status)}</TableCell>
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
