import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, Send, Loader2, FilePlus2, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDateBR } from '@/lib/utils'
import { getProjectStatusLabel } from '@/lib/constants/project-status'
import { useToast } from '@/components/ui/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { getProjectById } from '@/services/projects'
import {
  getProjectPapers,
  getProjectMeetings,
  submitPaperToG3,
  createPaperVersion,
  getPaperG3Reviews,
} from '@/services/papers'
import { PaperInputsTab } from '@/components/papers/PaperInputsTab'
import { PaperMeetingTab } from '@/components/papers/PaperMeetingTab'
import { BenchmarksTab } from '@/components/papers/BenchmarksTab'
import { G3ReviewPanel } from '@/components/papers/G3ReviewPanel'
import { G3StatusBadge } from '@/components/papers/G3StatusBadge'
import { useCurrentUser } from '@/hooks/use-current-user'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const REQUIRED_FIELDS = [
  { key: 'refined_objective', label: 'Objetivo Refinado' },
  { key: 'personas', label: 'Personas', isArray: true },
  { key: 'key_message', label: 'Mensagem Principal' },
  { key: 'channels_priority', label: 'Prioridade de Canais', isArray: true },
  { key: 'kpis', label: 'KPIs', isArray: true },
  { key: 'timeline', label: 'Timeline', isArray: true },
  { key: 'budget_allocation', label: 'Alocação de Verba', isArray: true },
  { key: 'premises_restrictions', label: 'Premissas e Restrições' },
]

