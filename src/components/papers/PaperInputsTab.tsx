import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Save, CheckCircle2, CloudOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase/client'
import { useCurrentUser } from '@/hooks/use-current-user'
import { DynamicList } from './DynamicList'

interface PaperInputsTabProps {
  project: any
  paper: any
  readOnly?: boolean
  onReload: () => void
}

export function PaperInputsTab({ project, paper, readOnly, onReload }: PaperInputsTabProps) {
  const { user } = useCurrentUser()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [form, setForm] = useState({
    refined_objective: '',
    key_message: '',
    premises_restrictions: '',
    kpis: [],
    personas: [],
    timeline: [],
    channels_priority: [],
    budget_allocation: [],
  })

  const [loading, setLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    if (paper) {
      setForm({
        refined_objective: paper.refined_objective || '',
        key_message: paper.key_message || '',
        premises_restrictions: paper.premises_restrictions || '',
        kpis: paper.kpis || [],
        personas: paper.personas || [],
        timeline: paper.timeline || [],
        channels_priority: paper.channels_priority || [],
        budget_allocation: paper.budget_allocation || [],
      })
    }
  }, [paper])

  // Auto-save logic with debounce
  useEffect(() => {
    if (readOnly || !paper) return

    const hasChanges =
      form.refined_objective !== (paper.refined_objective || '') ||
      form.key_message !== (paper.key_message || '') ||
      form.premises_restrictions !== (paper.premises_restrictions || '') ||
      JSON.stringify(form.kpis) !== JSON.stringify(paper.kpis || []) ||
      JSON.stringify(form.personas) !== JSON.stringify(paper.personas || []) ||
      JSON.stringify(form.timeline) !== JSON.stringify(paper.timeline || []) ||
      JSON.stringify(form.channels_priority) !== JSON.stringify(paper.channels_priority || []) ||
      JSON.stringify(form.budget_allocation) !== JSON.stringify(paper.budget_allocation || [])

    if (!hasChanges) {
      if (saveStatus !== 'idle' && saveStatus !== 'error') setSaveStatus('idle')
      return
    }

    setSaveStatus('saving')
    const timer = setTimeout(async () => {
      try {
        const payload = {
          refined_objective: form.refined_objective,
          key_message: form.key_message,
          premises_restrictions: form.premises_restrictions,
          kpis: form.kpis,
          personas: form.personas,
          timeline: form.timeline,
          channels_priority: form.channels_priority,
          budget_allocation: form.budget_allocation,
          updated_at: new Date().toISOString(),
        }

        const { error } = await supabase.from('project_papers').update(payload).eq('id', paper.id)

        if (error) throw error

        setSaveStatus('saved')

        // Revert status to idle after 3s
        setTimeout(() => {
          setSaveStatus((prev) => (prev === 'saved' ? 'idle' : prev))
        }, 3000)
      } catch (err) {
        console.error('Auto-save error:', err)
        setSaveStatus('error')
        toast({
          title: 'Erro no salvamento automático',
          description: 'Verifique sua conexão. Tentaremos salvar novamente.',
          variant: 'destructive',
        })
      }
    }, 1500)

    return () => clearTimeout(timer)
  }, [form, paper, readOnly])

  const handleSave = async () => {
    if (!project || !user) return
    setLoading(true)
    setSaveStatus('saving')

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
          created_by: user.id,
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
        p_field_name: 'content',
      })

      setSaveStatus('saved')
      toast({
        title: 'Sucesso',
        description: 'Paper salvo com sucesso.',
      })
      onReload()
      navigate(`/projetos/${project.id}`)
    } catch (err: any) {
      console.error(err)
      setSaveStatus('error')
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
    <div className="space-y-6 mt-6 border rounded-lg bg-white p-6 shadow-sm relative">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">8 Inputs Estratégicos</h3>
          {saveStatus === 'saving' && (
            <span className="flex items-center text-sm text-gray-500 gap-1 animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" /> Salvando...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center text-sm text-green-600 gap-1">
              <CheckCircle2 className="w-3 h-3" /> Todas as alterações salvas
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center text-sm text-red-500 gap-1">
              <CloudOff className="w-3 h-3" /> Erro ao salvar
            </span>
          )}
        </div>
        {!readOnly && (
          <Button onClick={handleSave} disabled={loading || saveStatus === 'saving'}>
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar Manualmente
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
            placeholder="Qual é a mensagem principal?"
            className="min-h-[100px]"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Premissas e Restrições</Label>
          <Textarea
            value={form.premises_restrictions}
            onChange={(e) => setForm({ ...form, premises_restrictions: e.target.value })}
            disabled={readOnly}
            placeholder="Liste as premissas e restrições..."
            className="min-h-[100px]"
          />
        </div>

        <div className="space-y-2">
          <Label>KPIs</Label>
          <DynamicList
            items={form.kpis}
            onChange={(items) => setForm({ ...form, kpis: items as any })}
            disabled={readOnly}
            placeholder="Adicionar KPI..."
          />
        </div>

        <div className="space-y-2">
          <Label>Personas</Label>
          <DynamicList
            items={form.personas}
            onChange={(items) => setForm({ ...form, personas: items as any })}
            disabled={readOnly}
            placeholder="Adicionar Persona..."
          />
        </div>

        <div className="space-y-2">
          <Label>Canais Prioritários</Label>
          <DynamicList
            items={form.channels_priority}
            onChange={(items) => setForm({ ...form, channels_priority: items as any })}
            disabled={readOnly}
            placeholder="Adicionar Canal..."
          />
        </div>

        <div className="space-y-2">
          <Label>Alocação de Verba</Label>
          <DynamicList
            items={form.budget_allocation}
            onChange={(items) => setForm({ ...form, budget_allocation: items as any })}
            disabled={readOnly}
            placeholder="Adicionar Item de Verba..."
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Cronograma</Label>
          <DynamicList
            items={form.timeline}
            onChange={(items) => setForm({ ...form, timeline: items as any })}
            disabled={readOnly}
            placeholder="Adicionar Marco do Cronograma..."
          />
        </div>
      </div>
    </div>
  )
}
