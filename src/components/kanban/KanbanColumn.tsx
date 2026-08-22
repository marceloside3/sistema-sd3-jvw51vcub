import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { KanbanCard } from './KanbanCard'
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

// Convert a hex color (#RRGGBB) to an rgba() string with the given alpha.
function hexToRgba(hex: string, alpha: number): string {
  let h = hex.replace('#', '').trim()
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  }
  const r = parseInt(h.slice(0, 2), 16) || 0
  const g = parseInt(h.slice(2, 4), 16) || 0
  const b = parseInt(h.slice(4, 6), 16) || 0
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
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

  const handleDragLeave = () => setIsDragOver(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    onDropDemand(stage)
  }

  const tint = hexToRgba(stage.color, 0.07)
  const tintStrong = hexToRgba(stage.color, 0.12)
  const borderColor = hexToRgba(stage.color, 0.2)

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        backgroundColor: isDragOver ? tintStrong : tint,
        borderColor: isDragOver ? stage.color : borderColor,
      }}
      className={cn(
        'flex flex-col flex-shrink-0 w-80 md:w-[22rem] rounded-3xl border transition-all duration-200 min-h-[520px]',
        isDragOver && 'ring-2',
      )}
    >
      {/* Column Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-2.5">
        {/* Solid colored count circle */}
        <span
          className="flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold shrink-0 shadow-sm"
          style={{ backgroundColor: stage.color }}
        >
          {demands.length}
        </span>
        <h3
          className="text-sm font-semibold text-zinc-800 tracking-tight truncate"
          style={{ color: hexToRgba(stage.color, 0.85) }}
        >
          {stage.name}
        </h3>
      </div>

      {/* Cards List */}
      <div className="flex-1 px-3 space-y-2.5 overflow-y-auto max-h-[calc(100vh-340px)] min-h-[120px] pb-3">
        {demands.length === 0 ? (
          <EmptyDropZone isDragOver={isDragOver} tint={tintStrong} color={stage.color} />
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

      {/* Add new demand — dashed button matching the reference */}
      <div className="p-3">
        <Link
          to="/projetos"
          className={cn(
            'flex items-center justify-center gap-1.5 w-full py-2.5 rounded-2xl border-2 border-dashed text-xs font-medium transition-all duration-200',
            'text-zinc-400 hover:text-zinc-700 hover:border-zinc-300',
          )}
          style={{
            borderColor: isDragOver ? stage.color : undefined,
            backgroundColor: isDragOver ? hexToRgba(stage.color, 0.08) : 'rgba(255,255,255,0.5)',
          }}
          title="Criar nova demanda"
        >
          <Plus className="w-3.5 h-3.5" />
          Adicionar nova demanda
        </Link>
      </div>
    </div>
  )
}

function EmptyDropZone({
  isDragOver,
  tint,
  color,
}: {
  isDragOver: boolean
  tint: string
  color: string
}): ReactNode {
  return (
    <div
      className="h-28 rounded-2xl border-2 border-dashed flex items-center justify-center text-center p-4 transition-colors"
      style={{
        borderColor: isDragOver ? color : 'rgba(0,0,0,0.1)',
        backgroundColor: isDragOver ? tint : 'rgba(255,255,255,0.4)',
      }}
    >
      <span className="text-xs font-medium text-zinc-400">
        {isDragOver ? 'Solte aqui para mover' : 'Nenhuma demanda'}
      </span>
    </div>
  )
}
