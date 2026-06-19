import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Calendar, User, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getProjectById, updateProjectStatus } from '@/services/projects'
import { AttachmentsSection } from '@/components/attachments/AttachmentsSection'
import { getProjectDemands } from '@/services/demands'
import { format } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useToast } from '@/components/ui/use-toast'

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  in_progress: 'Em Andamento',
  overdue: 'Atrasado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  active: ['in_progress', 'completed', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  overdue: ['in_progress', 'completed'],
  completed: [],
  cancelled: [],
}

export default function ProjetoDetalhePage() {
  const { id } = useParams()
  const { data: userCtx } = useCurrentUser()
  const { toast } = useToast()

  const [project, setProject] = useState<any>(null)
  const [demands, setDemands] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([getProjectById(id), getProjectDemands(id)])
      .then(([projData, demandsData]) => {
        setProject(projData)
        setDemands(demandsData || [])
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleStatusChange = async (newStatus: string) => {
    if (!project || project.status === newStatus) return

    const confirmed = window.confirm(
      `Mudar status para "${STATUS_LABELS[newStatus] || newStatus}"? Diretores serão notificados.`,
    )
    if (!confirmed) return

    try {
      const updatedProject = await updateProjectStatus(
        project.id,
        newStatus,
        project.name,
        userCtx?.user?.id || '',
        userCtx?.user?.full_name || 'Usuário',
      )
      setProject((prev: any) => ({ ...prev, status: newStatus }))
      toast({ title: 'Sucesso', description: 'Status do projeto atualizado com sucesso.' })
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao atualizar status.',
        variant: 'destructive',
      })
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando...</div>
  if (!project) return <div className="p-8 text-center text-gray-500">Projeto não encontrado</div>

  const leadArea = project.areas?.find((a: any) => a.is_lead)?.area?.name

  const isAdmin = userCtx?.profile?.is_admin === true
  const isCreator = project.created_by === userCtx?.user?.id
  const canChangeStatus = isAdmin || isCreator

  const availableTransitions = VALID_TRANSITIONS[project.status] || []
  const showStatusSelect = canChangeStatus && availableTransitions.length > 0

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/projetos">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">{project.name}</h1>
            {showStatusSelect ? (
              <Select value={project.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[160px] h-8 bg-transparent font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={project.status}>
                    {STATUS_LABELS[project.status] || project.status}
                  </SelectItem>
                  {availableTransitions.map((t) => (
                    <SelectItem key={t} value={t}>
                      {STATUS_LABELS[t] || t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge
                variant={project.status === 'active' ? 'default' : 'secondary'}
                className="uppercase"
              >
                {STATUS_LABELS[project.status] || project.status}
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-500 font-mono">
            {project.project_code} • {project.client?.name}
          </p>
        </div>
      </div>

      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-xl">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="demandas">Demandas</TabsTrigger>
          <TabsTrigger value="anexos">Anexos</TabsTrigger>
          <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
        </TabsList>

        <TabsContent
          value="timeline"
          className="mt-6 border rounded-lg bg-white p-6 shadow-sm min-h-[400px]"
        >
          <h3 className="text-lg font-semibold mb-4">Cronograma de Demandas</h3>
          <div className="space-y-4">
            {demands.length === 0 ? (
              <p className="text-sm text-gray-500">
                Nenhuma demanda registrada para montar a timeline.
              </p>
            ) : (
              <div className="relative border-l-2 border-gray-200 ml-4 space-y-6 py-4">
                {demands.map((d) => (
                  <div key={d.id} className="relative pl-6">
                    <div className="absolute w-3 h-3 bg-blue-600 rounded-full -left-[7px] top-1.5 border-2 border-white"></div>
                    <div className="bg-gray-50 p-3 rounded border text-sm max-w-lg shadow-sm">
                      <div className="font-semibold text-gray-900">{d.title}</div>
                      <div className="flex items-center text-xs text-gray-500 mt-2 gap-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />{' '}
                          {d.due_date ? format(new Date(d.due_date), 'dd/MM/yyyy') : 'Sem data'}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" /> {d.to_area?.name}
                        </span>
                        <Badge variant="outline" className="text-[10px] bg-white">
                          {d.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="demandas" className="mt-6 space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Demandas do Projeto</h3>
            <Button asChild size="sm">
              <Link to={`/projetos/${project.id}/demandas/nova`}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Demanda
              </Link>
            </Button>
          </div>

          <div className="border rounded-md bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Área Destino</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prazo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demands.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                      Nenhuma demanda encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  demands.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <Link
                          to={`/demandas/${d.id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {d.title}
                        </Link>
                      </TableCell>
                      <TableCell>{d.to_area?.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            d.priority === 'urgent'
                              ? 'border-red-600 text-red-600'
                              : d.priority === 'high'
                                ? 'border-orange-500 text-orange-500'
                                : 'border-gray-300'
                          }
                        >
                          {d.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>{d.status}</TableCell>
                      <TableCell>
                        {d.due_date ? format(new Date(d.due_date), 'dd/MM/yyyy') : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="anexos" className="mt-6 border rounded-lg bg-white p-6 shadow-sm">
          {project.id && <AttachmentsSection type="project" entityId={project.id} />}
        </TabsContent>

        <TabsContent value="detalhes" className="mt-6 border rounded-lg bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-6">Informações Gerais</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">Cliente</div>
                <div className="font-medium">{project.client?.name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Área Líder</div>
                <div className="font-medium">{leadArea || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Período</div>
                <div className="font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  {project.start_date
                    ? format(new Date(project.start_date), 'dd/MM/yyyy')
                    : '-'}{' '}
                  até {project.end_date ? format(new Date(project.end_date), 'dd/MM/yyyy') : '-'}
                </div>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Descrição / Escopo</div>
              <div className="text-sm whitespace-pre-wrap">
                {project.description || 'Sem descrição'}
              </div>

              <div className="mt-6">
                <div className="text-sm text-gray-500 mb-2">Todas as Áreas Envolvidas</div>
                <div className="flex flex-wrap gap-2">
                  {project.areas?.map((a: any) => (
                    <Badge key={a.id} variant="secondary">
                      {a.area?.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
