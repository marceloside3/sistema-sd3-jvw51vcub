import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, PlayCircle, ShieldAlert, CheckCircle2 } from 'lucide-react'
import { useAppStore } from '@/stores/use-app-store'

export function StatCards() {
  const { projects } = useAppStore()

  const stats = {
    briefing: projects.filter((p) => p.status === 'briefing').length,
    execution: projects.filter((p) => p.status === 'execution').length,
    blocked: projects.filter((p) => p.status === 'waiting_gate').length,
    finalized: projects.filter((p) => p.status === 'finalized').length,
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
      <Card className="hover-card-elevate border-l-4 border-l-primary">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Em Briefing</CardTitle>
          <FileText className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.briefing}</div>
        </CardContent>
      </Card>

      <Card className="hover-card-elevate border-l-4 border-l-blue-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Em Execução</CardTitle>
          <PlayCircle className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.execution}</div>
        </CardContent>
      </Card>

      <Card className="hover-card-elevate border-l-4 border-l-destructive">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Aguardando Gate</CardTitle>
          <ShieldAlert className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.blocked}</div>
          <p className="text-xs text-muted-foreground mt-1 text-destructive font-medium">
            Ação Requerida
          </p>
        </CardContent>
      </Card>

      <Card className="hover-card-elevate border-l-4 border-l-green-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Finalizados</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.finalized}</div>
        </CardContent>
      </Card>
    </div>
  )
}
