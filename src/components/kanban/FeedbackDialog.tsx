import { useState } from 'react'
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
import { AlertCircle, Loader2 } from 'lucide-react'
import type { KanbanDemand } from '@/services/kanban'

interface FeedbackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  demand: KanbanDemand | null
  onConfirm: (feedback: string) => Promise<void>
}

export function FeedbackDialog({ open, onOpenChange, demand, onConfirm }: FeedbackDialogProps) {
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleConfirm = async () => {
    if (!feedback.trim()) return
    try {
      setSubmitting(true)
      await onConfirm(feedback.trim())
      setFeedback('')
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-white border-zinc-200 text-zinc-900 rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-rose-500">
            <AlertCircle className="w-5 h-5" />
            <DialogTitle className="text-lg font-semibold text-zinc-900">
              Devolver para Criação (Ajustes)
            </DialogTitle>
          </div>
          <DialogDescription className="text-zinc-500 text-xs">
            Informe ao criativo o que precisa ser ajustado ou revisado na peça.
          </DialogDescription>
        </DialogHeader>

        {demand && (
          <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-3 my-2 space-y-1">
            <p className="text-xs font-semibold text-zinc-800 line-clamp-1">{demand.title}</p>
            {demand.assigned_creative && (
              <p className="text-[11px] text-zinc-500">
                Criativo:{' '}
                <span className="text-orange-500 font-medium">
                  {demand.assigned_creative.full_name}
                </span>
              </p>
            )}
          </div>
        )}

        <div className="space-y-2 py-2">
          <Label htmlFor="feedback-text" className="text-xs font-medium text-zinc-700">
            Feedback e Instruções de Ajuste <span className="text-rose-500">*</span>
          </Label>
          <Textarea
            id="feedback-text"
            rows={4}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Ex.: Ajustar o contraste do logotipo no fundo escuro e trocar a tipografia secundária conforme manual da marca..."
            className="w-full bg-zinc-50 border-zinc-200 text-zinc-800 placeholder:text-zinc-400 focus:ring-rose-500 focus:border-rose-400 resize-none text-xs rounded-xl"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!feedback.trim() || submitting}
            className="bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-xl"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              'Devolver com Feedback'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
