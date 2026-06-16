import { Link } from 'react-router-dom'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/stores/use-app-store'
import { MACRO_AREAS, GOVERNANCE_GATES, SlaStatus, ProjectStatus } from '@/lib/types'
import { Eye } from 'lucide-react'

const statusMap: Record<
  ProjectStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  briefing: { label: 'Em Briefing', variant: 'secondary' },
  execution: { label: 'Execução', variant: 'default' },
  waiting_gate: { label: 'Aguardando Gate', variant: 'destructive' },
  finalized: { label: 'Finalizado', variant: 'outline' },
}

const slaMap: Record<SlaStatus, { label: string; color: string }> = {
  ok: { label: 'No Prazo', color: 'bg-green-500' },
  warning: { label: 'Atenção', color: 'bg-amber-500' },
  late: { label: 'Atrasado', color: 'bg-red-500' },
}

export function ProjectsTable() {
  const { projects } = useAppStore()

  return (
    <div className="rounded-md border bg-card text-card-foreground shadow-sm overflow-hidden">
      <div className="p-4 border-b flex justify-between items-center bg-muted/20">
        <h3 className="font-semibold text-lg">Projetos Prioritários</h3>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Área Atual</TableHead>
              <TableHead>Gate Ativo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>SLA</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => (
              <TableRow key={project.project_id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-mono text-xs">{project.project_id}</TableCell>
                <TableCell className="font-medium">{project.client_name}</TableCell>
                <TableCell>
                  {MACRO_AREAS.find((a) => a.id === project.current_area)?.name}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {GOVERNANCE_GATES.find((g) => g.id === project.active_gate)?.name}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={statusMap[project.status].variant}>
                    {statusMap[project.status].label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${slaMap[project.sla_status].color}`} />
                    <span className="text-sm">{slaMap[project.sla_status].label}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="hover:bg-primary/10 hover:text-primary"
                  >
                    <Link to={`/projeto/${project.project_id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
