import { Link } from 'react-router-dom'
import {
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2,
  User,
  ChevronRight,
  MessageSquare,
  ArrowRight,
  CornerUpLeft,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { KanbanDemand, KanbanStage } from '@/services/kanban'

interface KanbanCardProps {
  demand: KanbanDemand
  currentStage: KanbanStage
  allStages: KanbanStage[]
  isDirector: boolean
  isMyCard: boolean
  onDragStart: (e: React.DragEvent, demand: KanbanDemand) => void
  onAssignClick: (demand: KanbanDemand) => void
  onRequestFeedback: (demand: KanbanDemand) => void
  onMoveDirect: (demand: KanbanDemand, targetStage: KanbanStage) => void
}

export function KanbanCard({
  demand,
  currentStage,
  allStages,
  isDirector,
  isMyCard,
  onDragStart,
  onAssignClick,
  onRequestFeedback,
  onMoveDirect,
}: KanbanCardProps) {
  // Due date & Urgency calculation
  let isUrgent = false
  let daysLeft: number | null = null
  let formattedDate: string | null = null

  if (demand.due_date) {
    try {
      const due = new Date(demand.due_date + 'T00:00:00')
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const diffTime = due.getTime() - today.getTime()
      daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      isUrgent = daysLeft <= 3 && currentStage.position < 6 // Not urgent if already completed
      formattedDate = due.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    } catch {
      formattedDate = demand.due_date
    }
  }

  // Priority color & border style
  const getPriorityInfo = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return {
          label: 'Urgente',
          border: 'border-l-red-500',
          badge: 'bg-red-500/15 text-red-400 border-red-500/30',
        }
      case 'high':
        return {
          label: 'Alta',
          border: 'border-l-orange-500',
          badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
        }
      case 'low':
        return {
          label: 'Baixa',
          border: 'border-l-zinc-600',
          badge: 'bg-zinc-800 text-zinc-400 border-zinc-700',
        }
      case 'normal':
      default:
        return {
          label: 'Normal',
          border: 'border-l-blue-500',
          badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        }
    }
  }

  const priorityInfo = getPriorityInfo(demand.priority)

  // Drag permission check
  const canDrag = isDirector || isMyCard

  // Eligible next/prev stages for quick action
  const nextStage = allStages.find((s) => s.position === currentStage.position + 1)
  const prevStage = allStages.find((s) => s.position === currentStage.position - 1)

  return (
    <div
      draggable={canDrag}
      onDragStart={(e) => {
        if (canDrag) {
          e.dataTransfer.setData('text/plain', demand.id)
          onDragStart(e, demand)
        }
      }}
      className={cn(
        'group relative bg-zinc-900 border border-zinc-800 rounded-lg p-3.5 shadow-sm transition-all duration-200',
        'border-l-4',
        priorityInfo.border,
        canDrag
          ? 'cursor-grab active:cursor-grabbing hover:border-zinc-700 hover:shadow-md hover:bg-zinc-900/90'
          : 'opacity-90 cursor-default',
      )}
    >
      {/* Header: Project & Priority */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {demand.project && (
            <span
              className="text-[10px] font-semibold tracking-wider text-orange-400/90 uppercase truncate max-w-[150px] bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20"
              title={demand.project.name}
            >
              {demand.project.project_code || demand.project.name}
            </span>
          )}
          <Badge
            variant="outline"
            className={cn('text-[9px] px-1.5 py-0 uppercase font-semibold h-4', priorityInfo.badge)}
          >
            {priorityInfo.label}
          </Badge>
        </div>

        {/* Action button menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-6 h-6 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 -mr-1"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-zinc-950 border-zinc-800 text-zinc-200 w-48 text-xs"
          >
            <DropdownMenuItem asChild>
              <Link to={`/demandas/${demand.id}`} className="cursor-pointer">
                Ver detalhes da demanda
              </Link>
            </DropdownMenuItem>

            {/* Direct quick moves */}
            {isDirector && currentStage.position === 1 && nextStage && (
              <DropdownMenuItem
                onClick={() => onAssignClick(demand)}
                className="text-orange-400 cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5 mr-2" />
                Distribuir (A Fazer)
              </DropdownMenuItem>
            )}

            {/* If in Revisão Interna, director options */}
            {isDirector && currentStage.position === 4 && (
              <>
                <DropdownMenuSeparator className="bg-zinc-800" />
                {nextStage && (
                  <DropdownMenuItem
                    onClick={() => onMoveDirect(demand, nextStage)}
                    className="text-purple-400 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                    Aprovar (Aguardando Cliente)
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => onRequestFeedback(demand)}
                  className="text-red-400 cursor-pointer"
                >
                  <CornerUpLeft className="w-3.5 h-3.5 mr-2" />
                  Devolver p/ Criação
                </DropdownMenuItem>
              </>
            )}

            {/* If in Aguardando Cliente, options to proceed */}
            {isDirector && currentStage.position === 5 && (
              <>
                <DropdownMenuSeparator className="bg-zinc-800" />
                {nextStage && (
                  <DropdownMenuItem
                    onClick={() => onMoveDirect(demand, nextStage)}
                    className="text-green-400 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                    Cliente Aprovou (Concluir)
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => onRequestFeedback(demand)}
                  className="text-orange-400 cursor-pointer"
                >
                  <CornerUpLeft className="w-3.5 h-3.5 mr-2" />
                  Cliente Pediu Ajustes
                </DropdownMenuItem>
              </>
            )}

            {/* Creative moves between A Fazer (2) -> Em Criação (3) -> Revisão Interna (4) */}
            {(isDirector || isMyCard) && currentStage.position === 2 && (
              <DropdownMenuItem
                onClick={() => {
                  const s3 = allStages.find((s) => s.position === 3)
                  if (s3) onMoveDirect(demand, s3)
                }}
                className="cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5 mr-2 text-orange-400" />
                Iniciar (Em Criação)
              </DropdownMenuItem>
            )}

            {(isDirector || isMyCard) && currentStage.position === 3 && (
              <DropdownMenuItem
                onClick={() => {
                  const s4 = allStages.find((s) => s.position === 4)
                  if (s4) onMoveDirect(demand, s4)
                }}
                className="cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5 mr-2 text-red-400" />
                Enviar p/ Revisão Interna
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Demand Title & Tipo Criacao Badge */}
      <div className="mb-2.5 space-y-1">
        <Link
          to={`/demandas/${demand.id}`}
          className="block text-xs font-medium text-zinc-200 group-hover:text-orange-400 transition-colors line-clamp-2 leading-relaxed"
        >
          {demand.title}
        </Link>
        {demand.tipo_criacao && (
          <div className="inline-flex items-center gap-1 text-[10px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-700/60 font-medium">
            {demand.tipo_criacao === 'peca_digital' && '🖥️ Digital (3d)'}
            {demand.tipo_criacao === 'peca_impressa' && '🖨️ Impressa (4d)'}
            {demand.tipo_criacao === '3d' && '🧊 3D (5d)'}
          </div>
        )}
      </div>

      {/* Footer Info: Due date & Creative assigned */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800/80 text-[11px]">
        {/* Due date tag */}
        {demand.due_date ? (
          <div
            className={cn(
              'flex items-center gap-1 font-medium',
              isUrgent ? 'text-red-400 font-semibold animate-pulse' : 'text-zinc-400',
            )}
            title={daysLeft !== null ? `Prazo: ${daysLeft} dias restantes` : undefined}
          >
            {isUrgent ? (
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
            ) : (
              <Calendar className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
            )}
            <span>{formattedDate}</span>
            {isUrgent && daysLeft !== null && (
              <span className="text-[9px] bg-red-500/20 text-red-300 px-1 py-0.2 rounded">
                {daysLeft < 0 ? 'Atrasado' : `${daysLeft}d`}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 text-zinc-500">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-[10px]">Sem data</span>
          </div>
        )}

        {/* Assigned Creative Avatar/Badge */}
        {demand.assigned_creative ? (
          <div
            className="flex items-center gap-1.5 bg-zinc-800/80 hover:bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700/60 max-w-[130px]"
            title={`Responsável: ${demand.assigned_creative.full_name}`}
          >
            <div className="w-4 h-4 rounded-full bg-orange-500 text-zinc-950 flex items-center justify-center text-[9px] font-bold shrink-0">
              {demand.assigned_creative.full_name.charAt(0).toUpperCase()}
            </div>
            <span className="text-[10px] text-zinc-300 font-medium truncate">
              {demand.assigned_creative.full_name.split(' ')[0]}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-zinc-500 text-[10px]">
            <User className="w-3 h-3 text-zinc-600" />
            <span className="italic">Não atribuído</span>
          </div>
        )}
      </div>
    </div>
  )
}
