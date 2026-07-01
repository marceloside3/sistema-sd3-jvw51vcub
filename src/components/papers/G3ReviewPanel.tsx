import { useState } from 'react'
import { Check, X, Loader2, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { reviewPaperG3, overridePaperG3 } from '@/services/papers'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertTriangle } from 'lucide-react'

interface G3ReviewPanelProps {
  paper: any
  isAdmin: boolean
  onReload: () => void
}

export function G3ReviewPanel({ paper, isAdmin, onReload }: G3ReviewPanelProps) {
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [comment, setComment] = useState('')
  const [overrideOpen, setOverrideOpen] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')

  const handleApprove = async () => {
    setSubmitting(true)
    try {
      await reviewPaperG3(paper.id, 'approved')
      toast({ title: 'Sucesso', description: 'Paper aprovado no G3.' })
      onReload()
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Erro ao aprovar paper.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!comment.trim()) {
      toast({
        title: 'Comentário obrigatório',
        description: 'A recusa requer um comentário explicativo.',
        variant: 'destructive',
      })
      return
    }
    setSubmitting(true)
    try {
      await reviewPaperG3(paper.id, 'rejected', comment)
      toast({ title: 'Paper recusado', description: 'O dono do paper foi notificado.' })
      setRejecting(false)
      setComment('')
      onReload()
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Erro ao recusar paper.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleOverride = async () => {
    if (overrideReason.trim().length < 20) {
      toast({
        title: 'Justificativa insuficiente',
        description: 'A justificativa deve ter no mínimo 20 caracteres.',
        variant: 'destructive',
      })
      return
    }
    setSubmitting(true)
    try {
      await overridePaperG3(paper.id, overrideReason)
      toast({ title: 'Override aplicado', description: 'O G3 foi sobrescrito com sucesso.' })
      setOverrideOpen(false)
      setOverrideReason('')
      onReload()
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Erro ao aplicar override.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!paper) return null

  return (
    <div className="border rounded-lg bg-white p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Revisão G3 — Diretor de Planejamento</h3>
        {isAdmin && paper.status !== 'approved' && paper.status !== 'override' && (
          <Button
            variant="destructive"
            size="sm"
            className="transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
            onClick={() => setOverrideOpen(true)}
          >
            <AlertTriangle fill="currentColor" className="w-4 h-4 mr-1" />
            Override
          </Button>
        )}
      </div>

      {paper.status === 'submitted' ? (
        <div className="space-y-4">
          <div className="rounded-lg border p-4 bg-muted/30">
            <h4 className="text-sm font-medium mb-3">Resumo dos 8 Inputs Estratégicos</h4>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Objetivo Refinado:</dt>
                <dd className="whitespace-pre-wrap">{paper.refined_objective || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Mensagem Principal:</dt>
                <dd className="whitespace-pre-wrap">{paper.key_message || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Premissas e Restrições:</dt>
                <dd className="whitespace-pre-wrap">{paper.premises_restrictions || '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">KPIs:</dt>
                <dd className="whitespace-pre-wrap">
                  {Array.isArray(paper.kpis) ? paper.kpis.join(', ') : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Personas:</dt>
                <dd className="whitespace-pre-wrap">
                  {Array.isArray(paper.personas) ? paper.personas.join(', ') : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Prioridade de Canais:</dt>
                <dd className="whitespace-pre-wrap">
                  {Array.isArray(paper.channels_priority)
                    ? paper.channels_priority.join(', ')
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Alocação de Verba:</dt>
                <dd className="whitespace-pre-wrap">
                  {Array.isArray(paper.budget_allocation)
                    ? paper.budget_allocation.join(', ')
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Timeline:</dt>
                <dd className="whitespace-pre-wrap">
                  {Array.isArray(paper.timeline) ? paper.timeline.join(', ') : '—'}
                </dd>
              </div>
            </dl>
          </div>

          {rejecting ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Comentário de Recusa (obrigatório)</Label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Explique o motivo da recusa..."
                  className="min-h-[100px]"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRejecting(false)
                    setComment('')
                  }}
                >
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={handleReject} disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <X className="w-4 h-4 mr-2" />
                  )}
                  Confirmar Recusa
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                className="transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
                onClick={handleApprove}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Aprovar
              </Button>
              <Button
                variant="destructive"
                className="transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
                onClick={() => setRejecting(true)}
                disabled={submitting}
              >
                <MessageSquare fill="currentColor" className="w-4 h-4 mr-2" />
                Recusar
              </Button>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Este paper não está aguardando revisão no momento.
        </p>
      )}

      <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Override do G3
            </DialogTitle>
            <DialogDescription>
              Como Super Admin, você pode sobrescrever o Gate G3. Esta ação será registrada no log
              de auditoria.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Label>Justificativa (mínimo 20 caracteres)</Label>
            <Textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Justifique o motivo do override..."
              className="min-h-[100px]"
            />
            <span
              className={`text-xs ${
                overrideReason.trim().length < 20 ? 'text-red-500' : 'text-green-600'
              }`}
            >
              {overrideReason.trim().length}/20 caracteres mínimos
            </span>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleOverride}
              disabled={overrideReason.trim().length < 20 || submitting}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <AlertTriangle className="w-4 h-4 mr-2" />
              )}
              Confirmar Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
