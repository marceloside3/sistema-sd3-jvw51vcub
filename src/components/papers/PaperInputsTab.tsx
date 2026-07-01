import { useEffect, useState, useRef } from 'react'
import { Loader2, Save, CheckCircle2, CloudOff, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase/client'
import { useCurrentUser } from '@/hooks/use-current-user'
import { AttachmentsSection } from '@/components/attachments/AttachmentsSection'

interface PaperInputsTabProps {
  project: any
  paper: any
  readOnly?: boolean
  onReload: () => void
}

export function PaperInputsTab({ project, paper, readOnly, onReload }: PaperInputsTabProps) {
  const { data: currentUser } = useCurrentUser()
  const { toast } = useToast()

  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [retrySignal, setRetrySignal] = useState(0)

  const onReloadRef = useRef(onReload)
  onReloadRef.current = onReload
  const toastRef = useRef(toast)
  toastRef.current = toast
  const paperRef = useRef(paper)
  paperRef.current = paper
  const lastSavedContentRef = useRef<string | null>(null)
  const currentUserRef = useRef(currentUser)
  currentUserRef.current = currentUser

  useEffect(() => {
    if (paper) {
      const paperContent = paper.refined_objective || ''
      const lastSaved = lastSavedContentRef.current
      if (lastSaved !== null && paperContent === lastSaved) {
        return
      }
      setContent(paperContent)
      lastSavedContentRef.current = null
    }
  }, [paper?.id])

  useEffect(() => {
    if (readOnly) return

    const currentPaper = paperRef.current
    const hasChanges = currentPaper
      ? content !== (currentPaper.refined_objective || '')
      : content.trim() !== ''

    if (!hasChanges && retrySignal === 0) {
      if (saveStatus !== 'idle' && saveStatus !== 'error') setSaveStatus('idle')
      return
    }

    if (!hasChanges && saveStatus !== 'error') {
      if (saveStatus !== 'idle') setSaveStatus('idle')
      return
    }

    const isContentEmpty = !content.trim()
    if (!currentPaper && isContentEmpty) return

    setSaveStatus('saving')
    const timer = setTimeout(async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) {
          toastRef.current({
            title: 'Sessão expirada',
            description:
              'Sua sessão expirou. Faça login novamente para salvar. Seu conteúdo foi preservado no formulário.',
            variant: 'destructive',
          })
          setSaveStatus('error')
          return
        }

        const payload = {
          refined_objective: content,
          updated_at: new Date().toISOString(),
        }

        if (currentPaper) {
          const { error } = await supabase
            .from('project_papers')
            .update(payload)
            .eq('id', currentPaper.id)
          if (error) throw error
          lastSavedContentRef.current = content
          onReloadRef.current()
        } else if (project?.id && currentUserRef.current?.id) {
          const { error } = await supabase.from('project_papers').insert({
            ...payload,
            project_id: project.id,
            status: 'draft',
            version: 1,
            created_by: currentUserRef.current.id,
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
          description: 'Verifique sua conexão. Clique em "Tentar novamente" para repetir.',
          variant: 'destructive',
        })
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [content, readOnly, project?.id, retrySignal])

  const handleRetry = () => {
    setRetrySignal((s) => s + 1)
  }

  const handleSave = async () => {
    if (!project || !currentUser) return
    setLoading(true)
    setSaveStatus('saving')

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        toast({
          title: 'Sessão expirada',
          description:
            'Sua sessão expirou. Faça login novamente para salvar. Seu conteúdo foi preservado no formulário.',
          variant: 'destructive',
        })
        setSaveStatus('error')
        return
      }

      let eventType = 'paper_updated'

      if (!paper) {
        const { error } = await supabase.from('project_papers').insert({
          project_id: project.id,
          refined_objective: content,
          status: 'draft',
          version: 1,
          created_by: currentUser.id,
        })
        if (error) throw error
        eventType = 'paper_created'
      } else {
        const { error } = await supabase
          .from('project_papers')
          .update({ refined_objective: content, updated_at: new Date().toISOString() })
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
    <div className="space-y-6 mt-6">
      <div className="border rounded-lg bg-white p-6 shadow-sm relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold">Informações Paper</h3>
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
              <span className="flex items-center gap-2">
                <span className="flex items-center text-sm text-red-500 gap-1">
                  <CloudOff className="w-3 h-3" /> Erro ao salvar
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRetry}
                  className="h-7 text-xs gap-1"
                >
                  <RotateCw className="w-3 h-3" />
                  Tentar novamente
                </Button>
              </span>
            )}
          </div>
          {!readOnly && (
            <Button
              className="transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
              onClick={handleSave}
              disabled={loading || saveStatus === 'saving'}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save fill="currentColor" className="w-4 h-4 mr-2" />
              )}
              Salvar Manualmente
            </Button>
          )}
        </div>

        <div className="space-y-2">
          <Label>Informações Paper</Label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={readOnly}
            placeholder="Digite todas as informações estratégicas do paper..."
            className="min-h-[300px]"
          />
        </div>
      </div>

      {project?.id && (
        <div className="border rounded-lg bg-white p-6 shadow-sm">
          <AttachmentsSection kind="project" entityId={project.id} />
        </div>
      )}
    </div>
  )
}
