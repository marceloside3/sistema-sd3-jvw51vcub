import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { Send, ArrowLeft, FileText, Lock, Unlock } from 'lucide-react'
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
  getDemandComments,
  addDemandComment,
} from '@/services/demands'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useToast } from '@/hooks/use-toast'
import { AttachmentsSection } from '@/components/attachments/AttachmentsSection'
import { DemandItemsSection } from '@/components/demands/DemandItemsSection'
import { DemandFinancialHeader } from '@/components/demands/DemandFinancialHeader'
import { DemandAuditHistory } from '@/components/demands/DemandAuditHistory'
import { logDemandAuditEntry } from '@/services/demand-audit'

export default function DemandDetailsPage() {
  const { id } = useParams()
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

  useEffect(() => {
    if (id) {
      loadData()
    }
  }, [id])

  async function loadData() {
    setLoading(true)
    try {
      const [d, c] = await Promise.all([getDemandDetails(id!), getDemandComments(id!)])
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
      if (userCtx?.user?.id) {
        await logDemandAuditEntry({
          demand_id: demand.id,
          user_id: userCtx.user.id,
          field_name: 'status',
          old_value: demand.status,
          new_value: newStatus,
        })
      }
      setDemand({ ...demand, status: newStatus })
      setAuditRefreshKey((k) => k + 1)
      toast({ title: 'Status atualizado' })
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
      if (userCtx?.user?.id) {
        await logDemandAuditEntry({
          demand_id: demand.id,
          user_id: userCtx.user.id,
          field_name: 'status',
          old_value: demand.status,
          new_value: pendingStatus,
        })
      }
      setDemand({ ...demand, status: pendingStatus, cancellation_reason: reason })
      setCancelReasonOpen(false)
      setAuditRefreshKey((k) => k + 1)
      toast({ title: 'Status atualizado' })
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
      if (userCtx?.user?.id) {
        await logDemandAuditEntry({
          demand_id: demand.id,
          user_id: userCtx.user.id,
          field_name: 'is_locked',
          old_value: String(demand.is_locked),
          new_value: String(!demand.is_locked),
        })
      }
      setDemand({ ...demand, is_locked: !demand.is_locked })
      setAuditRefreshKey((k) => k + 1)
      toast({ title: demand.is_locked ? 'Demanda desbloqueada' : 'Demanda bloqueada' })
    } catch {
      toast({ title: 'Erro ao alterar bloqueio', variant: 'destructive' })
    } finally {
      setLockUpdating(false)
    }
  }

  const handleComment = async () => {
    if (!newComment.trim() || !userCtx?.user) return
    try {
      await addDemandComment(demand.id, userCtx.user.id, newComment)
      setNewComment('')
      const c = await getDemandComments(id!)
      setComments(c)
    } catch (err) {
      toast({ title: 'Erro ao comentar', variant: 'destructive' })
    }
  }

  if (loading) return <div className="p-8 text-center">Carregando...</div>
  if (!demand) return <div className="p-8 text-center">Demanda não encontrada</div>

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link to={`/projetos/${demand.project_id}`}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
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
          {demand.status === 'done' ? (
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
          )}
        </div>
      </div>

      <DemandFinancialHeader demandId={demand.id} refreshKey={auditRefreshKey} />

      <div className="grid md:grid-cols-3 gap-6 items-start">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detalhes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs text-gray-500 uppercase">Status Atual</span>
                <Select
                  value={demand.status}
                  onValueChange={handleStatusChange}
                  disabled={statusUpdating}
                >
                  <SelectTrigger>
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

              {demand.cancellation_reason && (
                <div className="bg-red-50 p-3 rounded text-sm text-red-800">
                  <strong className="block mb-1">Motivo ({demand.status}):</strong>
                  {demand.cancellation_reason}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-sm border-t pt-4">
                <span className="text-gray-500">Prioridade:</span>
                <span className="font-medium capitalize">{demand.priority}</span>

                <span className="text-gray-500">De (Área):</span>
                <span className="font-medium">{demand.from_area?.name}</span>

                <span className="text-gray-500">Solicitante:</span>
                <span className="font-medium">{demand.from_user?.full_name}</span>

                <span className="text-gray-500">Para (Área):</span>
                <span className="font-medium">{demand.to_area?.name}</span>

                <span className="text-gray-500">Responsável:</span>
                <span className="font-medium">{demand.to_user?.full_name || 'Qualquer'}</span>

                <span className="text-gray-500">Prazo:</span>
                <span className="font-medium">{formatDateBR(demand.due_date)}</span>
              </div>
            </CardContent>
          </Card>
          <DemandAuditHistory demandId={demand.id} refreshKey={auditRefreshKey} />
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Descrição da Demanda</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-gray-700 text-sm">{demand.description}</p>
            </CardContent>
          </Card>

          <DemandItemsSection
            demandId={demand.id}
            clientId={demand.project?.client_id ?? null}
            isLocked={!!demand.is_locked}
            isAdmin={!!userCtx?.profile?.is_admin}
            onItemsChanged={() => setAuditRefreshKey((k) => k + 1)}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Comentários e Histórico</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-h-[400px] overflow-y-auto space-y-4 pr-2">
                {comments.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">Nenhum comentário ainda.</p>
                ) : (
                  comments.map((c) => (
                    <div
                      key={c.id}
                      className={`flex flex-col ${c.user_id === userCtx?.user?.id ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 text-sm ${c.user_id === userCtx?.user?.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
                      >
                        <div className="font-semibold text-xs opacity-75 mb-1">
                          {c.user?.full_name}
                        </div>
                        <div className="whitespace-pre-wrap">{c.content}</div>
                      </div>
                      <span className="text-[10px] text-gray-400 mt-1">
                        {format(new Date(c.created_at), 'dd/MM HH:mm')}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2 pt-4 border-t">
                <Textarea
                  placeholder="Escreva um comentário..."
                  className="min-h-[40px] resize-none"
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
                  className="shrink-0 h-auto"
                  onClick={handleComment}
                  disabled={!newComment.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-6">
        <AttachmentsSection kind="demand" entityId={demand.id} />
      </div>

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
