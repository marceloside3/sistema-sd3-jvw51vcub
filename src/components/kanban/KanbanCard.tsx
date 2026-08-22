import { Link } from 'react-router-dom'
import {
  Clock,
  CheckCircle2,
  MoreHorizontal,
  ArrowRight,
  CornerUpLeft,
  MessageSquare,
  Paperclip,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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

// Priority badge styling — soft background, colored text
function getPriorityInfo(priority: string) {
  switch (priority) {
    case 'urgent':
      return {
        label: 'Urgente',
        badge: 'bg-rose-50 text-rose-600 border-rose-100',
        dot: 'bg-rose-500',
      }
    case 'high':
      return {
        label: 'Alta',
        badge: 'bg-red-50 text-red-600 border-red-100',
        dot: 'bg-red-500',
      }
    case 'low':
      return {
        label: 'Baixa',
        badge: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        dot: 'bg-emerald-500',
      }
    case 'normal':
    default:
      return {
        label: 'Média',
        badge: 'bg-orange-50 text-orange-600 border-orange-100',
        dot: 'bg-orange-500',
      }
  }
}

// Friendly relative-ish date label, e.g. "Amanhã 16:00" or "12 Ago 16:00"
function formatDueLabel(dueDate: string): { label: string; isToday: boolean; isTomorrow: boolean } {
  try {
    const due = new Date(dueDate + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const isToday = due.toDateString() === today.toDateString()
    const isTomorrow = due.toDateString() === tomorrow.toDateString()

    const timePart = due.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

    let label = due.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    if (isToday) label = `Hoje ${timePart}`
    else if (isTomorrow) label = `Amanhã ${timePart}`

    return { label, isToday, isTomorrow }
  } catch {
    return { label: dueDate, isToday: false, isTomorrow: false }
  }
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
  const priorityInfo = getPriorityInfo(demand.priority)
  const due = demand.due_date ? formatDueLabel(demand.due_date) : null

  // Urgency detection (within 2 days) — keeps it subtle
  let isUrgent = false
  if (demand.due_date) {
    try {
      const dueDate = new Date(demand.due_date + 'T00:00:00')
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const diff = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000)
      isUrgent = diff <= 2 && diff >= 0 && currentStage.position < 6
    } catch {
      /* ignore */
    }
  }

  const canDrag = isDirector || isMyCard

  const nextStage = allStages.find((s) => s.position === currentStage.position + 1)
  const commentCount = demand.comment_count ?? 0
  const attachmentCount = demand.attachment_count ?? 0

  const initials = demand.assigned_creative
    ? demand.assigned_creative.full_name.charAt(0).toUpperCase()
    : '?'

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
        'group relative bg-white rounded-2xl p-3.5 border border-zinc-100 transition-all duration-200',
        'shadow-[0_1px_3px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03)]',
        canDrag
          ? 'cursor-grab active:cursor-grabbing hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:-translate-y-0.5'
          : 'cursor-default',
      )}
    >
      {/* Title */}
      <div className="mb-2.5">
        <Link
          to={`/demandas/${demand.id}`}
          className="block text-[13px] font-semibold text-zinc-900 leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors"
        >
          {demand.title}
        </Link>
        {demand.project && (
          <span
            className="inline-block mt-1 text-[10px] font-medium text-zinc-400 truncate max-w-full"
            title={demand.project.name}
          >
            {demand.project.project_code || demand.project.name}
          </span>
        )}
      </div>

      {/* Priority badge */}
      <div className="flex items-center gap-1.5 mb-3">
        <span
          className={cn(
            'inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border',
            priorityInfo.badge,
          )}
        >
          <span className={cn('w-1.5 h-1.5 rounded-full', priorityInfo.dot)} />
          {priorityInfo.label}
        </span>
        {demand.tipo_criacao && (
          <span className="text-[10px] text-zinc-400 font-medium capitalize">
            {demand.tipo_criacao.replace('_', ' ')}
          </span>
        )}
      </div>

      {/* Footer: avatar + meta */}
      <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-zinc-100">
        {/* Left: avatar + due date */}
        <div className="flex items-center gap-2 min-w-0">
          {demand.assigned_creative ? (
            <div
              className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0 ring-2 ring-white"
              title={demand.assigned_creative.full_name}
            >
              {initials}
            </div>
          ) : (
            <div
              className="w-6 h-6 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center text-[10px] font-bold shrink-0 ring-2 ring-white"
              title="Não atribuído"
            >
              ?
            </div>
          )}

          {due ? (
            <div
              className={cn(
                'flex items-center gap-1 text-[10px] font-medium min-w-0',
                isUrgent ? 'text-rose-600' : 'text-zinc-500',
              )}
              title={`Prazo: ${demand.due_date}`}
            >
              <Clock
                className={cn('w-3 h-3 shrink-0', isUrgent ? 'text-rose-500' : 'text-zinc-400')}
              />
              <span className="truncate">{due.label}</span>
            </div>
          ) : null}
        </div>

        {/* Right: counters + check */}
        <div className="flex items-center gap-2 shrink-0">
          {commentCount > 0 && (
            <div className="flex items-center gap-0.5 text-[10px] text-zinc-400 font-medium">
              <MessageSquare className="w-3 h-3" />
              <span>{commentCount}</span>
            </div>
          )}
          {attachmentCount > 0 && (
            <div className="flex items-center gap-0.5 text-[10px] text-zinc-400 font-medium">
              <Paperclip className="w-3 h-3" />
              <span>{attachmentCount}</span>
            </div>
          )}

          {/* Discrete blue check */}
          <CheckCircle2 className="w-4 h-4 text-blue-500/70" />

          {/* Actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-0.5 rounded text-zinc-300 hover:text-zinc-700 hover:bg-zinc-100 transition-colors outline-none"
                title="Ações do card"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 text-xs">
              <DropdownMenuItem asChild>
                <Link to={`/demandas/${demand.id}`} className="cursor-pointer">
                  Ver detalhes da demanda
                </Link>
              </DropdownMenuItem>

              {isDirector && currentStage.position === 1 && nextStage && (
                <DropdownMenuItem
                  onClick={() => onAssignClick(demand)}
                  className="text-amber-600 cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5 mr-2" />
                  Distribuir (A Fazer)
                </DropdownMenuItem>
              )}

              {isDirector && currentStage.position === 4 && (
                <>
                  <DropdownMenuSeparator />
                  {nextStage && (
                    <DropdownMenuItem
                      onClick={() => onMoveDirect(demand, nextStage)}
                      className="text-violet-600 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                      Aprovar (Aguardando Cliente)
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => onRequestFeedback(demand)}
                    className="text-rose-600 cursor-pointer"
                  >
                    <CornerUpLeft className="w-3.5 h-3.5 mr-2" />
                    Devolver p/ Criação
                  </DropdownMenuItem>
                </>
              )}

              {isDirector && currentStage.position === 5 && (
                <>
                  <DropdownMenuSeparator />
                  {nextStage && (
                    <DropdownMenuItem
                      onClick={() => onMoveDirect(demand, nextStage)}
                      className="text-emerald-600 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                      Cliente Aprovou (Concluir)
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => onRequestFeedback(demand)}
                    className="text-amber-600 cursor-pointer"
                  >
                    <CornerUpLeft className="w-3.5 h-3.5 mr-2" />
                    Cliente Pediu Ajustes
                  </DropdownMenuItem>
                </>
              )}

              {(isDirector || isMyCard) && currentStage.position === 2 && (
                <DropdownMenuItem
                  onClick={() => {
                    const s3 = allStages.find((s) => s.position === 3)
                    if (s3) onMoveDirect(demand, s3)
                  }}
                  className="cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5 mr-2 text-indigo-500" />
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
                  <ArrowRight className="w-3.5 h-3.5 mr-2 text-rose-500" />
                  Enviar p/ Revisão Interna
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Urgent marker */}
      {isUrgent && (
        <span
          className="absolute top-0 left-3 right-3 h-0.5 rounded-full bg-rose-500/70"
          aria-hidden
        />
      )}
    </div>
  )
}
