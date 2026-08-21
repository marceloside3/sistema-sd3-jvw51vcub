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
      <DialogContent className="sm:max-w-[480px] bg-zinc-950 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <DialogTitle className="text-lg font-semibold text-zinc-100">
              Devolver para Criação (Ajustes)
            </DialogTitle>
          </div>
          <DialogDescription className="text-zinc-400 text-xs">
            Informe ao criativo o que precisa ser ajustado ou revisado na peça.
          </DialogDescription>
        </DialogHeader>

        {demand && (
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3 my-2 space-y-1">
            <p className="text-xs font-semibold text-zinc-200 line-clamp-1">{demand.title}</p>
            {demand.assigned_creative && (
              <p className="text-[11px] text-zinc-400">
                Criativo:{' '}
                <span className="text-orange-400 font-medium">
                  {demand.assigned_creative.full_name}
                </span>
              </p>
            )}
          </div>
        )}

        <div className="space-y-2 py-2">
          <Label htmlFor="feedback-text" className="text-xs font-medium text-zinc-300">
            Feedback e Instruções de Ajuste <span className="text-red-400">*</span>
          </Label>
          <Textarea
            id="feedback-text"
            rows={4}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Ex.: Ajustar o contraste do logotipo no fundo escuro e trocar a tipografia secundária conforme manual da marca..."
            className="w-full bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:ring-red-500 focus:border-red-500 resize-none text-xs"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!feedback.trim() || submitting}
            className="bg-red-600 hover:bg-red-700 text-white font-medium"
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
