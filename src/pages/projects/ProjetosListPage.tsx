import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, ChevronRight, ChevronDown } from 'lucide-react'
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
import { getProjects } from '@/services/projects'
import { useCurrentUser } from '@/hooks/use-current-user'
import { format } from 'date-fns'
import { getProjectStatusBadge } from '@/lib/constants/project-status'
import { PageSkeleton } from '@/components/ui/page-skeleton'
import { ProjectStatusDropdown } from '@/components/projects/ProjectStatusDropdown'

export default function ProjetosListPage() {
  const { data: currentUser } = useCurrentUser()
  const [projects, setProjects] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { toast } = useToast()

  const canCreate =
    currentUser?.profile?.is_admin ||
    currentUser?.profile?.is_director ||
    currentUser?.areas?.some((a) => a.code === 'planejamento')

  // The expand control is visible to anyone who can view a project's status
  // breakdown: directors/admins, or the user is involved in the project.
  // Since the list itself already only shows projects the user can view (RLS),
  // every project in this list is one the user is involved in. So any logged-in
  // user who can see the project can expand it.
  const canExpand = Boolean(
    currentUser?.profile?.is_admin ||
    currentUser?.profile?.is_director ||
    currentUser?.areas?.length,
  )

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

  if (loading) {
    return <PageSkeleton kpiCount={0} />
  }

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
          <Button
            asChild
            className="transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
          >
            <Link to="/projetos/novo">
              <Plus fill="currentColor" className="w-4 h-4 mr-2" />
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

      <div className="border border-zinc-200/60 rounded-2xl bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {canExpand && <TableHead className="w-10" />}
              <TableHead>Código</TableHead>
              <TableHead>Projeto</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Início previsto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canExpand ? 6 : 5} className="text-center py-8 text-gray-500">
                  Nenhum projeto encontrado
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => {
                const isOpen = expandedId === p.id
                return (
                  <ProjectRowFragment
                    key={p.id}
                    project={p}
                    canExpand={canExpand}
                    isOpen={isOpen}
                    onToggle={() => setExpandedId(isOpen ? null : p.id)}
                  />
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

interface ProjectRowFragmentProps {
  project: any
  canExpand: boolean
  isOpen: boolean
  onToggle: () => void
}

/**
 * Renders a project's main table row plus, when expanded, a second row whose
 * single cell spans all columns and hosts the status dropdown. Returned as a
 * Fragment so both rows sit directly inside <tbody>.
 */
function ProjectRowFragment({ project: p, canExpand, isOpen, onToggle }: ProjectRowFragmentProps) {
  return (
    <>
      <TableRow className={isOpen ? 'bg-zinc-50/60' : undefined}>
        {canExpand && (
          <TableCell className="w-10 align-middle">
            <button
              type="button"
              onClick={onToggle}
              className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-zinc-100 transition-colors text-zinc-500"
              aria-label={isOpen ? 'Recolher status do projeto' : 'Expandir status do projeto'}
              aria-expanded={isOpen}
            >
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </TableCell>
        )}
        <TableCell className="font-mono text-sm">
          {p.project_code ? (
            <Link to={`/projetos/${p.id}`} className="text-orange-600 hover:underline">
              {p.project_code}
            </Link>
          ) : (
            '-'
          )}
        </TableCell>
        <TableCell>
          <Link to={`/projetos/${p.id}`} className="font-medium text-orange-600 hover:underline">
            {p.name}
          </Link>
        </TableCell>
        <TableCell>{p.client?.name}</TableCell>
        <TableCell>{getProjectStatusBadge(p.status)}</TableCell>
        <TableCell>{p.start_date ? format(new Date(p.start_date), 'dd/MM/yyyy') : '-'}</TableCell>
      </TableRow>
      {canExpand && isOpen && (
        <TableRow className="border-b-0 hover:bg-transparent">
          <TableCell colSpan={6} className="p-0">
            <ProjectStatusDropdown projectId={p.id} end_date={p.end_date} />
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
