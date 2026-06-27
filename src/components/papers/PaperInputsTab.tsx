import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { useCurrentUser } from '@/hooks/use-current-user'
import { Loader2, Save } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface PaperInputsTabProps {
  paper: any
  project: any
  readOnly: boolean
  onReload: () => void
}

const StringArrayInput = ({
  value,
  onChange,
  disabled,
  placeholder,
}: {
  value: any
  onChange: (v: string[]) => void
  disabled: boolean
  placeholder: string
}) => {
  const [text, setText] = useState('')

  useEffect(() => {
    if (Array.isArray(value)) {
      setText(value.join('\n'))
    } else if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value)
        setText(Array.isArray(parsed) ? parsed.join('\n') : '')
      } catch {
        setText(value)
      }
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    const lines = e.target.value.split('\n').filter((l) => l.trim() !== '')
    onChange(lines)
  }

  return (
    <Textarea
      value={text}
      onChange={handleChange}
      disabled={disabled}
      placeholder={placeholder}
      className="min-h-[100px]"
    />
  )
}

export function PaperInputsTab({ paper, project, readOnly, onReload }: PaperInputsTabProps) {
  const { toast } = useToast()
  const { data: userCtx } = useCurrentUser()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    refined_objective: '',
    personas: [] as string[],
    kpis: [] as string[],
    key_message: '',
    premises_restrictions: '',
    budget_allocation: [] as string[],
    timeline: [] as string[],
    channels_priority: [] as string[],
  })

  useEffect(() => {
    if (paper) {
      setForm({
        refined_objective: paper.refined_objective || '',
        personas: Array.isArray(paper.personas) ? paper.personas : [],
        kpis: Array.isArray(paper.kpis) ? paper.kpis : [],
        key_message: paper.key_message || '',
        premises_restrictions: paper.premises_restrictions || '',
        budget_allocation: Array.isArray(paper.budget_allocation) ? paper.budget_allocation : [],
        timeline: Array.isArray(paper.timeline) ? paper.timeline : [],
        channels_priority: Array.isArray(paper.channels_priority) ? paper.channels_priority : [],
      })
    } else {
      setForm({
        refined_objective: '',
        personas: [],
        kpis: [],
        key_message: '',
        premises_restrictions: '',
        budget_allocation: [],
        timeline: [],
        channels_priority: [],
      })
    }
  }, [paper])

  const handleSave = async () => {
    if (!project || !userCtx?.user) return
    setLoading(true)

    try {
      const payload = {
        project_id: project.id,
        refined_objective: form.refined_objective,
        personas: form.personas,
        kpis: form.kpis,
        key_message: form.key_message,
        premises_restrictions: form.premises_restrictions,
        budget_allocation: form.budget_allocation,
        timeline: form.timeline,
        channels_priority: form.channels_priority,
        status: 'draft',
      }

      let eventType = 'paper_updated'

      if (!paper) {
        const { error } = await supabase.from('project_papers').insert({
          ...payload,
          version: 1,
          created_by: userCtx.user.id,
        })
        if (error) throw error
        eventType = 'paper_created'
      } else {
        const { error } = await supabase
          .from('project_papers')
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq('id', paper.id)
        if (error) throw error
      }

      await supabase.rpc('audit_log_insert', {
        p_project_id: project.id,
        p_event_type: eventType as any,
        p_new_value: !paper ? 'Paper v1 criado' : `Paper v${paper.version} atualizado`,
      })

      toast({
        title: 'Sucesso',
        description: 'Paper salvo com sucesso.',
      })
      onReload()
      navigate(`/projetos/${project.id}`)
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao salvar',
        description: err.message || 'Ocorreu um erro ao salvar o paper.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 mt-6 border rounded-lg bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">8 Inputs Estratégicos</h3>
        {!readOnly && (
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Objetivo Refinado</Label>
          <Textarea
            value={form.refined_objective}
            onChange={(e) => setForm({ ...form, refined_objective: e.target.value })}
            disabled={readOnly}
            placeholder="Descreva o objetivo refinado..."
            className="min-h-[100px]"
          />
        </div>

        <div className="space-y-2">
          <Label>Mensagem Principal</Label>
          <Textarea
            value={form.key_message}
            onChange={(e) => setForm({ ...form, key_message: e.target.value })}
            disabled={readOnly}
            placeholder="Qual a mensagem principal?"
            className="min-h-[100px]"
          />
        </div>

        <div className="space-y-2">
          <Label>Premissas e Restrições</Label>
          <Textarea
            value={form.premises_restrictions}
            onChange={(e) => setForm({ ...form, premises_restrictions: e.target.value })}
            disabled={readOnly}
            placeholder="Quais as premissas e restrições?"
            className="min-h-[100px]"
          />
        </div>

        <div className="space-y-2">
          <Label>Personas (um por linha)</Label>
          <StringArrayInput
            value={form.personas}
            onChange={(val) => setForm({ ...form, personas: val })}
            disabled={readOnly}
            placeholder="Ex: Diretor de Marketing..."
          />
        </div>

        <div className="space-y-2">
          <Label>KPIs (um por linha)</Label>
          <StringArrayInput
            value={form.kpis}
            onChange={(val) => setForm({ ...form, kpis: val })}
            disabled={readOnly}
            placeholder="Ex: Aumentar vendas em 20%..."
          />
        </div>

        <div className="space-y-2">
          <Label>Prioridade de Canais (um por linha)</Label>
          <StringArrayInput
            value={form.channels_priority}
            onChange={(val) => setForm({ ...form, channels_priority: val })}
            disabled={readOnly}
            placeholder="Ex: Instagram, Email..."
          />
        </div>

        <div className="space-y-2">
          <Label>Alocação de Orçamento (um por linha)</Label>
          <StringArrayInput
            value={form.budget_allocation}
            onChange={(val) => setForm({ ...form, budget_allocation: val })}
            disabled={readOnly}
            placeholder="Ex: 50% Ads, 50% Influenciadores..."
          />
        </div>

        <div className="space-y-2">
          <Label>Cronograma / Timeline (um por linha)</Label>
          <StringArrayInput
            value={form.timeline}
            onChange={(val) => setForm({ ...form, timeline: val })}
            disabled={readOnly}
            placeholder="Ex: Fase 1 - 10 dias..."
          />
        </div>
      </div>
    </div>
  )
}
