import { TableCell, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Calendar, FileCheck2, GitBranch, Clock, Layers } from 'lucide-react'
import { formatDateBR } from '@/lib/utils'
import { SlaBadge } from '@/components/sla/SlaBadge'

interface HubExpandedRowProps {
  project: any
  slaLimit: number
  colSpan: number
}

export function HubExpandedRow({ project, slaLimit, colSpan }: HubExpandedRowProps) {
  return (
    <TableRow className="bg-muted/30 hover:bg-muted/30">
      <TableCell colSpan={colSpan} className="py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <GitBranch className="h-3 w-3" /> Origem
            </div>
            <Badge variant="outline" className="text-xs">
              {project.origin_type === 'handoff_comercial' ? 'Handoff Comercial' : 'Manual'}
            </Badge>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileCheck2 className="h-3 w-3" /> G2
            </div>
            {project.g2_status === 'approved' ? (
              <Badge className="bg-green-500 hover:bg-green-600 text-xs">Aprovado</Badge>
            ) : project.g2_status === 'override' ? (
              <Badge
                variant="secondary"
                className="bg-orange-100 text-orange-800 border-orange-200 text-xs"
              >
                Override
              </Badge>
            ) : (
              <Badge variant="outline" className="text-gray-400 text-xs">
                —
              </Badge>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> SLA
            </div>
            <SlaBadge startedAt={project.distributed_at} hoursLimit={slaLimit} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileCheck2 className="h-3 w-3" /> Briefing
            </div>
            {project.briefing_completed_at ? (
              <span className="text-green-600 text-xs font-medium flex items-center gap-1">
                <FileCheck2 className="h-3 w-3" /> Completo
              </span>
            ) : (
              <span className="text-amber-600 text-xs font-medium flex items-center gap-1">
                <Clock className="h-3 w-3" /> Pendente
              </span>
            )}
          </div>
          <div className="space-y-1 md:col-span-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Layers className="h-3 w-3" /> Áreas Envolvidas
            </div>
            <div className="flex flex-wrap gap-1">
              {project.project_areas?.map((pa: any, idx: number) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 h-5 font-normal"
                >
                  {pa.area?.name}
                </Badge>
              ))}
              {(!project.project_areas || project.project_areas.length === 0) && (
                <span className="text-gray-400 text-xs">-</span>
              )}
            </div>
          </div>
          <div className="space-y-1 md:col-span-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" /> Criado em
            </div>
            <span className="text-sm text-gray-600">{formatDateBR(project.created_at)}</span>
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
}
