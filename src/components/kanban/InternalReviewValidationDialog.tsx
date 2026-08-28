import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { CheckCircle2, AlertCircle, Loader2, Layers } from 'lucide-react'
import type { KanbanDemand } from '@/services/kanban'

interface InternalReviewValidationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  demand: KanbanDemand | null
  onConfirmApprove: (data: {
    feedback?: string
    criacaoOk: boolean
    producaoOk: boolean
    outrasOk: boolean
  }) => Promise<void>
  onRequestAdjustments: (feedback: string) => Promise<void>
}

export function InternalReviewValidationDialog({
  open,
  onOpenChange,
  demand,
  onConfirmApprove,
  onRequestAdjustments,
}: InternalReviewValidationDialogProps) {
  const [criacaoOk, setCriacaoOk] = useState(true)
  const [producaoOk, setProducaoOk] = useState(true)
  const [outrasOk, setOutrasOk] = useState(true)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'adjust' | null>(null)

  useEffect(() => {
    if (open) {
      setCriacaoOk(true)
      setProducaoOk(true)
      setOutrasOk(true)
      setNotes('')
      setActionType(null)
    }
  }, [open])

  const handleApprove = async () => {
    try {
      setSubmitting(true)
      setActionType('approve')
      await onConfirmApprove({
        feedback: notes.trim() || undefined,
        criacaoOk,
        producaoOk,
        outrasOk,
      })
      onOpenChange(false)
    } finally {
      setSubmitting(false)
      setActionType(null)
    }
  }

  const handleRequestAdjustments = async () => {
    if (!notes.trim()) return
    try {
      setSubmitting(true)
      setActionType('adjust')
      await onRequestAdjustments(notes.trim())
      onOpenChange(false)
    } finally {
      setSubmitting(false)
      setActionType(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-white border-zinc-200 text-zinc-900 rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-rose-500">
            <Layers className="w-5 h-5" />
            <DialogTitle className="text-lg font-semibold text-zinc-900">
              Validação da Apresentação Interna
            </DialogTitle>
          </div>
          <DialogDescription className="text-zinc-500 text-xs">
            Como Diretor da Área, valide a apresentação, verifique as entregas das áreas envolvidas
            (Criação, Produção) e solicite ajustes ou aprove para o time de Atendimento.
          </DialogDescription>
        </DialogHeader>

        {demand && (
          <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-3 my-2 space-y-1">
            <p className="text-xs font-semibold text-zinc-800 line-clamp-1">{demand.title}</p>
            {demand.project && (
              <p className="text-[11px] text-zinc-500">
                Projeto: <span className="text-zinc-700 font-medium">{demand.project.name}</span>
              </p>
            )}
            {demand.assigned_creative && (
              <p className="text-[11px] text-zinc-500">
                Responsável:{' '}
                <span className="text-orange-500 font-medium">
                  {demand.assigned_creative.full_name}
                </span>
              </p>
            )}
          </div>
        )}

        <div className="space-y-4 py-2">
          {/* Entregas das áreas envolvidas */}
          <div className="space-y-2.5">
            <Label className="text-xs font-semibold text-zinc-800">
              Checklist de Entregas das Áreas Envolvidas
            </Label>
            <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-3 space-y-2.5">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-zinc-700">
                <Checkbox
                  checked={criacaoOk}
                  onCheckedChange={(checked) => setCriacaoOk(Boolean(checked))}
                  className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 rounded-md"
                />
                <span className="font-medium">Entrega da Criação validada / completa</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-zinc-700">
                <Checkbox
                  checked={producaoOk}
                  onCheckedChange={(checked) => setProducaoOk(Boolean(checked))}
                  className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 rounded-md"
                />
                <span className="font-medium">
                  Entrega da Produção (orçamentos/prazos) validada
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-zinc-700">
                <Checkbox
                  checked={outrasOk}
                  onCheckedChange={(checked) => setOutrasOk(Boolean(checked))}
                  className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 rounded-md"
                />
                <span className="font-medium">Outras áreas / insumos completos</span>
              </label>
            </div>
          </div>

          {/* Feedback ou Observações */}
          <div className="space-y-2">
            <Label htmlFor="internal-review-notes" className="text-xs font-medium text-zinc-700">
              Observações / Instruções de Ajuste
            </Label>
            <Textarea
              id="internal-review-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex.: Ajustar o slide de personas e alinhar a viabilidade técnica com Produção..."
              className="w-full bg-zinc-50 border-zinc-200 text-zinc-800 placeholder:text-zinc-400 focus:ring-orange-500 focus:border-orange-400 resize-none text-xs rounded-xl"
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between items-center mt-4 pt-2 border-t border-zinc-100">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="text-xs text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 w-full sm:w-auto"
          >
            Cancelar
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleRequestAdjustments}
              disabled={!notes.trim() || submitting}
              className="text-xs border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl"
              title={!notes.trim() ? 'Digite o feedback para solicitar ajustes' : undefined}
            >
              {submitting && actionType === 'adjust' ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
              )}
              Solicitar Ajustes
            </Button>

            <Button
              type="button"
              onClick={handleApprove}
              disabled={submitting}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl"
            >
              {submitting && actionType === 'approve' ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              )}
              Aprovar p/ Atendimento
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
