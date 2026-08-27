import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import {
  Send,
  ArrowLeft,
  FileText,
  Lock,
  Unlock,
  Check,
  X,
  RefreshCw,
  Banknote,
  Sparkles,
  Link as LinkIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { formatDateBR } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  getDemandDetails,
  updateDemandStatus,
  updateBudgetStatus,
  updatePaymentStatus,
  getDemandComments,
  addDemandComment,
} from '@/services/demands'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useToast } from '@/hooks/use-toast'
import { DetailSkeleton } from '@/components/ui/page-skeleton'
import { AttachmentsSection } from '@/components/attachments/AttachmentsSection'
import { DemandItemsSection } from '@/components/demands/DemandItemsSection'
import { DemandFinancialHeader } from '@/components/demands/DemandFinancialHeader'
import { DemandAuditHistory } from '@/components/demands/DemandAuditHistory'
import { DemandAuditHistoryDialog } from '@/components/demands/DemandAuditHistoryDialog'
import { logDemandAuditEntry } from '@/services/demand-audit'
import { useDemandAuditFilters } from '@/hooks/use-demand-audit-filters'
import { BUDGET_STATUS_CONFIG, PAYMENT_STATUS_CONFIG } from '@/lib/constants/demand-status'

export interface DemandDetailsProps {
  /** The demand id to load and render. */
  demandId: string
  /** Show the "back to project" arrow button. True on the full page, false in the Kanban sheet. */
  showBackButton?: boolean
  /** Extra node rendered in the header actions row (e.g. "Abrir em tela cheia" in the sheet). */
  headerExtras?: ReactNode
  /** Fired after any mutation that changes the demand (status, lock, budget, payment, comments)
   *  so a parent Kanban can refresh its cards. */
  onDemandChanged?: () => void
}

/**
 * Reusable demand details view — the single source of truth for rendering a
 * demanda. Consumed both by the full-page route (`DemandDetailsPage`) and by
 * the Kanban flyout (`DemandDetailSheet`), so the layout never drifts between
 * the two surfaces.
 */
