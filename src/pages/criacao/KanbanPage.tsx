import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  RefreshCw,
  Layers,
  ChevronRight,
  ShieldAlert,
  Loader2,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
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

  // Loading state
  if (userLoading || (loading && hasAccess)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        <span className="text-sm text-zinc-400">Carregando Kanban da Criação...</span>
      </div>
    )
  }

  // Access restriction screen
  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto text-center p-6 bg-zinc-900 border border-zinc-800 rounded-xl">
        <div className="w-12 h-12 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-zinc-100 mb-2">Acesso Restrito à Área de Criação</h2>
        <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
          Você não possui vínculo ativo com a área de <strong>Criação</strong>. Caso precise de
          acesso ao Kanban de Criação, solicite ao administrador do sistema.
        </p>
        <Button asChild variant="outline" className="border-zinc-700 hover:bg-zinc-800">
          <Link to="/">Voltar ao Início</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-full">
      {/* Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-zinc-400 mb-1.5">
            <Link to="/" className="hover:text-zinc-200 transition-colors">
              Início
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
            <span className="text-zinc-200 font-medium">Criação</span>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
            <span className="text-orange-400 font-semibold">Kanban</span>
          </nav>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-500/15 text-orange-400 flex items-center justify-center border border-orange-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
                Criação - Kanban
              </h1>
              <p className="text-xs text-zinc-400">
                Fluxo de produção visual e distribuição de peças da equipe criativa
              </p>
            </div>
          </div>
        </div>

        {/* Header Actions & Profile Badge */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
            <Users className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-zinc-400">Perfil:</span>
            <span className="font-semibold text-zinc-200">
              {isDirector ? 'Diretor de Criação' : 'Criativo'}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 text-xs h-8"
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
      />
    </div>
  )
}
