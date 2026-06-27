import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react'

interface Issue {
  rule: string
  message: string
}

interface ValidationResult {
  is_valid: boolean
  issues_count: number
  issues: Issue[]
}

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: (overrideReason?: string) => void
  validationResult: ValidationResult | null
  canOverride: boolean
  submitting: boolean
}

export function G2ValidationModal({
  open,
  onClose,
  onConfirm,
  validationResult,
  canOverride,
  submitting,
}: Props) {
  const [reason, setReason] = useState('')

  if (!validationResult) return null

  const isValid = validationResult.is_valid

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isValid ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" /> Gate G2 Aprovado
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-red-500" /> Gate G2 — Pendências encontradas
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isValid
              ? 'O projeto atende a todos os requisitos de qualidade para distribuição.'
              : 'Foram encontradas não conformidades no briefing. Revise as pendências abaixo.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          {!isValid && (
            <div className="space-y-3">
              {validationResult.issues.map((issue, idx) => (
                <Alert key={idx} variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle className="text-sm font-semibold">{issue.rule}</AlertTitle>
                  <AlertDescription className="text-xs mt-1">{issue.message}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {!isValid && (
            <div className="mt-6 border-t pt-4">
              {canOverride ? (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Justificativa de Exceção (Override)</h4>
                  <p className="text-xs text-muted-foreground">
                    Você tem permissão para ignorar essas pendências e distribuir o projeto. Forneça
                    uma justificativa detalhada.
                  </p>
                  <Textarea
                    placeholder="Justifique o motivo para distribuir o projeto sem os requisitos completos..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={4}
                  />
                  <div className="flex justify-end">
                    <span
                      className={`text-xs ${reason.length < 30 ? 'text-red-500' : 'text-green-600'}`}
                    >
                      {reason.length}/30 caracteres mínimos
                    </span>
                  </div>
                </div>
              ) : (
                <Alert className="bg-muted text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Apenas Super Admins ou Diretores do Hub podem aprovar a distribuição com
                    pendências. Corrija o briefing para prosseguir.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {isValid ? (
            <Button onClick={() => onConfirm()} disabled={submitting}>
              {submitting ? 'Distribuindo...' : 'Prosseguir com Distribuição'}
            </Button>
          ) : (
            <div className="flex gap-2 w-full justify-end">
              {!canOverride && (
                <Button variant="outline" onClick={onClose}>
                  Corrigir Briefing
                </Button>
              )}
              {canOverride && (
                <>
                  <Button variant="outline" onClick={onClose} disabled={submitting}>
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => onConfirm(reason)}
                    disabled={reason.length < 30 || submitting}
                  >
                    {submitting ? 'Distribuindo...' : 'Forçar Distribuição'}
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
