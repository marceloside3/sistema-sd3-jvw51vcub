import { useState, useMemo } from 'react'
import { KanbanColumn } from './KanbanColumn'
import { AssignDialog } from './AssignDialog'
import { FeedbackDialog } from './FeedbackDialog'
import { KanbanFilters } from './KanbanFilters'
import { useToast } from '@/hooks/use-toast'
import {
  moveDemandStage,
  type KanbanStage,
  type KanbanDemand,
  type CreativeUser,
} from '@/services/kanban'

interface KanbanBoardProps {
  stages: KanbanStage[]
  demands: KanbanDemand[]
  creatives: CreativeUser[]
  isDirector: boolean
  currentUserId?: string
  isDark?: boolean
  onRefresh: () => Promise<void>
}

export function KanbanBoard({
  stages,
  demands,
  creatives,
  isDirector,
  currentUserId,
  isDark,
  onRefresh,
  onCardClick,
}: KanbanBoardProps) {
  const { toast } = useToast()

  // Filter state
  const [search, setSearch] = useState('')
  const [selectedCreative, setSelectedCreative] = useState('all')
  const [selectedProject, setSelectedProject] = useState('all')
  const [selectedPriority, setSelectedPriority] = useState('all')

  // Dragging & Dialog states
  const [draggedDemand, setDraggedDemand] = useState<KanbanDemand | null>(null)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedAssignDemand, setSelectedAssignDemand] = useState<KanbanDemand | null>(null)
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false)
  const [selectedFeedbackDemand, setSelectedFeedbackDemand] = useState<KanbanDemand | null>(null)
  const [feedbackTargetStage, setFeedbackTargetStage] = useState<KanbanStage | null>(null)

  // Unique projects list for filter
  const projectsList = useMemo(() => {
    const map = new Map<string, { id: string; name: string; project_code: string }>()
    demands.forEach((d) => {
      if (d.project && d.project.id) {
        map.set(d.project.id, {
          id: d.project.id,
          name: d.project.name,
          project_code: d.project.project_code,
        })
      }
    })
    return Array.from(map.values())
  }, [demands])

  // Filter & sort demands
  // Rule:
  // - If creative user (not director), in "A Fazer" (pos 2) and "Em Criação" (pos 3),
  //   they ONLY see their assigned cards.
  // - "A Fazer" column sorting: due_date ASC (nulls last), then created_at ASC (oldest first).
  const filteredDemandsByStage = useMemo(() => {
    const result: Record<string, KanbanDemand[]> = {}
    stages.forEach((s) => {
      result[s.id] = []
    })

    demands.forEach((demand) => {
      const stage = stages.find((s) => s.id === demand.kanban_stage_id)
      if (!stage) return

      // Visibility Rule for Creatives:
      // In columns "A Fazer" (pos 2) and "Em Criação" (pos 3), creatives only see their cards.
      // Director sees everything.
      if (!isDirector && (stage.position === 2 || stage.position === 3)) {
        const isAssignedToMe =
          demand.assigned_creative?.id === currentUserId ||
          demand.to_user_id === currentUserId ||
          demand.assignments?.some((a) => a.assigned_to === currentUserId)

        if (!isAssignedToMe) {
          return // Skip this card for creative
        }
      }

      // Filter: Search
      if (search.trim()) {
        const query = search.toLowerCase()
        const matchTitle = demand.title.toLowerCase().includes(query)
        const matchDesc = demand.description?.toLowerCase().includes(query)
        const matchProj = demand.project?.name.toLowerCase().includes(query)
        if (!matchTitle && !matchDesc && !matchProj) return
      }

      // Filter: Creative (Director only)
      if (selectedCreative !== 'all') {
        if (selectedCreative === 'unassigned') {
          if (demand.assigned_creative || demand.to_user_id) return
        } else {
          const matchCreative =
            demand.assigned_creative?.id === selectedCreative ||
            demand.to_user_id === selectedCreative ||
            demand.assignments?.some((a) => a.assigned_to === selectedCreative)
          if (!matchCreative) return
        }
      }

      // Filter: Project
      if (selectedProject !== 'all') {
        if (demand.project?.id !== selectedProject) return
      }

      // Filter: Priority
      if (selectedPriority !== 'all') {
        if (demand.priority !== selectedPriority) return
      }

      result[stage.id].push(demand)
    })

    // Sort "A Fazer" column (position 2) by due_date ASC, then created_at ASC
    const aFazerStage = stages.find((s) => s.position === 2)
    if (aFazerStage && result[aFazerStage.id]) {
      result[aFazerStage.id].sort((a, b) => {
        if (a.due_date && b.due_date) {
          const dComp = a.due_date.localeCompare(b.due_date)
          if (dComp !== 0) return dComp
        } else if (a.due_date && !b.due_date) {
          return -1
        } else if (!a.due_date && b.due_date) {
          return 1
        }
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      })
    }

    return result
  }, [
    stages,
    demands,
    isDirector,
    currentUserId,
    search,
    selectedCreative,
    selectedProject,
    selectedPriority,
  ])

  const handleDragStart = (_e: React.DragEvent, demand: KanbanDemand) => {
    setDraggedDemand(demand)
  }

  // Validate and handle moving card
  const handleMoveDemand = async (
    demand: KanbanDemand,
    targetStage: KanbanStage,
    customFeedback?: string,
    creativeUserId?: string,
  ) => {
    const currentStage = stages.find((s) => s.id === demand.kanban_stage_id)
    if (!currentStage || currentStage.id === targetStage.id) return

    const curPos = currentStage.position
    const targetPos = targetStage.position

    // Validation rules:
    // 1. Moving out of "Fila do Diretor" (pos 1): only director can move, and moving to "A Fazer" (pos 2) requires assigning a creative.
    if (curPos === 1) {
      if (!isDirector) {
        toast({
          title: 'Ação não permitida',
          description: 'Apenas o Diretor de Criação pode distribuir demandas da Fila do Diretor.',
          variant: 'destructive',
        })
        return
      }
      if (targetPos === 2 && !creativeUserId && !demand.assigned_creative) {
        // Trigger assign modal
        setSelectedAssignDemand(demand)
        setAssignDialogOpen(true)
        return
      }
    }

    // 2. Moving to "Aguardando Cliente" (pos 5) or "Concluído" (pos 6): only director can approve
    if ((targetPos === 5 || targetPos === 6) && !isDirector) {
      toast({
        title: 'Ação não permitida',
        description:
          'Apenas o Diretor de Criação pode aprovar e avançar para Aguardando Cliente ou Concluído.',
        variant: 'destructive',
      })
      return
    }

    // 3. Creatives can only move their own cards between "A Fazer" (2), "Em Criação" (3), and "Revisão Interna" (4)
    if (!isDirector) {
      const allowedTargetPositions = [2, 3, 4]
      if (!allowedTargetPositions.includes(targetPos)) {
        toast({
          title: 'Ação não permitida',
          description:
            'Criativos só podem movimentar cards entre A Fazer, Em Criação e Revisão Interna.',
          variant: 'destructive',
        })
        return
      }
    }

    // 4. Moving backward from "Revisão Interna" (pos 4) to "Em Criação" (pos 3): requires feedback
    if (curPos === 4 && targetPos === 3 && !customFeedback) {
      setSelectedFeedbackDemand(demand)
      setFeedbackTargetStage(targetStage)
      setFeedbackDialogOpen(true)
      return
    }

    try {
      // Map stage to demand status
      let newDemandStatus = 'in_progress'
      if (targetPos === 1) newDemandStatus = 'pending'
      else if (targetPos === 4) newDemandStatus = 'review'
      else if (targetPos === 6) newDemandStatus = 'done'

      await moveDemandStage({
        demandId: demand.id,
        newStageId: targetStage.id,
        newStatus: newDemandStatus,
        feedback: customFeedback,
        assignedToUserId: creativeUserId,
        assignedByUserId: currentUserId,
      })

      toast({
        title: 'Demanda movida',
        description: `Demanda movida para "${targetStage.name}".`,
      })

      await onRefresh()
    } catch (err: any) {
      console.error('Error moving demand stage:', err)
      toast({
        title: 'Erro ao movimentar demanda',
        description: err?.message || 'Ocorreu um erro ao atualizar o estágio.',
        variant: 'destructive',
      })
    } finally {
      setDraggedDemand(null)
    }
  }

  const handleDropDemand = (targetStage: KanbanStage) => {
    if (!draggedDemand) return
    handleMoveDemand(draggedDemand, targetStage)
  }

  const handleAssignConfirm = async (creativeUserId: string) => {
    if (!selectedAssignDemand) return
    const aFazerStage = stages.find((s) => s.position === 2)
    if (!aFazerStage) return

    await handleMoveDemand(selectedAssignDemand, aFazerStage, undefined, creativeUserId)
    setSelectedAssignDemand(null)
  }

  const handleFeedbackConfirm = async (feedback: string) => {
    if (!selectedFeedbackDemand || !feedbackTargetStage) return
    await handleMoveDemand(selectedFeedbackDemand, feedbackTargetStage, feedback)
    setSelectedFeedbackDemand(null)
    setFeedbackTargetStage(null)
  }

  const handleResetFilters = () => {
    setSearch('')
    setSelectedCreative('all')
    setSelectedProject('all')
    setSelectedPriority('all')
  }

  return (
    <div className="space-y-4 dark:bg-slate-900">
      {/* Filters Bar */}
      <KanbanFilters
        search={search}
        onSearchChange={setSearch}
        selectedCreative={selectedCreative}
        onCreativeChange={setSelectedCreative}
        selectedProject={selectedProject}
        onProjectChange={setSelectedProject}
        selectedPriority={selectedPriority}
        onPriorityChange={setSelectedPriority}
        creatives={creatives}
        projects={projectsList}
        isDirector={isDirector}
        onReset={handleResetFilters}
      />

      {/* Horizontal Scrollable Kanban Columns */}
      <div className="flex gap-4 overflow-x-auto pb-6 pt-1 items-start">
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            demands={filteredDemandsByStage[stage.id] || []}
            allStages={stages}
            isDirector={isDirector}
            currentUserId={currentUserId}
            onDragStart={handleDragStart}
            onDropDemand={handleDropDemand}
            onAssignClick={(d) => {
              setSelectedAssignDemand(d)
              setAssignDialogOpen(true)
            }}
            onRequestFeedback={(d) => {
              const emCriacaoStage = stages.find((s) => s.position === 3)
              if (emCriacaoStage) {
                setSelectedFeedbackDemand(d)
                setFeedbackTargetStage(emCriacaoStage)
                setFeedbackDialogOpen(true)
              }
            }}
            onMoveDirect={(d, target) => handleMoveDemand(d, target)}
          />
        ))}
      </div>

      {/* Dialogs */}
      <AssignDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        demand={selectedAssignDemand}
        creatives={creatives}
        onConfirm={handleAssignConfirm}
      />

      <FeedbackDialog
        open={feedbackDialogOpen}
        onOpenChange={setFeedbackDialogOpen}
        demand={selectedFeedbackDemand}
        onConfirm={handleFeedbackConfirm}
      />
    </div>
  )
}
