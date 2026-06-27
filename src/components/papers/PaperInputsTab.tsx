import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Save } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { createPaperVersion, updatePaper } from '@/services/papers'
import { DynamicList } from './DynamicList'

interface PaperInputsTabProps {
  paper: any
  project: any
  readOnly: boolean
  onReload: () => void
}

export function PaperInputsTab({ paper, project, readOnly, onReload }: PaperInputsTabProps) {
  const { toast } = useToast()
  const [objective, setObjective] = useState('')
  const [premises, setPremises] = useState('')
  const [personas, setPersonas] = useState<any[]>([])
  const [kpis, setKpis] = useState<any[]>([])
  const [budget, setBudget] = useState<any[]>([])
  const [channels, setChannels] = useState<any[]>([])
  const [timeline, setTimeline] = useState<any[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (paper) {
      setObjective(paper.refined_objective || '')
      setPremises(paper.premises_restrictions || '')
      setPersonas(paper.personas || [])
      setKpis(paper.kpis || [])
      setBudget(paper.budget_allocation || [])
      setChannels(paper.channels_priority || [])
      setTimeline(paper.timeline || [])
    } else {
      setObjective('')
      setPremises('')
      setPersonas([])
      setKpis([])
      setBudget([])
      setChannels([])
      setTimeline([])
    }
  }, [paper])

  const handleSave = async (submit: boolean = false) => {
    setIsSaving(true)
    try {
      let currentId = paper?.id
      if (!currentId) {
        currentId = await createPaperVersion(project.id)
      }
      const payload = {
        refined_objective: objective,
        premises_restrictions: premises,
        personas,
        kpis,
        budget_allocation: budget,
        channels_priority: channels,
        timeline,
        ...(submit ? { status: 'submitted' } : {}),
      }
      await updatePaper(currentId, payload)
      toast({ title: 'Sucesso', description: 'Paper salvo com sucesso.' })
      onReload()
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="border rounded-lg bg-white p-6 shadow-sm space-y-8">
      {!readOnly && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => handleSave(false)} disabled={isSaving}>
            <Save className="w-4 h-4 mr-2" /> Salvar Rascunho
          </Button>
          <Button onClick={() => handleSave(true)} disabled={isSaving}>
            Finalizar e Submeter
          </Button>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold">1. Objetivo Refinado</Label>
          <Textarea
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            disabled={readOnly}
            className="mt-2 min-h-[100px]"
            placeholder="Descreva o objetivo refinado do projeto..."
          />
        </div>
        <div>
          <Label className="text-base font-semibold">2. Premissas e Restrições</Label>
          <Textarea
            value={premises}
            onChange={(e) => setPremises(e.target.value)}
            disabled={readOnly}
            className="mt-2 min-h-[100px]"
            placeholder="Liste premissas e restrições técnicas, de negócio ou orçamentárias..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <Label className="text-base font-semibold block mb-2">3. Personas</Label>
          <DynamicList
            items={personas}
            onChange={setPersonas}
            readOnly={readOnly}
            columns={[
              { key: 'name', label: 'Nome / Perfil' },
              { key: 'description', label: 'Descrição' },
            ]}
          />
        </div>
        <div>
          <Label className="text-base font-semibold block mb-2">4. KPIs</Label>
          <DynamicList
            items={kpis}
            onChange={setKpis}
            readOnly={readOnly}
            columns={[
              { key: 'name', label: 'Indicador' },
              { key: 'target', label: 'Meta' },
            ]}
          />
        </div>
        <div>
          <Label className="text-base font-semibold block mb-2">5. Distribuição de Verba</Label>
          <DynamicList
            items={budget}
            onChange={setBudget}
            readOnly={readOnly}
            columns={[
              { key: 'item', label: 'Item / Canal' },
              { key: 'amount', label: 'Valor / %' },
            ]}
          />
        </div>
        <div>
          <Label className="text-base font-semibold block mb-2">6. Canais e Prioridade</Label>
          <DynamicList
            items={channels}
            onChange={setChannels}
            readOnly={readOnly}
            columns={[
              { key: 'channel', label: 'Canal' },
              { key: 'priority', label: 'Prioridade (Alta/Média/Baixa)' },
            ]}
          />
        </div>
        <div className="col-span-1 md:col-span-2">
          <Label className="text-base font-semibold block mb-2">7. Cronograma Macro</Label>
          <DynamicList
            items={timeline}
            onChange={setTimeline}
            readOnly={readOnly}
            columns={[
              { key: 'phase', label: 'Fase / Entrega' },
              { key: 'date', label: 'Data / Prazo' },
            ]}
          />
        </div>
      </div>
    </div>
  )
}
