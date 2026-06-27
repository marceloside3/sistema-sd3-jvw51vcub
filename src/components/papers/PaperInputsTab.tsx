import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Save, CheckCircle2, CloudOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase/client'
import { useCurrentUser } from '@/hooks/use-current-user'

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
    kpis: '',
    personas: '',
    timeline: '',
    channels_priority: '',
    budget_allocation: '',
  })

  const [loading, setLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)

  useEffect(() => {
    const parseJsonArrayToString = (val: any) => {
      if (!val) return ''
      if (Array.isArray(val)) {
        return val
          .map((item) => {
            if (typeof item === 'object' && item !== null) {
              return Object.values(item)
                .filter((v) => typeof v === 'string')
                .join(' - ')
            }
            return String(item)
          })
          .join('\n')
      }
      return String(val)
    }

    if (paper) {
      setForm({
        refined_objective: paper.refined_objective || '',
        key_message: paper.key_message || '',
        premises_restrictions: paper.premises_restrictions || '',
        kpis: parseJsonArrayToString(paper.kpis),
        personas: parseJsonArrayToString(paper.personas),
        timeline: parseJsonArrayToString(paper.timeline),
        channels_priority: parseJsonArrayToString(paper.channels_priority),
        budget_allocation: parseJsonArrayToString(paper.budget_allocation),
      })
    }
  }, [paper])

  // Auto-save logic with debounce
  useEffect(() => {
    if (readOnly) return

    const parseJsonArrayToString = (val: any) => {
      if (!val) return ''
      if (Array.isArray(val)) {
        return val
          .map((item) => {
            if (typeof item === 'object' && item !== null) {
              return Object.values(item)
                .filter((v) => typeof v === 'string')
                .join(' - ')
            }
            return String(item)
          })
          .join('\n')
      }
      return String(val)
    }

    const hasChanges =
      form.refined_objective !== (paper?.refined_objective || '') ||
      form.key_message !== (paper?.key_message || '') ||
      form.premises_restrictions !== (paper?.premises_restrictions || '') ||
      form.kpis !== parseJsonArrayToString(paper?.kpis) ||
      form.personas !== parseJsonArrayToString(paper?.personas) ||
      form.timeline !== parseJsonArrayToString(paper?.timeline) ||
      form.channels_priority !== parseJsonArrayToString(paper?.channels_priority) ||
      form.budget_allocation !== parseJsonArrayToString(paper?.budget_allocation)

    if (!hasChanges) {
      if (saveStatus !== 'idle' && saveStatus !== 'error') setSaveStatus('idle')
      return
    }

    const isFormEmpty =
      !form.refined_objective &&
      !form.key_message &&
      !form.premises_restrictions &&
      !form.kpis &&
      !form.personas &&
      !form.timeline &&
      !form.channels_priority &&
      !form.budget_allocation

    if (!paper && isFormEmpty) return

    setSaveStatus('saving')
    const timer = setTimeout(async () => {
      try {
        const serializeStringToJsonArray = (val: string) => {
          if (!val) return []
          return val.split('\n').filter((s) => s.trim() !== '')
        }

        const payload = {
          refined_objective: form.refined_objective,
          key_message: form.key_message,
          premises_restrictions: form.premises_restrictions,
          kpis: serializeStringToJsonArray(form.kpis),
          personas: serializeStringToJsonArray(form.personas),
          timeline: serializeStringToJsonArray(form.timeline),
          channels_priority: serializeStringToJsonArray(form.channels_priority),
          budget_allocation: serializeStringToJsonArray(form.budget_allocation),
          updated_at: new Date().toISOString(),
        }

        if (paper) {
          const { error } = await supabase.from('project_papers').update(payload).eq('id', paper.id)
          if (error) throw error
        } else {
          const { error } = await supabase.from('project_papers').insert({
            ...payload,
            project_id: project.id,
            status: 'draft',
            version: 1,
            created_by: user?.id,
          })
          if (error) throw error
          onReload()
        }

        setSaveStatus('saved')
        setLastSavedAt(new Date())

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
    }, 1000)

    return () => clearTimeout(timer)
  }, [form, paper, readOnly, project?.id, user?.id, onReload, toast])

  const handleSave = async () => {
    if (!project || !user) return
    setLoading(true)
    setSaveStatus('saving')

    try {
      const serializeStringToJsonArray = (val: string) => {
        if (!val) return []
        return val.split('\n').filter((s) => s.trim() !== '')
      }

      const payload = {
        project_id: project.id,
        refined_objective: form.refined_objective,
        personas: serializeStringToJsonArray(form.personas),
        kpis: serializeStringToJsonArray(form.kpis),
        key_message: form.key_message,
        premises_restrictions: form.premises_restrictions,
        budget_allocation: serializeStringToJsonArray(form.budget_allocation),
        timeline: serializeStringToJsonArray(form.timeline),
        channels_priority: serializeStringToJsonArray(form.channels_priority),
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
      setLastSavedAt(new Date())
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
          {(saveStatus === 'saved' || (saveStatus === 'idle' && lastSavedAt)) && (
            <span className="flex items-center text-xs text-muted-foreground gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-600" /> Salvo às{' '}
              {lastSavedAt?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
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

      <div className="grid grid-cols-1 gap-6">
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

        <div className="space-y-2">
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
          <Textarea
            value={form.kpis}
            onChange={(e) => setForm({ ...form, kpis: e.target.value })}
            disabled={readOnly}
            placeholder="Adicione os KPIs (um por linha)..."
            className="min-h-[100px]"
          />
        </div>

        <div className="space-y-2">
          <Label>Personas</Label>
          <Textarea
            value={form.personas}
            onChange={(e) => setForm({ ...form, personas: e.target.value })}
            disabled={readOnly}
            placeholder="Descreva as personas (uma por linha)..."
            className="min-h-[100px]"
          />
        </div>

        <div className="space-y-2">
          <Label>Prioridade de Canais</Label>
          <Textarea
            value={form.channels_priority}
            onChange={(e) => setForm({ ...form, channels_priority: e.target.value })}
            disabled={readOnly}
            placeholder="Liste os canais prioritários (um por linha)..."
            className="min-h-[100px]"
          />
        </div>

        <div className="space-y-2">
          <Label>Alocação de Verba</Label>
          <Textarea
            value={form.budget_allocation}
            onChange={(e) => setForm({ ...form, budget_allocation: e.target.value })}
            disabled={readOnly}
            placeholder="Descreva a alocação de verba (um item por linha)..."
            className="min-h-[100px]"
          />
        </div>

        <div className="space-y-2">
          <Label>Timeline</Label>
          <Textarea
            value={form.timeline}
            onChange={(e) => setForm({ ...form, timeline: e.target.value })}
            disabled={readOnly}
            placeholder="Adicione os marcos do cronograma (um por linha)..."
            className="min-h-[100px]"
          />
        </div>
      </div>
    </div>
  )
}
