import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Save, CheckCircle2, CloudOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase/client'
import { useCurrentUser } from '@/hooks/use-current-user'

function parseJsonArrayToString(val: any): string {
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

function serializeStringToJsonArray(val: string): string[] {
  if (!val) return []
  return val.split('\n').filter((s) => s.trim() !== '')
}

const FORM_FIELDS = [
  {
    key: 'refined_objective',
    label: 'Objetivo Refinado',
    placeholder: 'Descreva o objetivo refinado...',
  },
  { key: 'key_message', label: 'Mensagem Principal', placeholder: 'Qual é a mensagem principal?' },
  {
    key: 'premises_restrictions',
    label: 'Premissas e Restrições',
    placeholder: 'Liste as premissas e restrições...',
  },
  { key: 'kpis', label: 'KPIs', placeholder: 'Adicione os KPIs (um por linha)...' },
  { key: 'personas', label: 'Personas', placeholder: 'Descreva as personas (uma por linha)...' },
  {
    key: 'channels_priority',
    label: 'Prioridade de Canais',
    placeholder: 'Liste os canais prioritários (um por linha)...',
  },
  {
    key: 'budget_allocation',
    label: 'Alocação de Verba',
    placeholder: 'Descreva a alocação de verba (um item por linha)...',
  },
  {
    key: 'timeline',
    label: 'Timeline',
    placeholder: 'Adicione os marcos do cronograma (um por linha)...',
  },
] as const

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

  const [form, setForm] = useState<Record<string, string>>({
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

  const onReloadRef = useRef(onReload)
  onReloadRef.current = onReload
  const toastRef = useRef(toast)
  toastRef.current = toast
  const paperRef = useRef(paper)
  paperRef.current = paper

  useEffect(() => {
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

  useEffect(() => {
    if (readOnly) return

    const currentPaper = paperRef.current
    const hasChanges = currentPaper
      ? form.refined_objective !== (currentPaper.refined_objective || '') ||
        form.key_message !== (currentPaper.key_message || '') ||
        form.premises_restrictions !== (currentPaper.premises_restrictions || '') ||
        form.kpis !== parseJsonArrayToString(currentPaper.kpis) ||
        form.personas !== parseJsonArrayToString(currentPaper.personas) ||
        form.timeline !== parseJsonArrayToString(currentPaper.timeline) ||
        form.channels_priority !== parseJsonArrayToString(currentPaper.channels_priority) ||
        form.budget_allocation !== parseJsonArrayToString(currentPaper.budget_allocation)
      : Object.values(form).some((v) => v.trim() !== '')

    if (!hasChanges) {
      if (saveStatus !== 'idle' && saveStatus !== 'error') setSaveStatus('idle')
      return
    }

    const isFormEmpty = Object.values(form).every((v) => !v.trim())
    if (!currentPaper && isFormEmpty) return

    setSaveStatus('saving')
    const timer = setTimeout(async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) {
          toastRef.current({
            title: 'Sessão expirada',
            description: 'Faça login novamente para salvar.',
            variant: 'destructive',
          })
          setSaveStatus('error')
          return
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

        if (currentPaper) {
          const { error } = await supabase
            .from('project_papers')
            .update(payload)
            .eq('id', currentPaper.id)
          if (error) throw error
        } else if (project?.id && user?.id) {
          const { error } = await supabase.from('project_papers').insert({
            ...payload,
            project_id: project.id,
            status: 'draft',
            version: 1,
            created_by: user.id,
          })
          if (error) throw error
          onReloadRef.current()
        }

        setSaveStatus('saved')
        setLastSavedAt(new Date())
        setTimeout(() => setSaveStatus((prev) => (prev === 'saved' ? 'idle' : prev)), 3000)
      } catch (err) {
        console.error('Auto-save error:', err)
        setSaveStatus('error')
        toastRef.current({
          title: 'Erro no salvamento automático',
          description: 'Verifique sua conexão. Tentaremos salvar novamente.',
          variant: 'destructive',
        })
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [form, readOnly, project?.id, user?.id])

  const handleSave = async () => {
    if (!project || !user) return
    setLoading(true)
    setSaveStatus('saving')

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        toast({
          title: 'Sessão expirada',
          description: 'Faça login novamente para salvar.',
          variant: 'destructive',
        })
        setSaveStatus('error')
        return
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
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', paper.id)
        if (error) throw error
      }

      try {
        await supabase.rpc('audit_log_insert', {
          p_project_id: project.id,
          p_event_type: eventType as any,
          p_new_value: !paper ? 'Paper v1 criado' : `Paper v${paper.version} atualizado`,
          p_field_name: 'content',
        })
      } catch (auditErr) {
        console.error('Audit log error (non-blocking):', auditErr)
      }

      setSaveStatus('saved')
      setLastSavedAt(new Date())
      toast({ title: 'Sucesso', description: 'Paper salvo com sucesso.' })
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
        {FORM_FIELDS.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label>{field.label}</Label>
            <Textarea
              value={form[field.key]}
              onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
              disabled={readOnly}
              placeholder={field.placeholder}
              className="min-h-[100px]"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
