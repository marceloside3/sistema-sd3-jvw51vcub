import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getProjectDetails } from '@/services/projects'
import { format } from 'date-fns'

export default function ProjectDetails() {
  const { id } = useParams()
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) fetchProject(id)
  }, [id])

  async function fetchProject(projectId: string) {
    try {
      const data = await getProjectDetails(projectId)
      setProject(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8 text-center">Carregando...</div>
  if (!project) return <div className="p-8 text-center">Projeto não encontrado.</div>

  const demandsByArea = (project.demands || []).reduce((acc: any, d: any) => {
    const areaName = d.to_area?.name || 'Geral'
    if (!acc[areaName]) acc[areaName] = []
    acc[areaName].push(d)
    return acc
  }, {})

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link to="/projetos">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <Badge variant="outline" className="uppercase">
                {project.status}
              </Badge>
            </div>
            <p className="text-sm font-mono text-muted-foreground mt-1">
              {project.project_code} • Cliente: {project.client?.name}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link to={`/projetos/${project.id}/demandas/nova`}>
            <Plus className="w-4 h-4 mr-2" /> Nova Demanda
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="timeline">Timeline (Áreas)</TabsTrigger>
          <TabsTrigger value="demands">Demandas ({project.demands?.length || 0})</TabsTrigger>
          <TabsTrigger value="details">Detalhes</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Timeline de Demandas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.keys(demandsByArea).length === 0 ? (
                <p className="text-sm text-gray-500">Nenhuma demanda registrada.</p>
              ) : (
                Object.entries(demandsByArea).map(([area, items]: [string, any]) => (
                  <div key={area} className="space-y-2">
                    <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-500 border-b pb-1">
                      {area}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {items.map((d: any) => (
                        <Link key={d.id} to={`/demandas/${d.id}`} className="block">
                          <div
                            className={`p-3 border rounded-md shadow-sm hover:shadow transition-shadow ${d.status === 'done' ? 'bg-green-50 border-green-200' : 'bg-white'}`}
                          >
                            <p className="font-medium text-sm text-gray-900">{d.title}</p>
                            <div className="flex justify-between items-center mt-2 gap-4">
                              <Badge variant="secondary" className="text-[10px]">
                                {d.status}
                              </Badge>
                              <span className="text-[10px] text-gray-400 font-mono">
                                {d.due_date ? format(new Date(d.due_date), 'dd/MM') : 'S/ Data'}
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="demands">
          <div className="grid gap-4">
            {project.demands?.map((d: any) => (
              <Card key={d.id} className="hover:border-blue-300 transition-colors">
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <Link
                      to={`/demandas/${d.id}`}
                      className="font-semibold hover:text-blue-600 transition-colors text-lg block mb-1"
                    >
                      {d.title}
                    </Link>
                    <p className="text-sm text-gray-500 line-clamp-1">{d.description}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {d.to_area?.name}
                      </Badge>
                      <Badge
                        className="text-xs"
                        variant={d.priority === 'urgent' ? 'destructive' : 'secondary'}
                      >
                        {d.priority}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="mb-2 uppercase">
                      {d.status}
                    </Badge>
                    <p className="text-xs text-gray-400 block">
                      Criado em {format(new Date(d.created_at), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Projeto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <strong className="block text-sm text-gray-500">Descrição</strong>
                <p>{project.description || 'Nenhuma'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <strong className="block text-sm text-gray-500">Data de Início</strong>
                  <p>
                    {project.start_date ? format(new Date(project.start_date), 'dd/MM/yyyy') : '-'}
                  </p>
                </div>
                <div>
                  <strong className="block text-sm text-gray-500">Data de Fim</strong>
                  <p>{project.end_date ? format(new Date(project.end_date), 'dd/MM/yyyy') : '-'}</p>
                </div>
              </div>
              <div className="border-t pt-4">
                <strong className="block text-sm text-gray-500 mb-2">Áreas Envolvidas</strong>
                <div className="flex gap-2">
                  {project.project_areas?.map((pa: any) => (
                    <Badge key={pa.area.id} variant={pa.is_lead ? 'default' : 'secondary'}>
                      {pa.area.name} {pa.is_lead && '(Lead)'}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
