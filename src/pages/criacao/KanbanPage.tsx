import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, RefreshCw, ShieldAlert, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { DemandDetailSheet } from '@/components/kanban/DemandDetailSheet'
import { KanbanLoadingSkeleton } from '@/components/kanban/KanbanLoadingSkeleton'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useToast } from '@/hooks/use-toast'
import {
  getKanbanStages,
  getCreationTeamUsers,
  getKanbanDemands,
  type KanbanStage,
  type KanbanDemand,
  type CreativeUser,
} from '@/services/kanban'

export default function KanbanPage() {
  const { data: currentUser, loading: userLoading } = useCurrentUser()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stages, setStages] = useState<KanbanStage[]>([])
  const [demands, setDemands] = useState<KanbanDemand[]>([])
  const [creatives, setCreatives] = useState<CreativeUser[]>([])

  // Demand detail flyout — opens over the Kanban without leaving /criacao.
  const [sheetDemandId, setSheetDemandId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  // Access check: User must be linked to "criacao" area or be admin
  const isLinkedToCriacao = currentUser?.areas?.some((a) => a.code === 'criacao')
  const isAdmin = Boolean(currentUser?.profile?.is_admin)
  const hasAccess = Boolean(isLinkedToCriacao || isAdmin)

  // Director check: user with is_director = true linked to criacao (or admin)
  const isDirector = Boolean(currentUser?.profile?.is_director || currentUser?.profile?.is_admin)

  const loadKanbanData = useCallback(async () => {
    try {
      const [stagesData, creativesData, demandsRes] = await Promise.all([
        getKanbanStages('criacao'),
        getCreationTeamUsers(),
        getKanbanDemands(),
      ])

      setStages(stagesData)
      setCreatives(creativesData)
      setDemands(demandsRes.demands)
    } catch (err: any) {
      console.error('Failed to load kanban data:', err)
      toast({
        title: 'Erro ao carregar Kanban',
        description: err?.message || 'Falha ao buscar dados do Kanban da Criação.',
        variant: 'destructive',
      })
    }
  }, [toast])

  useEffect(() => {
    if (!userLoading && hasAccess) {
      setLoading(true)
      loadKanbanData().finally(() => setLoading(false))
    }
  }, [userLoading, hasAccess, loadKanbanData])

  const handleManualRefresh = async () => {
    setRefreshing(true)
    await loadKanbanData()
    setRefreshing(false)
  }

  // Clicking a card opens the demand details in a right-side sheet over the
  // Kanban. The board stays mounted underneath, so scroll position and the
  // per-column expand/collapse state are preserved exactly when it closes.
  const handleCardClick = (demand: KanbanDemand) => {
    setSheetDemandId(demand.id)
    setSheetOpen(true)
  }

  const handleSheetOpenChange = (open: boolean) => {
    setSheetOpen(open)
  }

  // Loading state
  if (userLoading || (loading && hasAccess)) {
    return <KanbanLoadingSkeleton />
  }

  // Access restriction screen
  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto text-center p-6 bg-white border border-zinc-100 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-zinc-900 mb-2">Acesso Restrito à Área de Criação</h2>
        <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
          Você não possui vínculo ativo com a área de <strong>Criação</strong>. Caso precise de
          acesso ao Kanban de Criação, solicite ao administrador do sistema.
        </p>
        <Button asChild variant="outline" className="border-zinc-200 hover:bg-zinc-50">
          <Link to="/">Voltar ao Início</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-full min-h-[calc(100vh-6rem)] transition-colors">
      {/* Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
                Criação - Kanban
              </h1>
              <p className="text-xs text-zinc-500">
                Fluxo de produção visual e distribuição de peças da equipe criativa
              </p>
            </div>
          </div>
        </div>
        {/* Header Actions & Profile Badge */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-zinc-100 text-xs shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <Users className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-zinc-400">Perfil:</span>
            <span className="font-semibold text-zinc-700">
              {isDirector ? 'Diretor de Criação' : 'Criativo'}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 text-xs h-8 rounded-xl"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Kanban Board Component */}
      <KanbanBoard
        stages={stages}
        demands={demands}
        creatives={creatives}
        isDirector={isDirector}
        currentUserId={currentUser?.id}
        onRefresh={loadKanbanData}
        onCardClick={handleCardClick}
      />

      {/* Demand detail flyout — opens over the Kanban (URL stays on /criacao). */}
      <DemandDetailSheet
        demandId={sheetDemandId}
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        onDemandChanged={loadKanbanData}
      />
    </div>
  )
}
