import { useState, useMemo } from 'react'
import { KanbanColumn } from './KanbanColumn'
import { AssignDialog } from './AssignDialog'
import { FeedbackDialog } from './FeedbackDialog'
import { KanbanFilters } from './KanbanFilters'
import { InternalReviewValidationDialog } from './InternalReviewValidationDialog'
import { useToast } from '@/hooks/use-toast'
import {
  moveDemandStage,
  type KanbanStage,
  type KanbanDemand,
  type CreativeUser,
} from '@/services/kanban'

interface PlanejamentoKanbanBoardProps {
  stages: KanbanStage[]
  demands: KanbanDemand[]
  teamUsers: CreativeUser[]
  isDirector: boolean
  currentUserId?: string
  onRefresh: () => Promise<void>
  /** Fired when a card is clicked — opens the detail sheet over the Kanban. */
  onCardClick?: (demand: KanbanDemand) => void
}

export function PlanejamentoKanbanBoard({
  stages,
  demands,
  teamUsers,
  isDirector,
  currentUserId,
  onRefresh,
  onCardClick,
}: PlanejamentoKanbanBoardProps) {
  const { toast } = useToast()

  // Filter state
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState('all')
  const [selectedProject, setSelectedProject] = useState('all')
  const [selectedPriority, setSelectedPriority] = useState('all')

  // Dragging & Dialog states
  const [draggedDemand, setDraggedDemand] = useState<KanbanDemand | null>(null)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedAssignDemand, setSelectedAssignDemand] = useState<KanbanDemand | null>(null)

  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false)
  const [selectedFeedbackDemand, setSelectedFeedbackDemand] = useState<KanbanDemand | null>(null)
  const [feedbackTargetStage, setFeedbackTargetStage] = useState<KanbanStage | null>(null)
  const [feedbackTitle, setFeedbackTitle] = useState('Solicitar Ajustes')
  const [feedbackDescription, setFeedbackDescription] = useState(
    'Informe os ajustes necessários na apresentação ou demanda.',
  )

  // Internal Review Validation Dialog (Stage 6 -> 7)
  const [validationDialogOpen, setValidationDialogOpen] = useState(false)
  const [selectedValidationDemand, setSelectedValidationDemand] = useState<KanbanDemand | null>(
    null,
  )
  const [validationTargetStage, setValidationTargetStage] = useState<KanbanStage | null>(null)

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
  // Rules:
  // - Pos 1 (Briefing): Visible to everyone linked to Planejamento (or director sees all).
  // - Pos 2 (Reunião com Equipe): Team sees cards.
  // - Pos 3, 4, 5 (Realização de Pesquisa, Apresentação de Papper, Planejamento Apresentação):
  //   Non-directors see cards where they are requester (from_user_id) OR requested/assigned (to_user_id / assigned_creative).
  //   Directors see all cards.
  const filteredDemandsByStage = useMemo(() => {
    const result: Record<string, KanbanDemand[]> = {}
    stages.forEach((s) => {
      result[s.id] = []
    })

    demands.forEach((demand) => {
      const stage = stages.find((s) => s.id === demand.kanban_stage_id)
      if (!stage) return

      // Filter: Search
      if (search.trim()) {
        const query = search.toLowerCase()
        const matchTitle = demand.title.toLowerCase().includes(query)
        const matchDesc = demand.description?.toLowerCase().includes(query)
        const matchProj = demand.project?.name.toLowerCase().includes(query)
        if (!matchTitle && !matchDesc && !matchProj) return
      }

      // Filter: Team User (Director only)
      if (selectedUser !== 'all') {
        if (selectedUser === 'unassigned') {
          if (demand.assigned_creative || demand.to_user_id) return
        } else {
          const matchUser =
            demand.assigned_creative?.id === selectedUser ||
            demand.to_user_id === selectedUser ||
            demand.from_user_id === selectedUser ||
            demand.assignments?.some((a) => a.assigned_to === selectedUser)
          if (!matchUser) return
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

    // Sort column position 2 (Reunião com Equipe) & 3 (Pesquisa) by due_date ASC, then created_at ASC
    const s2 = stages.find((s) => s.position === 2)
    if (s2 && result[s2.id]) {
      result[s2.id].sort((a, b) => {
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
    selectedUser,
    selectedProject,
    selectedPriority,
  ])

  const handleDragStart = (_e: React.DragEvent, demand: KanbanDemand) => {
    setDraggedDemand(demand)
  }

  // Helper check: is current user the requester (from_user_id) or requested/assigned (to_user_id)
  const isRequesterOrRequested = (demand: KanbanDemand): boolean => {
    if (!currentUserId) return false
    return (
      demand.from_user_id === currentUserId ||
      demand.to_user_id === currentUserId ||
      demand.assigned_creative?.id === currentUserId ||
      demand.assignments?.some((a) => a.assigned_to === currentUserId) ||
      false
    )
  }

  // Validate and handle moving card in Planejamento Kanban
  const handleMoveDemand = async (
    demand: KanbanDemand,
    targetStage: KanbanStage,
    customFeedback?: string,
    assignedUserId?: string,
  ) => {
    const currentStage = stages.find((s) => s.id === demand.kanban_stage_id)
    if (!currentStage || currentStage.id === targetStage.id) return

    const curPos = currentStage.position
    const targetPos = targetStage.position

    // ==========================================
    // REGRAS DE MOVIMENTAÇÃO POR COLUNA
    // ==========================================

    // 1. Coluna 1 "Briefing": somente o Diretor da Área de Planejamento pode mover cards.
    if (curPos === 1) {
      if (!isDirector) {
        toast({
          title: 'Ação não permitida',
          description:
            'Apenas o Diretor da Área de Planejamento pode mover cards da coluna Briefing.',
          variant: 'destructive',
        })
        return
      }
    }

    // 2. Coluna 2 "Reunião com Equipe": o Diretor da Área de Planejamento pode mover/distribuir para a equipe.
    if (curPos === 2) {
      if (!isDirector) {
        toast({
          title: 'Ação não permitida',
          description:
            'Apenas o Diretor da Área de Planejamento pode distribuir demandas da Reunião com Equipe.',
          variant: 'destructive',
        })
        return
      }
      // If moving from 2 to 3 (Realização de Pesquisa) and no assignee yet, prompt assignment
      if (targetPos === 3 && !assignedUserId && !demand.assigned_creative && !demand.to_user_id) {
        setSelectedAssignDemand(demand)
        setAssignDialogOpen(true)
        return
      }
    }

    // 3. Colunas 3, 4 e 5 ("Realização de Pesquisa", "Apresentação de Papper", "Planejamento Apresentação"):
    //    tanto o solicitante da demanda quanto o usuário solicitado (responsável) podem mover.
    if ([3, 4, 5].includes(curPos)) {
      const allowed = isDirector || isRequesterOrRequested(demand)
      if (!allowed) {
        toast({
          title: 'Ação não permitida',
          description:
            'Apenas o Solicitante ou o Solicitado (responsável) da demanda podem movimentar este card.',
          variant: 'destructive',
        })
        return
      }
    }

    // 4. Coluna 6 "Apresentação Interna": o Diretor de Área valida a apresentação, solicita ajustes ou aprova para Atendimento.
    if (curPos === 6) {
      if (!isDirector) {
        toast({
          title: 'Ação não permitida',
          description: 'Apenas o Diretor de Área pode validar e avançar a Apresentação Interna.',
          variant: 'destructive',
        })
        return
      }

      // If moving to stage 7 (Apresentação Atendimento) without review modal check, trigger modal
      if (targetPos === 7 && !customFeedback) {
        setSelectedValidationDemand(demand)
        setValidationTargetStage(targetStage)
        setValidationDialogOpen(true)
        return
      }

      // If moving backwards to stage 5 (Planejamento Apresentação) without feedback, prompt feedback
      if (targetPos === 5 && !customFeedback) {
        setSelectedFeedbackDemand(demand)
        setFeedbackTargetStage(targetStage)
        setFeedbackTitle('Solicitar Ajustes na Apresentação Interna')
        setFeedbackDescription('Informe à equipe de Planejamento o que precisa ser revisado.')
        setFeedbackDialogOpen(true)
        return
      }
    }

    // 5. Coluna 7 "Apresentação Atendimento": o Diretor de Área apresenta para o Atendimento / cliente.
    if (curPos === 7) {
      if (!isDirector) {
        toast({
          title: 'Ação não permitida',
          description:
            'Apenas o Diretor da Área de Planejamento pode gerenciar a Apresentação para Atendimento.',
          variant: 'destructive',
        })
        return
      }

      // If returning to stage 6 or 5 for adjustments from Atendimento/Client
      if (targetPos < 7 && !customFeedback) {
        setSelectedFeedbackDemand(demand)
        setFeedbackTargetStage(targetStage)
        setFeedbackTitle('Ajustes Solicitados pelo Atendimento / Cliente')
        setFeedbackDescription(
          'Registre os apontamentos do time de Atendimento ou do Cliente para ajuste.',
        )
        setFeedbackDialogOpen(true)
        return
      }
    }

    try {
      // Map stage to demand status
      let newDemandStatus = 'in_progress'
      if (targetPos === 1) newDemandStatus = 'pending'
      else if (targetPos === 6) newDemandStatus = 'review'
      else if (targetPos === 7) newDemandStatus = 'review'

      await moveDemandStage({
        demandId: demand.id,
        newStageId: targetStage.id,
        newStatus: newDemandStatus,
        feedback: customFeedback,
        assignedToUserId: assignedUserId,
        assignedByUserId: currentUserId,
      })

      toast({
        title: 'Demanda atualizada',
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

  const handleAssignConfirm = async (userId: string) => {
    if (!selectedAssignDemand) return
    const pesquisaStage = stages.find((s) => s.position === 3)
    if (!pesquisaStage) return

    await handleMoveDemand(selectedAssignDemand, pesquisaStage, undefined, userId)
    setSelectedAssignDemand(null)
  }

  const handleFeedbackConfirm = async (feedback: string) => {
    if (!selectedFeedbackDemand || !feedbackTargetStage) return
    await handleMoveDemand(selectedFeedbackDemand, feedbackTargetStage, feedback)
    setSelectedFeedbackDemand(null)
    setFeedbackTargetStage(null)
  }

  // Handle Internal Review Approval
  const handleInternalValidationApprove = async (data: {
    feedback?: string
    criacaoOk: boolean
    producaoOk: boolean
    outrasOk: boolean
  }) => {
    if (!selectedValidationDemand || !validationTargetStage) return

    const checksSummary = [
      `[Validação Diretor de Planejamento - Apresentação Interna]`,
      `✓ Criação: ${data.criacaoOk ? 'Validada/Completa' : 'Pendente'}`,
      `✓ Produção: ${data.producaoOk ? 'Validada/Completa' : 'Pendente'}`,
      `✓ Outras Áreas: ${data.outrasOk ? 'Validada/Completa' : 'Pendente'}`,
      data.feedback ? `Observações: ${data.feedback}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    await handleMoveDemand(selectedValidationDemand, validationTargetStage, checksSummary)
    setSelectedValidationDemand(null)
    setValidationTargetStage(null)
  }

  // Handle Internal Review Request Adjustments (Devolver para Planejamento Apresentação)
  const handleInternalValidationAdjust = async (feedback: string) => {
    if (!selectedValidationDemand) return
    const s5 = stages.find((s) => s.position === 5)
    if (!s5) return

    const feedbackText = `[Ajuste Solicitado na Apresentação Interna]: ${feedback}`
    await handleMoveDemand(selectedValidationDemand, s5, feedbackText)
    setSelectedValidationDemand(null)
    setValidationTargetStage(null)
  }

  const handleResetFilters = () => {
    setSearch('')
    setSelectedUser('all')
    setSelectedProject('all')
    setSelectedPriority('all')
  }

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <KanbanFilters
        search={search}
        onSearchChange={setSearch}
        selectedCreative={selectedUser}
        onCreativeChange={setSelectedUser}
        selectedProject={selectedProject}
        onProjectChange={setSelectedProject}
        selectedPriority={selectedPriority}
        onPriorityChange={setSelectedPriority}
        creatives={teamUsers}
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
            areaCode="planejamento"
            onDragStart={handleDragStart}
            onDropDemand={handleDropDemand}
            onAssignClick={(d) => {
              setSelectedAssignDemand(d)
              setAssignDialogOpen(true)
            }}
            onRequestFeedback={(d) => {
              // Contextual feedback target stage
              if (stage.position === 6) {
                const s5 = stages.find((s) => s.position === 5)
                if (s5) {
                  setSelectedFeedbackDemand(d)
                  setFeedbackTargetStage(s5)
                  setFeedbackTitle('Solicitar Ajustes na Apresentação')
                  setFeedbackDescription('Informe o que precisa ser ajustado antes de aprovar.')
                  setFeedbackDialogOpen(true)
                }
              } else if (stage.position === 7) {
                const s6 = stages.find((s) => s.position === 6)
                if (s6) {
                  setSelectedFeedbackDemand(d)
                  setFeedbackTargetStage(s6)
                  setFeedbackTitle('Ajustes Solicitados pelo Atendimento')
                  setFeedbackDescription(
                    'Informe os pontos de ajuste trazidos pelo Atendimento/Cliente.',
                  )
                  setFeedbackDialogOpen(true)
                }
              }
            }}
            onCustomValidate={(d, targetStage) => {
              setSelectedValidationDemand(d)
              setValidationTargetStage(targetStage)
              setValidationDialogOpen(true)
            }}
            onMoveDirect={(d, target) => handleMoveDemand(d, target)}
            onCardClick={onCardClick}
          />
        ))}
      </div>

      {/* Dialogs */}
      <AssignDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        demand={selectedAssignDemand}
        creatives={teamUsers}
        onConfirm={handleAssignConfirm}
        targetStageName="Realização de Pesquisa"
        roleLabel="planejador"
      />

      <FeedbackDialog
        open={feedbackDialogOpen}
        onOpenChange={setFeedbackDialogOpen}
        demand={selectedFeedbackDemand}
        title={feedbackTitle}
        description={feedbackDescription}
        onConfirm={handleFeedbackConfirm}
      />

      <InternalReviewValidationDialog
        open={validationDialogOpen}
        onOpenChange={setValidationDialogOpen}
        demand={selectedValidationDemand}
        onConfirmApprove={handleInternalValidationApprove}
        onRequestAdjustments={handleInternalValidationAdjust}
      />
    </div>
  )
}
