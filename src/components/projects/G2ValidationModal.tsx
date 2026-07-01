import { useState, useEffect } from 'react'
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
import { CheckCircle2, AlertCircle, XCircle, Loader2 } from 'lucide-react'

interface Issue {
  rule: string
  message: string
}

interface ValidationResult {
  is_valid: boolean
  issues_count?: number
  issues?: Issue[] | null
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

  useEffect(() => {
    if (!open) {
      setReason('')
    }
  }, [open])

  if (!validationResult) return null

  const issues: Issue[] = Array.isArray(validationResult.issues) ? validationResult.issues : []

  const isValid = validationResult.is_valid === true
  const hasDetailedIssues = issues.length > 0
  const issuesCount =
    typeof validationResult.issues_count === 'number'
      ? validationResult.issues_count
      : issues.length

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isValid ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" /> Gate G2 Aprovado
              </>
            ) : hasDetailedIssues ? (
              <>
                <AlertCircle className="h-5 w-5 text-red-500" /> Gate G2 — Pendências encontradas
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-amber-500" /> Gate G2 — Validação pendente
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isValid
              ? 'O projeto atende a todos os requisitos de qualidade para distribuição.'
              : hasDetailedIssues
                ? `${issuesCount} ${issuesCount === 1 ? 'pendência encontrada' : 'pendências encontradas'} no briefing. Revise abaixo.`
                : 'A validação não pôde ser concluída automaticamente. Você pode prosseguir com uma justificativa se tiver permissão.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          {isValid && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-sm font-medium">
                Tudo certo! O projeto está pronto para ser distribuído às áreas.
              </AlertDescription>
            </Alert>
          )}

          {!isValid && !hasDetailedIssues && issuesCount === 0 && (
            <Alert className="border-amber-200 bg-amber-50 text-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm">
                A validação não identificou pendências específicas, mas o projeto ainda não passou
                no gate G2. Se você tem permissão, pode forçar a distribuição com uma justificativa.
              </AlertDescription>
            </Alert>
          )}

          {!isValid && !hasDetailedIssues && issuesCount > 0 && (
            <Alert className="border-amber-200 bg-amber-50 text-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm">
                A validação retornou {issuesCount} pendência(s), mas não foi possível detalhar os
                itens. Verifique o briefing manualmente antes de prosseguir.
              </AlertDescription>
            </Alert>
          )}

          {!isValid && hasDetailedIssues && (
            <div className="space-y-3">
              {issues.map((issue, idx) => (
                <Alert key={idx} variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle className="text-sm font-semibold">
                    {issue.rule || 'Pendência'}
                  </AlertTitle>
                  <AlertDescription className="text-xs mt-1">
                    {issue.message || 'Sem descrição detalhada.'}
                  </AlertDescription>
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
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Distribuindo...
                </>
              ) : (
                'Prosseguir com Distribuição'
              )}
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
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Distribuindo...
                      </>
                    ) : (
                      'Forçar Distribuição'
                    )}
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
