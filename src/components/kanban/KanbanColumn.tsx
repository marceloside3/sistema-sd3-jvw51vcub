import { useState } from 'react'
import { KanbanCard } from './KanbanCard'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { KanbanDemand, KanbanStage } from '@/services/kanban'

interface KanbanColumnProps {
  stage: KanbanStage
  demands: KanbanDemand[]
  allStages: KanbanStage[]
  isDirector: boolean
  currentUserId?: string
  onDragStart: (e: React.DragEvent, demand: KanbanDemand) => void
  onDropDemand: (targetStage: KanbanStage) => void
  onAssignClick: (demand: KanbanDemand) => void
  onRequestFeedback: (demand: KanbanDemand) => void
  onMoveDirect: (demand: KanbanDemand, targetStage: KanbanStage) => void
}

export function KanbanColumn({
  stage,
  demands,
  allStages,
  isDirector,
  currentUserId,
  onDragStart,
  onDropDemand,
  onAssignClick,
  onRequestFeedback,
  onMoveDirect,
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (!isDragOver) setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    onDropDemand(stage)
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'flex flex-col flex-shrink-0 w-80 md:w-84 bg-zinc-950/60 rounded-xl border transition-all duration-200 min-h-[500px]',
        isDragOver
          ? 'border-orange-500 bg-orange-500/5 ring-2 ring-orange-500/20'
          : 'border-zinc-800/80 hover:border-zinc-700/80',
      )}
    >
      {/* Column Header */}
      <div className="p-3.5 border-b border-zinc-800/80 flex items-center justify-between sticky top-0 bg-zinc-950/90 rounded-t-xl z-10 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <span
            className="w-3 h-3 rounded-full shrink-0 shadow-sm"
            style={{ backgroundColor: stage.color }}
          />
          <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wide">{stage.name}</h3>
        </div>
        <Badge
          variant="secondary"
          className="bg-zinc-800/90 text-zinc-300 hover:bg-zinc-800 font-bold text-xs h-5 px-2"
        >
          {demands.length}
        </Badge>
      </div>

      {/* Cards List with Scroll */}
      <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto max-h-[calc(100vh-280px)] min-h-[160px]">
        {demands.length === 0 ? (
          <div
            className={cn(
              'h-32 border-2 border-dashed rounded-lg flex items-center justify-center text-center p-4 transition-colors',
              isDragOver
                ? 'border-orange-500/60 bg-orange-500/10 text-orange-400'
                : 'border-zinc-800/60 text-zinc-600',
            )}
          >
            <span className="text-xs font-medium">
              {isDragOver ? 'Solte aqui para mover' : 'Nenhuma demanda'}
            </span>
          </div>
        ) : (
          demands.map((demand) => {
            const isMyCard = Boolean(
              currentUserId &&
              (demand.assigned_creative?.id === currentUserId ||
                demand.to_user_id === currentUserId ||
                demand.assignments?.some((a) => a.assigned_to === currentUserId)),
            )

            return (
              <KanbanCard
                key={demand.id}
                demand={demand}
                currentStage={stage}
                allStages={allStages}
                isDirector={isDirector}
                isMyCard={isMyCard}
                onDragStart={onDragStart}
                onAssignClick={onAssignClick}
                onRequestFeedback={onRequestFeedback}
                onMoveDirect={onMoveDirect}
              />
            )
          })
        )}
      </div>
    </div>
  )
}
