import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { getProjects } from '@/services/projects'
import { useCurrentUser } from '@/hooks/use-current-user'
import { format } from 'date-fns'
import { getProjectStatusBadge } from '@/lib/constants/project-status'

export default function ProjetosListPage() {
  const { data: currentUser } = useCurrentUser()
  const [projects, setProjects] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const canCreate = currentUser?.profile?.is_admin || currentUser?.profile?.is_director

  useEffect(() => {
    async function fetchProjects() {
      try {
        const data = await getProjects()
        setProjects(data || [])
      } catch (error) {
        console.error('Failed to fetch projects:', error)
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar a lista de projetos. Por favor, tente novamente.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [])

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.project_code?.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projetos</h1>
          <p className="text-sm text-gray-500">Gerencie e acompanhe o andamento dos projetos.</p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link to="/projetos/novo">
              <Plus className="w-4 h-4 mr-2" />
              Novo Projeto
            </Link>
          </Button>
        )}
      </div>

      <div className="flex items-center max-w-sm">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar por nome ou código..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-md bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Projeto</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Início previsto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  Nenhum projeto encontrado
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-sm">
                    {p.project_code ? (
                      <Link to={`/projetos/${p.id}`} className="text-blue-600 hover:underline">
                        {p.project_code}
                      </Link>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Link
                      to={`/projetos/${p.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {p.name}
                    </Link>
                  </TableCell>
                  <TableCell>{p.client?.name}</TableCell>
                  <TableCell>{getProjectStatusBadge(p.status)}</TableCell>
                  <TableCell>
                    {p.start_date ? format(new Date(p.start_date), 'dd/MM/yyyy') : '-'}
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
