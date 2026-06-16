import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { StatCards } from '@/components/dashboard/StatCards'
import { GateAlerts } from '@/components/dashboard/GateAlerts'
import { ProjectsTable } from '@/components/dashboard/ProjectsTable'

export default function Index() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard HUB</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral de operações e portões de governança.
          </p>
        </div>
        <Button className="w-full sm:w-auto shadow-md">
          <Plus className="mr-2 h-4 w-4" /> Novo Projeto
        </Button>
      </div>

      <StatCards />
      <GateAlerts />
      <ProjectsTable />
    </div>
  )
}
