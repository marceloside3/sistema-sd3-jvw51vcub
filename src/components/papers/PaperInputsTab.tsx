import { useState, useRef, useEffect } from 'react'
import { updatePaper } from '@/services/papers'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash } from 'lucide-react'

export function PaperInputsTab({
  paper,
  project,
  readOnly,
}: {
  paper: any
  project: any
  readOnly: boolean
}) {
  const [data, setData] = useState(paper)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const timer = useRef<any>(null)

  useEffect(() => {
    setData(paper)
  }, [paper])

  const handleChange = (field: string, val: any) => {
    if (readOnly) return
    setData((prev: any) => ({ ...prev, [field]: val }))
    if (timer.current) clearTimeout(timer.current)
    setSaving(true)
    timer.current = setTimeout(async () => {
      try {
        await updatePaper(paper.id, { [field]: val })
        setLastSaved(new Date())
      } finally {
        setSaving(false)
      }
    }, 2000)
  }

  const handleArr = (f: string, i: number, k: string, v: any) => {
    const arr = [...(data[f] || [])]
    arr[i] = { ...arr[i], [k]: v }
    handleChange(f, arr)
  }
  const addArr = (f: string, def: any) => handleChange(f, [...(data[f] || []), def])
  const remArr = (f: string, i: number) => {
    const arr = [...(data[f] || [])]
    arr.splice(i, 1)
    handleChange(f, arr)
  }

  const channelsSum = (data.channels_priority || []).reduce(
    (acc: number, c: any) => acc + (Number(c.weight) || 0),
    0,
  )

  // Extract number from currency strings like "R$ 10.000,00"
  let parsedTotal = 0
  if (project?.briefing_data?.budget) {
    const bStr = String(project.briefing_data.budget)
    const cleanStr = bStr.replace(/\./g, '').replace(',', '.')
    parsedTotal = Number(cleanStr.replace(/[^0-9.]/g, '')) || 0
  }
  const allocBudget = (data.budget_allocation || []).reduce(
    (acc: number, b: any) => acc + (Number(b.value) || 0),
    0,
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-3 rounded-lg border shadow-sm sticky top-0 z-10">
        <span className="text-sm text-gray-500">
          {readOnly ? 'Apenas Leitura (Visualização)' : 'Salvamento Automático Ativado'}
        </span>
        <div className="text-xs text-gray-400">
          {saving ? 'Salvando...' : lastSaved ? `Salvo às ${lastSaved.toLocaleTimeString()}` : ''}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Objetivo Refinado</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            className="min-h-[100px]"
            value={data.refined_objective || ''}
            onChange={(e) => handleChange('refined_objective', e.target.value)}
            disabled={readOnly}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Personas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(data.personas || []).map((p: any, i: number) => (
            <div key={i} className="flex gap-2 items-center bg-gray-50 p-2 rounded border">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Nome</Label>
                <Input
                  value={p.name || ''}
                  onChange={(e) => handleArr('personas', i, 'name', e.target.value)}
                  disabled={readOnly}
                />
              </div>
              <div className="w-24 space-y-1">
                <Label className="text-xs">Idade</Label>
                <Input
                  value={p.age_range || ''}
                  onChange={(e) => handleArr('personas', i, 'age_range', e.target.value)}
                  disabled={readOnly}
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Dor Principal</Label>
                <Input
                  value={p.pain_point || ''}
                  onChange={(e) => handleArr('personas', i, 'pain_point', e.target.value)}
                  disabled={readOnly}
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Motivação</Label>
                <Input
                  value={p.motivation || ''}
                  onChange={(e) => handleArr('personas', i, 'motivation', e.target.value)}
                  disabled={readOnly}
                />
              </div>
              {!readOnly && (
                <div className="mt-5">
                  <Button variant="ghost" size="icon" onClick={() => remArr('personas', i)}>
                    <Trash className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              )}
            </div>
          ))}
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                addArr('personas', { name: '', age_range: '', pain_point: '', motivation: '' })
              }
            >
              <Plus className="w-4 h-4 mr-2" /> Adicionar Persona
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">3. Mensagem-Chave</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            maxLength={200}
            placeholder="Até 200 caracteres"
            value={data.key_message || ''}
            onChange={(e) => handleChange('key_message', e.target.value)}
            disabled={readOnly}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex justify-between items-center">
            4. Canais Priorizados{' '}
            <span className={`text-sm ${channelsSum === 100 ? 'text-green-600' : 'text-red-500'}`}>
              Total: {channelsSum}% {channelsSum !== 100 && '(Obrigatório 100%)'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(data.channels_priority || []).map((c: any, i: number) => (
            <div key={i} className="flex gap-2 items-center">
              <Input
                placeholder="Canal (Ex: Instagram)"
                value={c.channel || ''}
                onChange={(e) => handleArr('channels_priority', i, 'channel', e.target.value)}
                disabled={readOnly}
                className="flex-1"
              />
              <Input
                type="number"
                placeholder="Peso %"
                value={c.weight || ''}
                onChange={(e) => handleArr('channels_priority', i, 'weight', e.target.value)}
                disabled={readOnly}
                className="w-32"
              />
              {!readOnly && (
                <Button variant="ghost" size="icon" onClick={() => remArr('channels_priority', i)}>
                  <Trash className="w-4 h-4 text-red-500" />
                </Button>
              )}
            </div>
          ))}
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => addArr('channels_priority', { channel: '', weight: '' })}
            >
              <Plus className="w-4 h-4 mr-2" /> Adicionar Canal
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">5. KPIs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(data.kpis || []).map((k: any, i: number) => (
            <div key={i} className="flex gap-2 items-center">
              <Input
                placeholder="Métrica"
                value={k.metric || ''}
                onChange={(e) => handleArr('kpis', i, 'metric', e.target.value)}
                disabled={readOnly}
              />
              <Input
                placeholder="Alvo"
                value={k.target || ''}
                onChange={(e) => handleArr('kpis', i, 'target', e.target.value)}
                disabled={readOnly}
              />
              <Input
                placeholder="Período"
                value={k.period || ''}
                onChange={(e) => handleArr('kpis', i, 'period', e.target.value)}
                disabled={readOnly}
              />
              {!readOnly && (
                <Button variant="ghost" size="icon" onClick={() => remArr('kpis', i)}>
                  <Trash className="w-4 h-4 text-red-500" />
                </Button>
              )}
            </div>
          ))}
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => addArr('kpis', { metric: '', target: '', period: '' })}
            >
              <Plus className="w-4 h-4 mr-2" /> Adicionar KPI
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">6. Cronograma</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(data.timeline || []).map((t: any, i: number) => (
            <div key={i} className="flex gap-2 items-center">
              <Input
                placeholder="Fase do Projeto"
                value={t.phase || ''}
                onChange={(e) => handleArr('timeline', i, 'phase', e.target.value)}
                disabled={readOnly}
              />
              <Input
                type="date"
                value={t.start_date || ''}
                onChange={(e) => handleArr('timeline', i, 'start_date', e.target.value)}
                disabled={readOnly}
                className="w-40"
              />
              <Input
                type="date"
                value={t.end_date || ''}
                onChange={(e) => handleArr('timeline', i, 'end_date', e.target.value)}
                disabled={readOnly}
                className="w-40"
              />
              {!readOnly && (
                <Button variant="ghost" size="icon" onClick={() => remArr('timeline', i)}>
                  <Trash className="w-4 h-4 text-red-500" />
                </Button>
              )}
            </div>
          ))}
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => addArr('timeline', { phase: '', start_date: '', end_date: '' })}
            >
              <Plus className="w-4 h-4 mr-2" /> Adicionar Fase
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex justify-between items-center">
            7. Budget Allocation (Por Área){' '}
            <span
              className={`text-sm ${allocBudget <= parsedTotal ? 'text-gray-500' : 'text-red-500'}`}
            >
              Total Alocado: {allocBudget} / {parsedTotal || 'Ilimitado'}{' '}
              {allocBudget > parsedTotal && '(Excede Orçamento)'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(data.budget_allocation || []).map((b: any, i: number) => (
            <div key={i} className="flex gap-2 items-center">
              <Input
                placeholder="Área"
                value={b.area || ''}
                onChange={(e) => handleArr('budget_allocation', i, 'area', e.target.value)}
                disabled={readOnly}
              />
              <Input
                type="number"
                placeholder="Valor"
                value={b.value || ''}
                onChange={(e) => handleArr('budget_allocation', i, 'value', e.target.value)}
                disabled={readOnly}
              />
              <Input
                placeholder="Notas / Detalhes"
                value={b.notes || ''}
                onChange={(e) => handleArr('budget_allocation', i, 'notes', e.target.value)}
                disabled={readOnly}
              />
              {!readOnly && (
                <Button variant="ghost" size="icon" onClick={() => remArr('budget_allocation', i)}>
                  <Trash className="w-4 h-4 text-red-500" />
                </Button>
              )}
            </div>
          ))}
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => addArr('budget_allocation', { area: '', value: '', notes: '' })}
            >
              <Plus className="w-4 h-4 mr-2" /> Adicionar Alocação
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">8. Premissas e Restrições</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            className="min-h-[100px]"
            value={data.premises_restrictions || ''}
            onChange={(e) => handleChange('premises_restrictions', e.target.value)}
            disabled={readOnly}
          />
        </CardContent>
      </Card>
    </div>
  )
}