export default function PaperEditPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { data: currentUserData } = useCurrentUser()

  const [project, setProject] = useState<any>(null)
  const [papers, setPapers] = useState<any[]>([])
  const [meetings, setMeetings] = useState<any[]>([])
  const [reviews, setReviews] = useState<any[]>([])
  const [selectedVersion, setSelectedVersion] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [creatingVersion, setCreatingVersion] = useState(false)

  const loadData = useCallback(async () => {
    if (!projectId) return

    setLoading(true)
    try {
      const proj = await getProjectById(projectId)

      if (!proj) {
        toast({
          title: 'Projeto não encontrado',
          description: 'O projeto não existe ou você não tem permissão para acessá-lo.',
          variant: 'destructive',
        })
        setLoading(false)
        navigate('/projetos')
        return
      }

      setProject(proj)
      setLoading(false)

      const [papersResult, meetingsResult] = await Promise.allSettled([
        getProjectPapers(projectId),
        getProjectMeetings(projectId),
      ])

      if (papersResult.status === 'fulfilled') {
        const paps = papersResult.value || []
        setPapers(paps)
        if (paps.length > 0) {
          setSelectedVersion((prev) => prev || paps[0].id)
        }
      } else {
        toast({
          title: 'Aviso',
          description: 'Não foi possível carregar os papers do projeto.',
          variant: 'destructive',
        })
      }

      if (meetingsResult.status === 'fulfilled') {
        setMeetings(meetingsResult.value || [])
      } else {
        setMeetings([])
      }
    } catch (error: any) {
      const isPermissionError = error?.code === '42501' || error?.message?.includes('permission')
      toast({
        title: isPermissionError ? 'Acesso Negado' : 'Erro',
        description: isPermissionError
          ? 'Privilégios insuficientes para acessar este projeto.'
          : 'Não foi possível acessar o projeto.',
        variant: 'destructive',
      })
      setLoading(false)
      navigate('/projetos')
    }
  }, [projectId, navigate, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const refreshPapers = useCallback(async () => {
    if (!projectId) return
    try {
      const paps = await getProjectPapers(projectId)
      setPapers(paps || [])
      if (paps && paps.length > 0) {
        setSelectedVersion((prev) => prev || paps[0].id)
      }
    } catch {
      // silent fail for background refresh
    }
  }, [projectId])

  useEffect(() => {
    const paper =
      papers.length > 0 ? papers.find((p) => p.id === selectedVersion) || papers[0] : null
    if (!paper?.id) {
      setReviews([])
      return
    }
    getPaperG3Reviews(paper.id)
      .then((data) => setReviews(data || []))
      .catch(() => setReviews([]))
  }, [papers, selectedVersion])

  const currentPaper =
    papers.length > 0 ? papers.find((p) => p.id === selectedVersion) || papers[0] : null
  const isLatest = papers.length === 0 || papers[0].id === currentPaper?.id
  const isAdmin = currentUserData?.profile?.is_admin ?? false

  const isPaperOwner = currentUserData?.id === currentPaper?.created_by

  const isPlanningArea = useMemo(() => {
    if (!currentUserData) return false
    return currentUserData.areas?.some((a) => a.code?.toLowerCase() === 'planejamento') ?? false
  }, [currentUserData])

  const isDirector = currentUserData?.profile?.is_director ?? false

  const isPlanningDirector = useMemo(() => {
    if (!currentUserData) return false
    return isDirector && isPlanningArea
  }, [currentUserData, isPlanningArea, isDirector])

  const canEditPaper = isPaperOwner || isPlanningArea || isAdmin || isDirector

  const missingFields = useMemo(() => {
    if (!currentPaper) return REQUIRED_FIELDS.map((f) => f.label)
    const missing: string[] = []
    for (const field of REQUIRED_FIELDS) {
      if (field.isArray) {
        const val = currentPaper[field.key]
        if (!val || !Array.isArray(val) || val.length === 0) {
          missing.push(field.label)
        }
      } else {
        const val = currentPaper[field.key]
        if (!val || val.trim() === '') {
          missing.push(field.label)
        }
      }
    }
    return missing
  }, [currentPaper])

  const handleSubmitToG3 = async () => {
    if (!currentPaper) return
    if (missingFields.length > 0) {
      toast({
        title: 'Campos obrigatórios faltando',
        description: `Preencha: ${missingFields.join(', ')}`,
        variant: 'destructive',
      })
      return
    }
    setSubmitting(true)
    try {
      await submitPaperToG3(currentPaper.id)
      toast({
        title: 'Paper submetido ao G3',
        description: 'O Diretor de Planejamento foi notificado para revisão.',
      })
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao submeter',
        description: err.message || 'Não foi possível submeter o paper.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateVersion = async () => {
    if (!projectId) return
    setCreatingVersion(true)
    try {
      await createPaperVersion(projectId)
      toast({
        title: 'Nova versão criada',
        description: 'Uma nova versão do paper foi criada para edição.',
      })
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Não foi possível criar nova versão.',
        variant: 'destructive',
      })
    } finally {
      setCreatingVersion(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-zinc-500">Carregando...</div>
  if (!project) return <div className="p-8 text-center text-zinc-500">Projeto não encontrado</div>

  const canReview = isAdmin || isPlanningDirector
  const latestReview = reviews.length > 0 ? reviews[0] : null
  const approverName = latestReview?.reviewer?.full_name

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/projetos/${projectId}`}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="text-2xl font-bold">Paper do Projeto</h1>
            {currentPaper ? (
              <>
                <Badge variant="outline" className="bg-zinc-100 text-zinc-800 border-zinc-300">
                  v{currentPaper.version}
                </Badge>
                <G3StatusBadge paper={currentPaper} approverName={approverName} />
              </>
            ) : (
              <Badge variant="outline" className="bg-zinc-100 text-zinc-600 border-zinc-200">
                Novo Rascunho
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {project.project_code} • {project.name}
          </p>
        </div>
        {papers.length > 0 && (
          <div>
            <Select value={selectedVersion} onValueChange={setSelectedVersion}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Versão" />
              </SelectTrigger>
              <SelectContent>
                {papers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    Versão {p.version} {p.status === 'draft' ? '(Atual)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Tabs defaultValue="inputs" className="w-full">
        <TabsList className="grid w-full grid-cols-5 max-w-3xl">
          <TabsTrigger value="gerais">Dados Gerais</TabsTrigger>
          <TabsTrigger value="inputs">8 Inputs Estratégicos</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
          <TabsTrigger value="reuniao">Reunião de Passagem</TabsTrigger>
          <TabsTrigger value="g3">G3</TabsTrigger>
        </TabsList>

        <TabsContent value="gerais" className="mt-6 space-y-6">
          <div className="border rounded-lg bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Detalhes do Projeto</h3>
              {currentPaper && (
                <div className="text-sm text-gray-500">
                  Criado em: {new Date(currentPaper.created_at).toLocaleString('pt-BR')}
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Nome do Projeto</div>
                  <div className="font-medium">{project.name || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Código</div>
                  <div className="font-medium">{project.project_code || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Status</div>
                  <div className="font-medium">
                    {getProjectStatusLabel(project.status as any) || '-'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Origem</div>
                  <div className="font-medium capitalize">{project.origin_type}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Cliente</div>
                  <div className="font-medium">{project.client?.name}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Área Líder</div>
                  <div className="font-medium">
                    {project.areas?.find((a: any) => a.is_lead)?.area?.name || '-'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Período</div>
                  <div className="font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    {project.start_date ? formatDateBR(project.start_date) : '-'} até{' '}
                    {project.end_date ? formatDateBR(project.end_date) : '-'}
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
          </div>

          <div className="border rounded-lg bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-6">Briefing do Projeto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Objetivo</div>
                  <div className="text-sm whitespace-pre-wrap">
                    {project.briefing_data?.objetivo || 'Não informado'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Público-alvo</div>
                  <div className="text-sm whitespace-pre-wrap">
                    {project.briefing_data?.publico_alvo || 'Não informado'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Canais</div>
                  <div className="text-sm whitespace-pre-wrap">
                    {project.briefing_data?.canais || 'Não informado'}
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Orçamento</div>
                  <div className="text-sm font-medium">
                    {project.briefing_data?.budget || 'Não informado'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Restrições</div>
                  <div className="text-sm whitespace-pre-wrap">
                    {project.briefing_data?.restricoes || 'Não informado'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Referências</div>
                  <div className="text-sm whitespace-pre-wrap break-words">
                    {project.briefing_data?.referencias || 'Não informado'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="inputs" className="mt-6">
          <PaperInputsTab
            paper={currentPaper}
            project={project}
            readOnly={currentPaper ? !isLatest || currentPaper.status !== 'draft' : false}
            onReload={refreshPapers}
          />
          {currentPaper && isLatest && currentPaper.status === 'draft' && canEditPaper && (
            <div className="mt-4 border rounded-lg bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">Submeter ao Gate G3</h4>
                  {missingFields.length > 0 ? (
                    <p className="text-xs text-red-500 mt-1">
                      Campos faltando: {missingFields.join(', ')}
                    </p>
                  ) : (
                    <p className="text-xs text-green-600 mt-1">
                      Todos os 8 inputs estão preenchidos. Pronto para submeter.
                    </p>
                  )}
                </div>
                <Button
                  className="transition-all duration-300 ease-smooth hover:scale-[1.02] hover:shadow-md"
                  onClick={handleSubmitToG3}
                  disabled={submitting || missingFields.length > 0}
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send fill="currentColor" className="w-4 h-4 mr-2" />
                  )}
                  Submeter ao G3
                </Button>
              </div>
            </div>
          )}
          {currentPaper && currentPaper.status === 'rejected' && canEditPaper && (
            <div className="mt-4 border rounded-lg bg-red-50 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="w-4 h-4 text-red-500" />
                <h4 className="text-sm font-medium text-red-700">Paper recusado</h4>
              </div>
              {latestReview && latestReview.comment && (
                <p className="text-sm text-red-600 italic mb-3">
                  &quot;{latestReview.comment}&quot;
                </p>
              )}
              <Button
                className="transition-all duration-300 ease-smooth hover:scale-[1.02] hover:shadow-md"
                onClick={handleCreateVersion}
                disabled={creatingVersion}
                variant="default"
              >
                {creatingVersion ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FilePlus2 fill="currentColor" className="w-4 h-4 mr-2" />
                )}
                Criar nova versão
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="benchmarks" className="mt-6">
          <BenchmarksTab
            paper={currentPaper}
            readOnly={!isLatest || currentPaper?.status !== 'draft'}
            onReload={refreshPapers}
          />
        </TabsContent>

        <TabsContent value="reuniao" className="mt-6">
          <PaperMeetingTab projectId={projectId!} meetings={meetings} onReload={loadData} />
        </TabsContent>

        <TabsContent value="g3" className="mt-6 space-y-6">
          {currentPaper ? (
            <>
              <div className="border rounded-lg bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Status do Gate G3</h3>
                  <G3StatusBadge paper={currentPaper} approverName={approverName} />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {currentPaper.approved_at && (
                    <div>
                      <span className="text-muted-foreground">Aprovado em:</span>{' '}
                      <span className="font-medium">{formatDateBR(currentPaper.approved_at)}</span>
                    </div>
                  )}
                  {currentPaper.override_at && (
                    <div>
                      <span className="text-muted-foreground">Override em:</span>{' '}
                      <span className="font-medium">{formatDateBR(currentPaper.override_at)}</span>
                    </div>
                  )}
                  {currentPaper.override_reason && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Justificativa do Override:</span>
                      <p className="italic mt-1">&quot;{currentPaper.override_reason}&quot;</p>
                    </div>
                  )}
                </div>
              </div>

              {canReview && currentPaper.status === 'submitted' && (
                <G3ReviewPanel paper={currentPaper} isAdmin={isAdmin} onReload={loadData} />
              )}

              {!canReview && currentPaper.status !== 'submitted' && (
                <div className="p-8 text-center text-zinc-500 border border-dashed rounded-lg bg-zinc-50">
                  O painel de revisão G3 aparece quando há um paper aguardando aprovação.
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-zinc-500 border border-dashed rounded-lg bg-zinc-50">
              Crie um paper primeiro para acessar o Gate G3.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
