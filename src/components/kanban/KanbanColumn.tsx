import { useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
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
  onAssignClick?: (demand: KanbanDemand) => void
  onRequestFeedback?: (demand: KanbanDemand) => void
  onMoveDirect: (demand: KanbanDemand, targetStage: KanbanStage) => void
  /** Fired when a card is clicked — opens the detail sheet over the Kanban. */
  onCardClick?: (demand: KanbanDemand) => void
  areaCode?: string
  onCustomValidate?: (demand: KanbanDemand, targetStage: KanbanStage) => void
}

const COLLAPSED_KEY = (stageId: string) => `kanban-col-collapsed-${stageId}`

function readCollapsed(stageId: string): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_KEY(stageId)) === '1'
  } catch {
    return false
  }
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
  onCardClick,
  areaCode = 'criacao',
  onCustomValidate,
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [collapsed, setCollapsed] = useState<boolean>(() => readCollapsed(stage.id))

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(COLLAPSED_KEY(stage.id), next ? '1' : '0')
      } catch {
        /* ignore storage errors */
      }
      return next
    })
  }

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

  // Inline backgroundColor/borderColor override Tailwind classes.
  // Light keeps the soft stage-color tint.
  const containerStyle: React.CSSProperties = {
    backgroundColor: isDragOver ? tintStrong : tint,
    borderColor: isDragOver ? stage.color : borderColor,
  }

  // Collapsed view: thin vertical strip (~52px) with count + vertical title.
  // Stays in the horizontal flow so it works as a shortcut and doesn't break scroll.
  if (collapsed) {
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={containerStyle}
        className={cn(
          'flex flex-col flex-shrink-0 w-[52px] rounded-3xl border transition-all duration-300 min-h-[520px] items-center py-3 gap-2',
          isDragOver && 'ring-2',
        )}
      >
        <button
          type="button"
          onClick={toggleCollapsed}
          className="p-1 rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100/60 transition-colors"
          title="Expandir coluna"
          aria-label={`Expandir coluna ${stage.name}`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <span
          className="flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold shrink-0 shadow-sm"
          style={{ backgroundColor: stage.color }}
        >
          {demands.length}
        </span>
        <span
          className="text-sm font-semibold tracking-tight whitespace-nowrap"
          style={{ writingMode: 'vertical-rl', color: hexToRgba(stage.color, 0.95) }}
          title={stage.name}
        >
          {stage.name}
        </span>
      </div>
    )
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={containerStyle}
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
          className="text-sm font-semibold tracking-tight truncate"
          style={{ color: hexToRgba(stage.color, 0.85) }}
        >
          {stage.name}
        </h3>
        {/* Collapse toggle */}
        <button
          type="button"
          onClick={toggleCollapsed}
          className="ml-auto p-1 rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100/60 transition-colors"
          title="Colapsar coluna"
          aria-label={`Colapsar coluna ${stage.name}`}
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
        </button>
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
                demand.from_user_id === currentUserId ||
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
                onCardClick={onCardClick}
                areaCode={areaCode}
                onCustomValidate={onCustomValidate}
              />
            )
          })
        )}
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
      <span className={cn('text-xs font-medium text-zinc-400')}>
        {isDragOver ? 'Solte aqui para mover' : 'Nenhuma demanda'}
      </span>
    </div>
  )
}
