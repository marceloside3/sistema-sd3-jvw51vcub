import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, MessageSquare, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  getDemandById,
  getDemandComments,
  createDemandComment,
  updateDemand,
} from '@/services/demands'
import { useCurrentUser } from '@/hooks/use-current-user'
import { format } from 'date-fns'
import { useToast } from '@/components/ui/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function DemandaDetalhePage() {
  const { id } = useParams()
  const [demand, setDemand] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const { data: currentUser } = useCurrentUser()
  const { toast } = useToast()

  const loadData = async () => {
    if (!id) return
    try {
      const [d, c] = await Promise.all([getDemandById(id), getDemandComments(id)])
      setDemand(d)
      setComments(c || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  const handlePostComment = async () => {
    if (!newComment.trim()) return
    try {
      await createDemandComment({
        demand_id: id,
        user_id: currentUser?.user?.id,
        content: newComment,
      })
      setNewComment('')
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if ((newStatus === 'cancelled' || newStatus === 'rejected') && cancelReason.length < 20) {
      toast({
        title: 'Atenção',
        description: 'Justificativa deve ter pelo menos 20 caracteres.',
        variant: 'destructive',
      })
      return
    }
    setStatusUpdating(true)
    try {
      await updateDemand(id as string, {
        status: newStatus,
        cancellation_reason:
          newStatus === 'cancelled' || newStatus === 'rejected' ? cancelReason : null,
      })
      toast({ title: 'Sucesso', description: 'Status atualizado' })
      setCancelReason('')
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setStatusUpdating(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando...</div>
  if (!demand) return <div className="p-8 text-center text-gray-500">Demanda não encontrada</div>

  const isMyDemand =
    demand.from_user_id === currentUser?.user?.id ||
    demand.to_user_id === currentUser?.user?.id ||
    currentUser?.profile?.is_admin

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{demand.title}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Projeto:{' '}
            <Link to={`/projetos/${demand.project_id}`} className="text-blue-600 hover:underline">
              {demand.project?.project_code}
            </Link>
          </p>
        </div>
        <div className="ml-auto">
          <Badge variant="outline" className="text-sm px-3 py-1 bg-white">
            {demand.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-5 rounded-lg border shadow-sm space-y-4">
            <h3 className="font-semibold border-b pb-2">Metadados</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-500 block">Solicitante</span>{' '}
                {demand.from_user?.full_name}
              </div>
              <div>
                <span className="text-gray-500 block">Área Destino</span> {demand.to_area?.name}
              </div>
              <div>
                <span className="text-gray-500 block">Responsável</span>{' '}
                {demand.to_user?.full_name || 'Não atribuído'}
              </div>
              <div>
                <span className="text-gray-500 block">Prioridade</span> {demand.priority}
              </div>
              <div>
                <span className="text-gray-500 block">Prazo</span>{' '}
                {demand.due_date ? format(new Date(demand.due_date), 'dd/MM/yyyy') : '-'}
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg border shadow-sm space-y-4">
            <h3 className="font-semibold border-b pb-2">Ações de Status</h3>
            {isMyDemand ? (
              <div className="space-y-4">
                <Select
                  disabled={statusUpdating}
                  value={demand.status}
                  onValueChange={(v) => {
                    if (v !== 'cancelled' && v !== 'rejected') {
                      handleStatusChange(v)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Mudar status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="in_progress">Em Progresso</SelectItem>
                    <SelectItem value="review">Em Revisão</SelectItem>
                    <SelectItem value="done">Concluído</SelectItem>
                  </SelectContent>
                </Select>

                {demand.status !== 'cancelled' &&
                  demand.status !== 'rejected' &&
                  demand.status !== 'done' && (
                    <div className="pt-4 border-t space-y-2">
                      <span className="text-sm font-medium text-red-600 block">
                        Cancelar / Rejeitar
                      </span>
                      <Textarea
                        placeholder="Justificativa (min 20 char)"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className="text-sm"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleStatusChange('rejected')}
                          disabled={statusUpdating || cancelReason.length < 20}
                        >
                          Rejeitar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleStatusChange('cancelled')}
                          disabled={statusUpdating || cancelReason.length < 20}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Sem permissão para alterar status.</p>
            )}

            {demand.cancellation_reason && (
              <div className="mt-4 p-3 bg-red-50 text-red-800 text-sm rounded-md border border-red-100">
                <strong>Motivo ({demand.status}):</strong> {demand.cancellation_reason}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h3 className="font-semibold mb-4">Descrição da Demanda</h3>
            <div className="whitespace-pre-wrap text-gray-700 text-sm">{demand.description}</div>
          </div>

          <div className="bg-white p-6 rounded-lg border shadow-sm flex flex-col h-[500px]">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Comentários
            </h3>

            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
              {comments.length === 0 ? (
                <div className="text-center text-sm text-gray-500 py-10">
                  Nenhum comentário ainda.
                </div>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className={`flex flex-col max-w-[80%] ${c.user_id === currentUser?.user?.id ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                  >
                    <span className="text-xs text-gray-500 mb-1 px-1">
                      {c.user?.full_name} • {format(new Date(c.created_at), 'dd/MM HH:mm')}
                    </span>
                    <div
                      className={`p-3 rounded-lg text-sm shadow-sm ${c.user_id === currentUser?.user?.id ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-100 text-gray-900 rounded-tl-none'}`}
                    >
                      {c.content}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-end gap-2 pt-4 border-t">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escreva um comentário..."
                className="resize-none min-h-[60px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handlePostComment()
                  }
                }}
              />
              <Button onClick={handlePostComment} disabled={!newComment.trim() || statusUpdating}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