export function DemandDetails({
  demandId,
  showBackButton = true,
  headerExtras,
  onDemandChanged,
}: DemandDetailsProps) {
  const { data: userCtx } = useCurrentUser()
  const { toast } = useToast()
  const [demand, setDemand] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [statusUpdating, setStatusUpdating] = useState(false)

  const [cancelReasonOpen, setCancelReasonOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState('')
  const [reason, setReason] = useState('')
  const [auditRefreshKey, setAuditRefreshKey] = useState(0)
  const [lockUpdating, setLockUpdating] = useState(false)
  const [budgetUpdating, setBudgetUpdating] = useState(false)
  const [paymentUpdating, setPaymentUpdating] = useState(false)
  const [itemsExpanded, setItemsExpanded] = useState(false)
  const auditFilters = useDemandAuditFilters()

  useEffect(() => {
    if (demandId) {
      loadData()
    }
  }, [demandId])

  async function loadData() {
    setLoading(true)
    try {
      const [d, c] = await Promise.all([getDemandDetails(demandId), getDemandComments(demandId)])
      setDemand(d)
      setComments(c)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === 'cancelled' || newStatus === 'rejected') {
      setPendingStatus(newStatus)
      setCancelReasonOpen(true)
      return
    }

    setStatusUpdating(true)
    try {
      await updateDemandStatus(demand.id, newStatus)
      if (userCtx?.id) {
        await logDemandAuditEntry({
          demand_id: demand.id,
          user_id: userCtx.id,
          field_name: 'status',
          old_value: demand.status,
          new_value: newStatus,
        })
      }
      setDemand({ ...demand, status: newStatus })
      setAuditRefreshKey((k) => k + 1)
      toast({ title: 'Status atualizado' })
      onDemandChanged?.()
    } catch (err) {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' })
    } finally {
      setStatusUpdating(false)
    }
  }

  const handleCancelConfirm = async () => {
    if (reason.length < 20)
      return toast({ title: 'Motivo deve ter pelo menos 20 caracteres', variant: 'destructive' })

    setStatusUpdating(true)
    try {
      await updateDemandStatus(demand.id, pendingStatus, reason)
      if (userCtx?.id) {
        await logDemandAuditEntry({
          demand_id: demand.id,
          user_id: userCtx.id,
          field_name: 'status',
          old_value: demand.status,
          new_value: pendingStatus,
        })
      }
      setDemand({ ...demand, status: pendingStatus, cancellation_reason: reason })
      setCancelReasonOpen(false)
      setAuditRefreshKey((k) => k + 1)
      toast({ title: 'Status atualizado' })
      onDemandChanged?.()
    } catch (err) {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' })
    } finally {
      setStatusUpdating(false)
    }
  }

  const handleToggleLock = async () => {
    setLockUpdating(true)
    try {
      const { updateDemandLock } = await import('@/services/demands')
      await updateDemandLock(demand.id, !demand.is_locked)
      if (userCtx?.id) {
        await logDemandAuditEntry({
          demand_id: demand.id,
          user_id: userCtx.id,
          field_name: 'is_locked',
          old_value: String(demand.is_locked),
          new_value: String(!demand.is_locked),
        })
      }
      setDemand({ ...demand, is_locked: !demand.is_locked })
      setAuditRefreshKey((k) => k + 1)
      toast({ title: demand.is_locked ? 'Demanda desbloqueada' : 'Demanda bloqueada' })
      onDemandChanged?.()
    } catch {
      toast({ title: 'Erro ao alterar bloqueio', variant: 'destructive' })
    } finally {
      setLockUpdating(false)
    }
  }

  const handleSendBudget = async () => {
    setBudgetUpdating(true)
    try {
      await updateBudgetStatus(demand.id, 'sent')
      if (userCtx?.id) {
        await logDemandAuditEntry({
          demand_id: demand.id,
          user_id: userCtx.id,
          field_name: 'budget_status',
          old_value: demand.budget_status || 'pending',
          new_value: 'sent',
        })
      }
      setDemand({ ...demand, budget_status: 'sent' })
      setAuditRefreshKey((k) => k + 1)
      toast({ title: 'Orçamento enviado para aprovação' })
      onDemandChanged?.()
    } catch {
      toast({ title: 'Erro ao enviar orçamento', variant: 'destructive' })
    } finally {
      setBudgetUpdating(false)
    }
  }

  const handleBudgetDecision = async (
    decision: 'approved' | 'rejected' | 'adjustments_requested',
  ) => {
    setBudgetUpdating(true)
    try {
      await updateBudgetStatus(demand.id, decision)
      if (userCtx?.id) {
        await logDemandAuditEntry({
          demand_id: demand.id,
          user_id: userCtx.id,
          field_name: 'budget_status',
          old_value: demand.budget_status || 'sent',
          new_value: decision,
        })
      }
      setDemand({ ...demand, budget_status: decision })
      setAuditRefreshKey((k) => k + 1)
      const labels: Record<string, string> = {
        approved: 'Orçamento aprovado',
        rejected: 'Orçamento reprovado',
        adjustments_requested: 'Ajustes solicitados',
      }
      toast({ title: labels[decision] })
      onDemandChanged?.()
    } catch {
      toast({ title: 'Erro ao processar decisão', variant: 'destructive' })
    } finally {
      setBudgetUpdating(false)
    }
  }

  const handleSendToFinance = async () => {
    setPaymentUpdating(true)
    try {
      await updatePaymentStatus(demand.id, 'requested')
      if (userCtx?.id) {
        await logDemandAuditEntry({
          demand_id: demand.id,
          user_id: userCtx.id,
          field_name: 'payment_status',
          old_value: demand.payment_status || 'none',
          new_value: 'requested',
        })
      }
      setDemand({ ...demand, payment_status: 'requested' })
      setAuditRefreshKey((k) => k + 1)
      toast({ title: 'Enviado para o Financeiro' })
      onDemandChanged?.()
    } catch {
      toast({ title: 'Erro ao enviar para Financeiro', variant: 'destructive' })
    } finally {
      setPaymentUpdating(false)
    }
  }

  const handleComment = async () => {
    if (!newComment.trim() || !userCtx) return
    try {
      await addDemandComment(demand.id, userCtx.id, newComment)
      setNewComment('')
      const c = await getDemandComments(demandId)
      setComments(c)
      onDemandChanged?.()
    } catch (err) {
      toast({ title: 'Erro ao comentar', variant: 'destructive' })
    }
  }

  const [producaoAreaId, setProducaoAreaId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProducaoAreaId() {
      const { data } = await import('@/lib/supabase/client').then((m) =>
        m.supabase
          .from('areas')
          .select('id, code, name')
          .or('code.eq.producao,name.ilike.%produção%,name.ilike.%producao%')
          .limit(1)
          .maybeSingle(),
      )
      if (data?.id) {
        setProducaoAreaId(data.id)
      }
    }
    fetchProducaoAreaId()
  }, [])

  const isCriacaoArea =
    demand?.to_area?.code === 'criacao' ||
    demand?.to_area?.name?.toLowerCase().includes('criação') ||
    demand?.to_area?.name?.toLowerCase().includes('criacao')

  const isProducaoDemand = Boolean(
    (producaoAreaId && demand?.to_area_id === producaoAreaId) ||
    demand?.to_area?.code === 'producao' ||
    demand?.to_area?.name?.toLowerCase().includes('produção') ||
    demand?.to_area?.name?.toLowerCase().includes('producao'),
  )

  const canViewFinancialAndItems = isProducaoDemand
  if (loading) return <DetailSkeleton />
  if (!demand) return <div className="p-8 text-center">Demanda não encontrada</div>

  return (
    <div
      className={
        itemsExpanded
          ? 'w-full max-w-[1800px] mx-auto px-4 sm:px-6 space-y-6'
          : 'max-w-6xl mx-auto space-y-6'
      }
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showBackButton && (
            <Button asChild variant="ghost" size="icon">
              <Link to={`/projetos/${demand.project_id}`}>
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">{demand.title}</h1>
            <Link
              to={`/projetos/${demand.project_id}`}
              className="text-sm text-blue-600 hover:underline"
            >
              Projeto: {demand.project?.name} ({demand.project?.project_code})
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {headerExtras}
          {demand.is_locked && (
            <Badge className="bg-red-100 text-red-700 border-red-200">
              <Lock className="w-3 h-3 mr-1" />
              Bloqueada
            </Badge>
          )}
          <Button
            variant={demand.is_locked ? 'destructive' : 'outline'}
            onClick={handleToggleLock}
            disabled={lockUpdating}
          >
            {demand.is_locked ? (
              <>
                <Unlock className="w-4 h-4 mr-2" />
                Desbloquear
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Bloquear para Edição
              </>
            )}
          </Button>
          <DemandAuditHistoryDialog
            demandId={demand.id}
            refreshKey={auditRefreshKey}
            filters={auditFilters}
          />
          {!isCriacaoArea &&
            canViewFinancialAndItems &&
            (demand.status === 'done' ? (
              <Button asChild>
                <Link to={`/demandas/${demand.id}/orcamento`}>
                  <FileText className="w-4 h-4 mr-2" />
                  Gerar Orçamento
                </Link>
              </Button>
            ) : (
              <Button disabled title="Disponível quando a demanda estiver concluída">
                <FileText className="w-4 h-4 mr-2" />
                Gerar Orçamento
              </Button>
            ))}
        </div>
      </div>
      {/* 1. Resumo financeiro rápido (Total Bruto, Total Custos, Margem Total: visível apenas para Produção ou Solicitante) */}
      {!isCriacaoArea && canViewFinancialAndItems && (
        <DemandFinancialHeader demandId={demand.id} refreshKey={auditRefreshKey} />
      )}
      {/* Card destacado de Descrição da Demanda */}
      {demand.description && (
        <div className="rounded-2xl border border-zinc-200/60 bg-zinc-50/50 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-700 mb-3">📝 Descrição da Demanda</h2>
          <p className="text-base text-foreground whitespace-pre-wrap leading-relaxed">
            {demand.description}
          </p>
        </div>
      )}
      {/* 2. Cabeçalho compacto de contexto e metadados da demanda */}{' '}
      <Card className="border shadow-sm bg-gradient-to-r from-card via-card to-muted/20">
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Status Atual
              </span>
              <Select
                value={demand.status}
                onValueChange={handleStatusChange}
                disabled={statusUpdating}
              >
                <SelectTrigger className="h-8 text-xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="review">Em Revisão</SelectItem>
                  <SelectItem value="done">Concluído</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Prioridade
              </span>
              <div className="font-medium text-xs sm:text-sm capitalize py-1">
                <Badge
                  variant={
                    demand.priority === 'urgent' || demand.priority === 'high'
                      ? 'destructive'
                      : 'outline'
                  }
                  className="font-semibold text-xs"
                >
                  {demand.priority === 'urgent'
                    ? 'Urgente'
                    : demand.priority === 'high'
                      ? 'Alta'
                      : demand.priority === 'low'
                        ? 'Baixa'
                        : 'Média'}
                </Badge>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                De → Para (Áreas)
              </span>
              <p
                className="font-medium text-xs sm:text-sm truncate py-1 text-foreground"
                title={`${demand.from_area?.name || '—'} → ${demand.to_area?.name || '—'}`}
              >
                {demand.from_area?.name || '—'} <span className="text-muted-foreground">→</span>{' '}
                {demand.to_area?.name || '—'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Solicitante
              </span>
              <p
                className="font-medium text-xs sm:text-sm truncate py-1"
                title={demand.from_user?.full_name || '—'}
              >
                {demand.from_user?.full_name || '—'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Responsável
              </span>
              <p
                className="font-medium text-xs sm:text-sm truncate py-1"
                title={demand.to_user?.full_name || 'Qualquer'}
              >
                {demand.to_user?.full_name || 'Qualquer membro'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Prazo Limite
              </span>
              <p className="font-medium text-xs sm:text-sm py-1 font-mono">
                {formatDateBR(demand.due_date)}
              </p>
            </div>

            {demand.tipo_criacao && (
              <div className="space-y-1">
                <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Tipo de Criação
                </span>
                <p className="font-medium text-xs sm:text-sm py-1">
                  {demand.tipo_criacao === 'peca_digital' && '🖥️ Peça Digital (SLA: 3 dias úteis)'}
                  {demand.tipo_criacao === 'peca_impressa' &&
                    '🖨️ Peça Impressa (SLA: 4 dias úteis)'}
                  {demand.tipo_criacao === '3d' && '🧊 3D (SLA: 5 dias úteis)'}
                  {!['peca_digital', 'peca_impressa', '3d'].includes(demand.tipo_criacao) &&
                    demand.tipo_criacao}
                </p>
              </div>
            )}

            {isCriacaoArea && demand.kanban_stage && (
              <div className="space-y-1">
                <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Estágio Kanban
                </span>
                <div className="py-1">
                  <Badge
                    variant="outline"
                    className="text-xs font-semibold bg-orange-500/10 text-orange-400 border-orange-500/20"
                  >
                    {demand.kanban_stage.name}
                  </Badge>
                </div>
              </div>
            )}
          </div>
          {demand.cancellation_reason && (
            <div className="mt-3 bg-red-50 p-2.5 rounded border border-red-200 text-xs text-red-800 flex items-center gap-2">
              <strong className="font-semibold">Motivo ({demand.status}):</strong>
              <span>{demand.cancellation_reason}</span>
            </div>
          )}

          {!isCriacaoArea && canViewFinancialAndItems && demand.status === 'done' && (
            <div className="mt-3 pt-3 border-t flex flex-wrap items-center justify-between gap-3 text-xs">
              {' '}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Orçamento:</span>
                  <Badge
                    className={
                      BUDGET_STATUS_CONFIG[demand.budget_status || 'pending']?.className || ''
                    }
                  >
                    {BUDGET_STATUS_CONFIG[demand.budget_status || 'pending']?.label || 'Pendente'}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Pagamento:</span>
                  <Badge
                    className={
                      PAYMENT_STATUS_CONFIG[demand.payment_status || 'none']?.className || ''
                    }
                  >
                    {PAYMENT_STATUS_CONFIG[demand.payment_status || 'none']?.label ||
                      'Não Iniciado'}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {userCtx?.id === demand.from_user_id && demand.budget_status === 'sent' && (
                  <>
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-green-600 hover:bg-green-700"
                      onClick={() => handleBudgetDecision('approved')}
                      disabled={budgetUpdating}
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Aprovar Orçamento
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                      onClick={() => handleBudgetDecision('adjustments_requested')}
                      disabled={budgetUpdating}
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1" />
                      Pedir Ajustes
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-50"
                      onClick={() => handleBudgetDecision('rejected')}
                      disabled={budgetUpdating}
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      Reprovar
                    </Button>
                  </>
                )}

                {(!!userCtx?.profile?.is_admin ||
                  !!userCtx?.areas?.some((a) => a.id === demand.to_area_id)) && (
                  <>
                    {(!demand.budget_status ||
                      demand.budget_status === 'pending' ||
                      demand.budget_status === 'adjustments_requested') && (
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={handleSendBudget}
                        disabled={budgetUpdating}
                      >
                        <Send className="w-3.5 h-3.5 mr-1" />
                        Enviar Orçamento
                      </Button>
                    )}
                    {demand.budget_status === 'approved' &&
                      (!demand.payment_status || demand.payment_status === 'none') && (
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-purple-600 hover:bg-purple-700"
                          onClick={handleSendToFinance}
                          disabled={paymentUpdating}
                        >
                          <Banknote className="w-3.5 h-3.5 mr-1" />
                          Enviar para Financeiro
                        </Button>
                      )}
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {/* 3. SEÇÃO CENTRAL DE DESTAQUE: ITENS DA DEMANDA (visível apenas para Produção ou Solicitante) */}
      {!isCriacaoArea && canViewFinancialAndItems && (
        <section id="demand-items-main-section" className="space-y-4">
          <DemandItemsSection
            demandId={demand.id}
            clientId={demand.project?.client_id ?? null}
            isLocked={!!demand.is_locked}
            isAdmin={!!userCtx?.profile?.is_admin}
            onItemsChanged={() => setAuditRefreshKey((k) => k + 1)}
            isExpanded={itemsExpanded}
            onToggleExpand={() => setItemsExpanded((v) => !v)}
          />
        </section>
      )}
      {/* 3b. SEÇÃO DETALHES DA CRIAÇÃO (visível apenas quando Área Destino = Criação) */}
      {isCriacaoArea && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-500" />
              <span>Detalhes da Criação</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {demand.tipo_criacao && (
              <div className="space-y-1 pb-2">
                <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Tipo de Criação
                </span>
                <p className="font-medium text-sm">
                  {demand.tipo_criacao === 'peca_digital' && '🖥️ Peça Digital (SLA: 3 dias úteis)'}
                  {demand.tipo_criacao === 'peca_impressa' &&
                    '🖨️ Peça Impressa (SLA: 4 dias úteis)'}
                  {demand.tipo_criacao === '3d' && '🧊 3D (SLA: 5 dias úteis)'}
                  {!['peca_digital', 'peca_impressa', '3d'].includes(demand.tipo_criacao) &&
                    demand.tipo_criacao}
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Entrega a ser feita
                </span>
                <p className="whitespace-pre-wrap text-foreground">
                  {demand.entrega_a_ser_feita || '—'}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Finalidade da Peça
                </span>
                <p className="text-foreground">{demand.finalidade_peca || '—'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Formato da Peça
                </span>
                <p className="text-foreground">{demand.formato_peca || '—'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Quantidade de Peças
                </span>
                <p className="text-foreground font-mono">{demand.quantidade_pecas ?? '—'}</p>
              </div>
            </div>

            {demand.direcional_pecas && (
              <div className="space-y-1 pt-2 border-t">
                <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Direcional de Cada Peça
                </span>
                <p className="whitespace-pre-wrap text-foreground">{demand.direcional_pecas}</p>
              </div>
            )}

            {/* Referências: links salvos no campo + anexos da demanda */}
            {(() => {
              const refs: Array<{ type: string; url?: string; file_name?: string }> = Array.isArray(
                demand.referencias,
              )
                ? demand.referencias
                : []
              const linkRefs = refs.filter((r) => r.type === 'link' && r.url)
              if (linkRefs.length === 0) return null
              return (
                <div className="space-y-1 pt-2 border-t">
                  <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Links de Referência
                  </span>
                  <ul className="space-y-1">
                    {linkRefs.map((r, idx) => (
                      <li key={idx}>
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-blue-600 hover:underline break-all"
                        >
                          <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-xs">{r.url}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}
      {/* 4. SEÇÕES SECUNDÁRIAS: Anexos, Comentários e Histórico (ocultadas quando em modo tela cheia/expandido) */}
      {!itemsExpanded && (
        <div className="grid md:grid-cols-2 gap-6 items-start pt-2">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <span>Comentários e Mensagens</span>
                {comments.length > 0 && (
                  <Badge variant="secondary" className="text-xs font-mono">
                    {comments.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-h-[360px] overflow-y-auto space-y-3 pr-2">
                {comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Nenhum comentário registrado ainda.
                  </p>
                ) : (
                  comments.map((c) => (
                    <div
                      key={c.id}
                      className={`flex flex-col ${c.user_id === userCtx?.id ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-xl p-3 text-sm ${
                          c.user_id === userCtx?.id
                            ? 'bg-orange-500 text-white'
                            : 'bg-zinc-100 text-zinc-800'
                        }`}
                      >
                        <div className="font-semibold text-xs opacity-80 mb-1">
                          {c.user?.full_name}
                        </div>
                        <div className="whitespace-pre-wrap">{c.content}</div>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1 px-1">
                        {format(new Date(c.created_at), 'dd/MM HH:mm')}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2 pt-3 border-t">
                <Textarea
                  placeholder="Escreva um comentário ou instrução..."
                  className="min-h-[44px] resize-none text-sm"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleComment()
                    }
                  }}
                />
                <Button
                  size="icon"
                  className="shrink-0 h-auto self-end px-3 py-2.5"
                  onClick={handleComment}
                  disabled={!newComment.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <AttachmentsSection kind="demand" entityId={demand.id} />
            <DemandAuditHistory
              demandId={demand.id}
              refreshKey={auditRefreshKey}
              filters={auditFilters}
            />
          </div>
        </div>
      )}
      <Dialog open={cancelReasonOpen} onOpenChange={setCancelReasonOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Motivo de {pendingStatus === 'cancelled' ? 'Cancelamento' : 'Rejeição'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label>Justificativa (mínimo 20 caracteres)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelReasonOpen(false)}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelConfirm}
              disabled={statusUpdating || reason.length < 20}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
