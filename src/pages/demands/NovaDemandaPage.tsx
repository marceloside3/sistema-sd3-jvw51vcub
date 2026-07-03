import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase/client'
import { createDemand } from '@/services/demands'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useAuth } from '@/hooks/use-auth'
import { getProjects } from '@/services/projects'
import { PendingFilesPicker } from '@/components/attachments/PendingFilesPicker'
import { uploadAttachment } from '@/services/attachments'

export default function NovaDemandaPage() {
  const [searchParams] = useSearchParams()
  const initialProjectId = searchParams.get('projectId') || ''

  const { data: currentUser } = useCurrentUser()
  const { user: authUser } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const currentUserId = currentUser?.data?.id ?? authUser?.id ?? null

  const [projects, setProjects] = useState<any[]>([])
  const [areas, setAreas] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])

  const [formData, setFormData] = useState({
    project_id: initialProjectId,
    title: '',
    description: '',
    priority: 'normal',
    to_area_id: '',
    to_user_id: 'any',
    due_date: '',
  })
  const [loading, setLoading] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(
    null,
  )

  useEffect(() => {
    getProjects().then((res) => {
      const filtered = res.filter((p) => ['active', 'in_progress'].includes(p.status))
      setProjects(filtered)
      if (initialProjectId) {
        setFormData((prev) => ({ ...prev, project_id: initialProjectId }))
      }
    })
    supabase
      .from('areas')
      .select('*')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        if (data) setAreas(data)
      })
  }, [])

  useEffect(() => {
    if (formData.to_area_id) {
      supabase
        .from('area_responsibles')
        .select('user_id, users!inner(id, full_name)')
        .eq('area_id', formData.to_area_id)
        .then(({ data }) => {
          if (data) {
            setUsers(data.map((d) => d.users))
          }
        })
    } else {
      setUsers([])
    }
  }, [formData.to_area_id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.project_id || !formData.title || !formData.to_area_id) {
      toast({
        title: 'Atenção',
        description: 'Preencha os campos obrigatórios',
        variant: 'destructive',
      })
      return
    }

    if (!currentUserId) {
      toast({
        title: 'Erro de sessão',
        description:
          'Não foi possível identificar o usuário. Recarregue a página ou faça login novamente.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const payload = {
        project_id: formData.project_id,
        from_user_id: currentUserId,
        from_area_id: currentUser?.data?.areas?.[0]?.id || null,
        to_area_id: formData.to_area_id,
        to_user_id: formData.to_user_id === 'any' ? null : formData.to_user_id,
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        due_date: formData.due_date || null,
        status: 'pending',
      }

      const newDemand = await createDemand(payload)

      if (pendingFiles.length > 0 && currentUserId) {
        setUploadProgress({ current: 0, total: pendingFiles.length })
        let successes = 0
        let failures = 0

        for (let i = 0; i < pendingFiles.length; i++) {
          try {
            await uploadAttachment('demand', newDemand.id, pendingFiles[i], currentUserId)
            successes++
          } catch (uploadErr) {
            console.error('Upload error:', uploadErr)
            failures++
          }
          setUploadProgress({ current: i + 1, total: pendingFiles.length })
        }

        if (failures > 0) {
          toast({
            title: 'Demanda criada com ressalvas',
            description: `${successes} de ${pendingFiles.length} anexos enviados. ${failures} falhou(aram).`,
            variant: 'destructive',
          })
        } else {
          toast({ title: 'Sucesso', description: 'Demanda e anexos criados!' })
        }
        setUploadProgress(null)
      } else {
        toast({ title: 'Sucesso', description: 'Demanda criada!' })
      }

      navigate(`/demandas/${newDemand.id}`)
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold">Nova Demanda</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border shadow-sm space-y-6">
        <div className="space-y-4">
          {!initialProjectId && (
            <div className="space-y-2">
              <Label>Projeto *</Label>
              <Select
                value={formData.project_id}
                onValueChange={(v) => setFormData({ ...formData, project_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o projeto" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.project_code} - {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Título *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Criar KV da campanha"
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição detalhada *</Label>
            <Textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select
                value={formData.priority}
                onValueChange={(v) => setFormData({ ...formData, priority: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prazo Ideal</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>Área Destino *</Label>
              <Select
                value={formData.to_area_id}
                onValueChange={(v) =>
                  setFormData({ ...formData, to_area_id: v, to_user_id: 'any' })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Responsável Específico (Opcional)</Label>
              <Select
                disabled={!formData.to_area_id || users.length === 0}
                value={formData.to_user_id}
                onValueChange={(v) => setFormData({ ...formData, to_user_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Qualquer pessoa da área" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Qualquer pessoa da área</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <PendingFilesPicker files={pendingFiles} onChange={setPendingFiles} />
        </div>

        <div className="flex items-center justify-end gap-4 pt-4 border-t">
          {uploadProgress && (
            <span className="text-sm text-muted-foreground">
              Enviando anexos: {uploadProgress.current} de {uploadProgress.total}...
            </span>
          )}
          <Button type="submit" disabled={loading || !currentUserId}>
            {loading ? 'Enviando...' : 'Criar Demanda'}
          </Button>
        </div>
      </form>
    </div>
  )
}
