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
      <Card className="hover-card-elevate border-l-4 border-l-orange-500">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Em Briefing</CardTitle>
          <FileText fill="currentColor" className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.briefing}</div>
        </CardContent>
      </Card>

      <Card className="hover-card-elevate border-l-4 border-l-gray-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Em Execução</CardTitle>
          <PlayCircle fill="currentColor" className="h-4 w-4 text-gray-800" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.execution}</div>
        </CardContent>
      </Card>

      <Card className="hover-card-elevate border-l-4 border-l-destructive">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Aguardando Gate</CardTitle>
          <ShieldAlert fill="currentColor" className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.blocked}</div>
          <p className="text-xs text-muted-foreground mt-1 text-destructive font-medium">
            Ação Requerida
          </p>
        </CardContent>
      </Card>

      <Card className="hover-card-elevate border-l-4 border-l-green-600">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Finalizados</CardTitle>
          <CheckCircle2 fill="currentColor" className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.finalized}</div>
        </CardContent>
      </Card>
    </div>
  )
}
