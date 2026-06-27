import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { getProjectById } from '@/services/projects'
import { getProjectPapers, getProjectMeetings } from '@/services/papers'
import { PaperInputsTab } from '@/components/papers/PaperInputsTab'
import { PaperMeetingTab } from '@/components/papers/PaperMeetingTab'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function PaperEditPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [project, setProject] = useState<any>(null)
  const [papers, setPapers] = useState<any[]>([])
  const [meetings, setMeetings] = useState<any[]>([])
  const [selectedVersion, setSelectedVersion] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
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
        console.error('Failed to fetch papers:', papersResult.reason)
        toast({
          title: 'Aviso',
          description: 'Não foi possível carregar os papers do projeto.',
          variant: 'destructive',
        })
      }

      if (meetingsResult.status === 'fulfilled') {
        setMeetings(meetingsResult.value || [])
      } else {
        console.error('Failed to fetch meetings:', meetingsResult.reason)
        toast({
          title: 'Aviso',
          description: 'Não foi possível carregar as reuniões de passagem.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Failed to fetch project:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível acessar o projeto. Por favor, tente novamente.',
        variant: 'destructive',
      })
      setLoading(false)
      navigate('/projetos')
    }
  }

  useEffect(() => {
    loadData()
  }, [projectId])

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando...</div>
  if (!project) return <div className="p-8 text-center text-gray-500">Projeto não encontrado</div>

  const currentPaper =
    papers.length > 0 ? papers.find((p) => p.id === selectedVersion) || papers[0] : null
  const isLatest = papers.length === 0 || papers[0].id === currentPaper?.id

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/projetos/${projectId}`}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">Paper do Projeto</h1>
            {currentPaper ? (
              <>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  v{currentPaper.version}
                </Badge>
                <Badge variant="secondary" className="uppercase tracking-widest text-[10px]">
                  {currentPaper.status}
                </Badge>
              </>
            ) : (
              <Badge variant="outline" className="bg-gray-100 text-gray-600">
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
        <TabsList className="grid w-full grid-cols-4 max-w-3xl">
          <TabsTrigger value="gerais">Dados Gerais</TabsTrigger>
          <TabsTrigger value="inputs">8 Inputs Estratégicos</TabsTrigger>
          <TabsTrigger value="reuniao">Reunião de Passagem</TabsTrigger>
          <TabsTrigger value="g3" disabled>
            Submeter para G3
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gerais" className="mt-6 border rounded-lg bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-6">Informações do Projeto</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
            <div>
              <span className="text-gray-500 block mb-1">Cliente:</span>
              <p className="font-medium text-base">{project.client?.name}</p>
            </div>
            {currentPaper && (
              <div>
                <span className="text-gray-500 block mb-1">
                  Data de Criação do Paper (v{currentPaper.version}):
                </span>
                <p className="font-medium">
                  {new Date(currentPaper.created_at).toLocaleString('pt-BR')}
                </p>
              </div>
            )}
            <div className="col-span-2">
              <span className="text-gray-500 block mb-1">Escopo Original (Breve):</span>
              <p className="font-medium whitespace-pre-wrap">{project.description}</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="inputs" className="mt-6">
          <PaperInputsTab
            paper={currentPaper}
            project={project}
            readOnly={currentPaper ? !isLatest || currentPaper.status !== 'draft' : false}
            onReload={loadData}
          />
        </TabsContent>

        <TabsContent value="reuniao" className="mt-6">
          <PaperMeetingTab projectId={projectId!} meetings={meetings} onReload={loadData} />
        </TabsContent>

        <TabsContent value="g3" className="mt-6">
          <div className="p-12 text-center text-gray-500 border border-dashed rounded-lg bg-gray-50 flex items-center justify-center">
            <span className="text-lg">Disponível na Sprint 3.B</span>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
