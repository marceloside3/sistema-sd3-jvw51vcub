import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase/client'
import {
  distributeProject,
  validateBriefingForDistribution,
  checkCanOverrideG2,
} from '@/services/projects'
import { useToast } from '@/components/ui/use-toast'
import { G2ValidationModal } from './G2ValidationModal'

interface ProjectArea {
  id: string
  area?: {
    id: string
    name: string
  }
}

interface DistributionModalProps {
  projectId: string
  projectAreas: ProjectArea[]
  onSuccess: () => void
  onClose: () => void
}

export function DistributionModal({
  projectId,
  projectAreas,
  onSuccess,
  onClose,
}: DistributionModalProps) {
  const { toast } = useToast()
  const [principals, setPrincipals] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [valModalOpen, setValModalOpen] = useState(false)
  const [validationResult, setValidationResult] = useState<any>(null)
  const [canOverride, setCanOverride] = useState(false)
  const [userReady, setUserReady] = useState(false)

  useEffect(() => {
    async function fetchPrincipals() {
      const areaIds = projectAreas.map((pa) => pa.area?.id).filter(Boolean) as string[]
      if (areaIds.length === 0) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('area_responsibles')
        .select(`
          area_id,
          user_id,
          users ( id, full_name )
        `)
        .in('area_id', areaIds)
        .eq('is_principal', true)

      if (error) {
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar responsáveis',
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      const principalsMap: Record<string, any[]> = {}
      data?.forEach((row: any) => {
        if (!row.users) return
        if (!principalsMap[row.area_id]) principalsMap[row.area_id] = []
        principalsMap[row.area_id].push({
          id: row.users.id,
          name: row.users.full_name,
        })
      })

      const initialAssignments: Record<string, string> = {}
      projectAreas.forEach((pa) => {
        if (!pa.area) return
        const pList = principalsMap[pa.area.id] || []
        if (pList.length === 1) {
          initialAssignments[pa.area.id] = pList[0].id
        }
      })
      setAssignments(initialAssignments)

      setPrincipals(principalsMap)
      setLoading(false)
    }

    fetchPrincipals()
  }, [projectAreas, toast])

  const handleDistribute = async () => {
    const missing = projectAreas.some((pa) => pa.area && !assignments[pa.area.id])
    if (missing) {
      toast({
        title: 'Atenção',
        description: 'Selecione um responsável para todas as áreas.',
        variant: 'destructive',
      })
      return
    }

    if (!projectId) {
      toast({
        title: 'Erro',
        description: 'ID do projeto não encontrado.',
        variant: 'destructive',
      })
      return
    }

    setUserReady(true)
    setSubmitting(true)
    try {
      const [valRes, canOverrideRes] = await Promise.all([
        validateBriefingForDistribution(projectId),
        checkCanOverrideG2(),
      ])

      const safeResult = {
        is_valid: valRes?.is_valid === true,
        issues_count:
          typeof valRes?.issues_count === 'number'
            ? valRes.issues_count
            : Array.isArray(valRes?.issues)
              ? valRes.issues.length
              : 0,
        issues: Array.isArray(valRes?.issues) ? valRes.issues : [],
      }

      setValidationResult(safeResult)
      setCanOverride(canOverrideRes === true)
      setValModalOpen(true)
    } catch (err: any) {
      const isPermissionError = err?.code === '42501' || err?.message?.includes('permission')
      toast({
        title: isPermissionError ? 'Acesso Negado' : 'Erro',
        description: isPermissionError
          ? 'Privilégios insuficientes para distribuir projetos.'
          : err.message || 'Falha ao validar G2',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmDistribution = async (overrideReason?: string) => {
    setSubmitting(true)
    try {
      const payload = projectAreas
        .filter((pa) => pa.area)
        .map((pa) => ({
          area_id: pa.area!.id,
          user_id: assignments[pa.area!.id],
        }))

      await distributeProject(projectId, payload, overrideReason)
      toast({
        title: 'Sucesso',
        description: `Distribuição concluída — demandas criadas`,
      })
      setValModalOpen(false)
      setValidationResult(null)
      onSuccess()
    } catch (err: any) {
      const isPermissionError = err?.code === '42501' || err?.message?.includes('permission')
      const isUniqueViolation = err?.code === '23505' || err?.message?.includes('unique')
      toast({
        title: isPermissionError
          ? 'Acesso Negado'
          : isUniqueViolation
            ? 'Conflito de Dados'
            : 'Erro',
        description: isPermissionError
          ? 'Privilégios insuficientes para distribuir projetos.'
          : isUniqueViolation
            ? 'Já existe um registro de distribuição para este projeto. Recarregue a página.'
            : err.message || 'Falha ao distribuir',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Distribuir Projeto</DialogTitle>
          <DialogDescription>
            Selecione o responsável principal de cada área para receber a demanda de trabalho
            inicial.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="text-sm text-center text-muted-foreground">
              Carregando responsáveis...
            </div>
          ) : (
            projectAreas.map((pa) => {
              const area = pa.area
              if (!area) return null
              const areaPrincipals = principals[area.id] || []

              return (
                <div key={area.id} className="space-y-1">
                  <Label>{area.name}</Label>
                  <Select
                    value={assignments[area.id] || undefined}
                    onValueChange={(val) => setAssignments((prev) => ({ ...prev, [area.id]: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      {areaPrincipals.length === 0 ? (
                        <SelectItem value="none" disabled>
                          Nenhum responsável principal configurado
                        </SelectItem>
                      ) : (
                        areaPrincipals.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleDistribute} disabled={loading || submitting}>
            {submitting ? 'Validando...' : 'Confirmar distribuição'}
          </Button>
        </DialogFooter>
      </DialogContent>

      <G2ValidationModal
        open={valModalOpen && userReady}
        onClose={() => {
          setValModalOpen(false)
          setUserReady(false)
        }}
        onConfirm={handleConfirmDistribution}
        validationResult={validationResult}
        canOverride={canOverride}
        submitting={submitting}
      />
    </Dialog>
  )
}
