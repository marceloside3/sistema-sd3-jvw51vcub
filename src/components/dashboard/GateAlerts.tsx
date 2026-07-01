import { AlertCircle, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/stores/use-app-store'
import { GOVERNANCE_GATES } from '@/lib/types'

export function GateAlerts() {
  const { alerts, projects } = useAppStore()

  if (alerts.length === 0) return null

  return (
    <div className="mb-8 space-y-4">
      <h3 className="text-lg font-bold flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-destructive" />
        Alertas de Governança
      </h3>
      <div className="grid gap-3">
        {alerts.map((alert) => {
          const project = projects.find((p) => p.project_id === alert.project_id)
          const gateName = GOVERNANCE_GATES.find((g) => g.id === alert.gate_id)?.name

          return (
            <Alert
              key={alert.alert_id}
              variant="destructive"
              className="bg-destructive/10 border-destructive/20 text-destructive-foreground"
            >
              <AlertCircle className="h-4 w-4" />
              <div className="flex w-full items-center justify-between ml-2">
                <div>
                  <AlertTitle className="font-semibold text-foreground">
                    Bloqueio em {gateName} - {project?.client_name} ({project?.project_id})
                  </AlertTitle>
                  <AlertDescription className="text-foreground/80 mt-1">
                    {alert.message}
                  </AlertDescription>
                </div>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="bg-background text-foreground hover:bg-background/90 transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
                >
                  <Link to={`/projeto/${alert.project_id}`}>
                    Ver Projeto <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </Alert>
          )
        })}
      </div>
    </div>
  )
}
