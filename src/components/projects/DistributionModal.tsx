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
import { distributeProject } from '@/services/projects'
import { useToast } from '@/components/ui/use-toast'

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

    setSubmitting(true)
    try {
      const payload = projectAreas
        .filter((pa) => pa.area)
        .map((pa) => ({
          area_id: pa.area!.id,
          user_id: assignments[pa.area!.id],
        }))

      await distributeProject(projectId, payload)
      toast({
        title: 'Sucesso',
        description: `Distribuição concluída — ${payload.length} demandas criadas`,
      })
      onSuccess()
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Falha ao distribuir',
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
            {submitting ? 'Distribuindo...' : 'Confirmar distribuição'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
