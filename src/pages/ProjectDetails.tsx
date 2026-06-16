import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Building2, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/stores/use-app-store'
import { GateTimeline } from '@/components/project/GateTimeline'
import { OverrideDialog } from '@/components/project/OverrideDialog'
import { AiAgentSection } from '@/components/project/AiAgentSection'

export default function ProjectDetails() {
  const { id } = useParams()
  const { projects } = useAppStore()
  const project = projects.find((p) => p.project_id === id)

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <h2 className="text-2xl font-bold mb-2">Projeto não encontrado</h2>
        <Button asChild variant="outline">
          <Link to="/">Voltar ao Dashboard</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link to="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold">{project.client_name}</h1>
            <Badge
              variant={project.status === 'waiting_gate' ? 'destructive' : 'default'}
              className="uppercase text-[10px]"
            >
              {project.status.replace('_', ' ')}
            </Badge>
          </div>
          <p className="text-sm font-mono text-muted-foreground mt-1">ID: {project.project_id}</p>
        </div>
        <div className="ml-auto">
          <OverrideDialog project={project} />
        </div>
      </div>

      {/* Timeline Section */}
      <Card className="shadow-sm border-t-4 border-t-primary">
        <CardHeader className="pb-0">
          <CardTitle className="text-lg">Linha do Tempo de Governança</CardTitle>
          <CardDescription>Acompanhe a progressão pelas 7 gates do fluxo SD3 v2.0</CardDescription>
        </CardHeader>
        <CardContent>
          <GateTimeline project={project} />
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Briefing Info */}
        <Card className="md:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-muted-foreground" /> Detalhes do Briefing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-sm font-medium text-muted-foreground">
                  Objetivo Principal
                </span>
                <p className="text-sm font-medium">{project.briefing_data.objective}</p>
              </div>
              <div className="space-y-1">
                <span className="text-sm font-medium text-muted-foreground">Público Alvo</span>
                <p className="text-sm font-medium">{project.briefing_data.target_audience}</p>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">
                Entregáveis Previstos
              </span>
              <div className="flex flex-wrap gap-2">
                {project.briefing_data.deliverables.map((d) => (
                  <Badge key={d} variant="secondary" className="bg-secondary/50">
                    {d}
                  </Badge>
                ))}
              </div>
            </div>
            <Separator />
            <AiAgentSection projectId={project.project_id} />
          </CardContent>
        </Card>

        {/* Metadata Sidebar */}
        <div className="space-y-6">
          <Card shadow-sm>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Metadados e Finanças
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Orçamento</span>
                <span className="font-mono font-medium">{project.briefing_data.budget}</span>
              </div>
              <Separator />
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> Kamino Sync ID (Fase 8)
                </span>
                <div className="bg-muted p-2 rounded text-xs font-mono text-muted-foreground border border-dashed flex items-center justify-center">
                  {project.kamino_sync_id || 'Aguardando Integração ERP'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
