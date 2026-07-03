import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { getClients } from '@/services/clients'
import { createProject, getProjectById } from '@/services/projects'
import { uploadAttachment } from '@/services/attachments'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { DynamicBriefingStep } from '@/components/projects/DynamicBriefingStep'
import { getBriefingFieldsForAreas } from '@/lib/briefing-fields'
import { cn } from '@/lib/utils'

const MONTHS = [
  { value: '1', label: 'Janeiro' },
  { value: '2', label: 'Fevereiro' },
  { value: '3', label: 'Março' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Maio' },
  { value: '6', label: 'Junho' },
  { value: '7', label: 'Julho' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
]

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((y) => ({
  value: String(y),
  label: String(y),
}))

export default function ProjectFormPage() {
  const { id } = useParams()
  const isEditMode = !!id
  const editingId = id
  const navigate = useNavigate()
  const { toast } = useToast()

  const [step, setStep] = useState(1)
  const [clients, setClients] = useState<any[]>([])
  const [areas, setAreas] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isLoadingProject, setIsLoadingProject] = useState(false)
  const [isProjectCompleted, setIsProjectCompleted] = useState(false)
  const [briefingData, setBriefingData] = useState<Record<string, string>>({})
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  const [formData, setFormData] = useState({
    client_id: '',
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    status: 'active',
    origin_type: 'manual',
    selectedAreas: [] as string[],
    leadArea: '',
    competence_month: '',
    competence_year: String(CURRENT_YEAR),
  })

  useEffect(() => {
    getClients(1, 100, '', 'active').then((res: any) => setClients(res.data || []))
    supabase
      .from('areas')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
      .then((res) => setAreas(res.data || []))

    if (isEditMode && editingId) {
      setIsLoadingProject(true)
      Promise.all([
        getProjectById(editingId),
        supabase.from('project_areas').select('area_id, is_lead').eq('project_id', editingId),
      ])
        .then(([proj, areasRes]) => {
          if (proj) {
            const projectAreas = areasRes.data || []
            setIsProjectCompleted(proj.status === 'completed')
            setFormData({
              client_id: proj.client_id || '',
              name: proj.name || '',
              description: proj.description || '',
              start_date: proj.start_date ? proj.start_date.split('T')[0] : '',
              end_date: proj.end_date ? proj.end_date.split('T')[0] : '',
              status: proj.status || 'active',
              origin_type: proj.origin_type || 'manual',
              selectedAreas: projectAreas.map((a: any) => a.area_id) || [],
              leadArea: projectAreas.find((a: any) => a.is_lead)?.area_id || '',
              competence_month: proj.competence_month ? String(proj.competence_month) : '',
              competence_year: proj.competence_year
                ? String(proj.competence_year)
                : String(CURRENT_YEAR),
            })
            setBriefingData((proj.briefing_data as Record<string, string>) || {})
          }
        })
        .finally(() => setIsLoadingProject(false))
    }
  }, [isEditMode, editingId])

  const selectedAreaCodes = areas
    .filter((a) => formData.selectedAreas.includes(a.id))
    .map((a) => a.code)

  const briefingFields = getBriefingFieldsForAreas(selectedAreaCodes)
  const allBriefingFieldsFilled =
    briefingFields.length > 0 &&
    briefingFields.every((f) => (briefingData[f.key] || '').trim().length > 0)

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === formData.client_id),
    [clients, formData.client_id],
  )

  const projectCodePreview = useMemo(() => {
    if (!selectedClient || !formData.competence_month) return null
    const mm = String(formData.competence_month).padStart(2, '0')
    const yyyy = formData.competence_year
    return `${selectedClient.code}-${mm}-${yyyy}-001`
  }, [selectedClient, formData.competence_month, formData.competence_year])

  const handleNext = () => {
    if (step === 1) {
      if (!formData.client_id)
        return toast({ title: 'Selecione um cliente', variant: 'destructive' })
      if (!formData.competence_month)
        return toast({ title: 'Selecione o mês de competência', variant: 'destructive' })
    }
    if (step === 2 && !formData.name)
      return toast({ title: 'Preencha o nome do projeto', variant: 'destructive' })
    if (step === 2 && !formData.end_date)
      return toast({ title: 'Preencha a data de fim prevista', variant: 'destructive' })
    if (step === 3) {
      if (formData.selectedAreas.length === 0)
        return toast({ title: 'Selecione ao menos uma área', variant: 'destructive' })
      if (!formData.leadArea || !formData.selectedAreas.includes(formData.leadArea))
        return toast({ title: 'Selecione a área líder dentre as marcadas', variant: 'destructive' })
    }
    setStep((s) => s + 1)
  }

  const handleSubmit = async () => {
    const fields = getBriefingFieldsForAreas(selectedAreaCodes)
    const emptyFields = fields.filter((f) => !briefingData[f.key]?.trim())
    if (emptyFields.length > 0) {
      return toast({
        title: 'Preencha todos os campos do briefing',
        description: `Faltam: ${emptyFields.map((f) => f.label).join(', ')}`,
        variant: 'destructive',
      })
    }

    const {
      data: { user: sessionUser },
    } = await supabase.auth.getUser()
    if (!sessionUser?.id) {
      return toast({ title: 'Sessão expirada', variant: 'destructive' })
    }

    setLoading(true)
    try {
      const areaPayload = formData.selectedAreas.map((a) => ({
        area_id: a,
        is_lead: a === formData.leadArea,
      }))
      const briefingCompletedAt =
        fields.length > 0 && emptyFields.length === 0 ? new Date().toISOString() : null

      if (isEditMode && editingId) {
        const updatePayload: any = {
          name: formData.name,
          description: formData.description,
          start_date: formData.start_date || null,
          end_date: formData.end_date,
          client_id: formData.client_id,
          status: formData.status,
          origin_type: formData.origin_type,
          briefing_data: briefingData,
          briefing_completed_at: briefingCompletedAt,
          competence_month: formData.competence_month ? parseInt(formData.competence_month) : null,
          competence_year: formData.competence_year ? parseInt(formData.competence_year) : null,
          updated_at: new Date().toISOString(),
        }

        const { error: updateError } = await supabase
          .from('projects')
          .update(updatePayload)
          .eq('id', editingId)
        if (updateError) throw updateError

        await supabase.from('project_areas').delete().eq('project_id', editingId)
        const { error: insError } = await supabase
          .from('project_areas')
          .insert(areaPayload.map((a) => ({ ...a, project_id: editingId })))
        if (insError) throw insError

        toast({ title: 'Projeto atualizado com sucesso!' })
        navigate(`/projetos/${editingId}`)
      } else {
        const project = await createProject(
          {
            name: formData.name,
            description: formData.description,
            start_date: formData.start_date || new Date().toISOString().split('T')[0],
            end_date: formData.end_date,
            client_id: formData.client_id,
            status: formData.status,
            origin_type: formData.origin_type,
            briefing_data: briefingData,
            briefing_completed_at: briefingCompletedAt,
            created_by: sessionUser.id,
            competence_month: parseInt(formData.competence_month),
            competence_year: parseInt(formData.competence_year),
          },
          areaPayload,
        )

        if (!project) throw new Error('Falha ao criar projeto: resposta vazia do servidor.')

        for (const file of pendingFiles) {
          try {
            await uploadAttachment('project', project.id, file, sessionUser.id)
          } catch (e) {
            console.error('File upload error:', e)
          }
        }

        toast({ title: 'Projeto criado com sucesso!' })
        navigate(`/projetos/${project.id}`)
      }
    } catch (err: any) {
      let errorDesc = err?.message || 'Ocorreu um erro inesperado.'
      if (err?.code === '42501')
        errorDesc = 'Permissão negada. Verifique seu perfil ou contate o administrador.'
      else if (err?.code === '23503')
        errorDesc = 'Referência inválida. Verifique cliente e áreas selecionadas.'
      else if (err?.code === '23505') errorDesc = 'Já existe um projeto com estes dados.'
      toast({
        title: isEditMode ? 'Erro ao atualizar projeto' : 'Erro ao criar projeto',
        description: errorDesc,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (isLoadingProject) {
    return <div className="p-8 text-center">Carregando projeto...</div>
  }

  const stepTitles = ['Cliente', 'Informações', 'Áreas', 'Briefing']

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        {stepTitles.map((title, i) => (
          <div key={i} className="flex items-center gap-2 flex-1 last:flex-none">
            <div
              className={cn(
                'flex items-center gap-2',
                step >= i + 1 ? 'text-orange-600' : 'text-muted-foreground',
              )}
            >
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                  step >= i + 1 ? 'bg-orange-600 text-white' : 'bg-muted',
                )}
              >
                {i + 1}
              </div>
              <span className="text-sm font-medium hidden sm:inline">{title}</span>
            </div>
            {i < stepTitles.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 transition-colors',
                  step > i + 1 ? 'bg-orange-600' : 'bg-muted',
                )}
              />
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {isEditMode ? 'Editar Projeto' : 'Novo Projeto'} — {stepTitles[step - 1]}
          </CardTitle>
          <CardDescription>
            {isEditMode ? 'Atualize os dados do projeto.' : 'Preencha os dados do novo projeto.'}
          </CardDescription>
        </CardHeader>
        {isProjectCompleted && (
          <div className="mx-6 px-4 py-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-sm mb-4">
            Projeto Concluído. Campos críticos estão bloqueados.
          </div>
        )}
        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select
                  disabled={isProjectCompleted}
                  value={formData.client_id}
                  onValueChange={(v) => setFormData({ ...formData, client_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente ativo" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    Mês de Competência <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    disabled={isProjectCompleted}
                    value={formData.competence_month}
                    onValueChange={(v) => setFormData({ ...formData, competence_month: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ano de Competência</Label>
                  <Select
                    disabled={isProjectCompleted}
                    value={formData.competence_year}
                    onValueChange={(v) => setFormData({ ...formData, competence_year: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {YEAR_OPTIONS.map((y) => (
                        <SelectItem key={y.value} value={y.value}>
                          {y.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {projectCodePreview && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 flex items-center gap-3 animate-fade-in">
                  <Badge variant="outline" className="bg-orange-600 text-white border-orange-600">
                    Prévia do Código
                  </Badge>
                  <span className="text-sm font-mono font-semibold text-orange-900">
                    {projectCodePreview}
                  </span>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>
                  Nome do Projeto <span className="text-red-500">*</span>
                </Label>
                <Input
                  disabled={isProjectCompleted}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de Início</Label>
                  <Input
                    type="date"
                    disabled={isProjectCompleted}
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Data de Fim Prevista <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    disabled={isProjectCompleted}
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Origem</Label>
                <Select
                  value={formData.origin_type}
                  disabled={isProjectCompleted}
                  onValueChange={(v) => setFormData({ ...formData, origin_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="briefing">Briefing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <Label>Selecione as Áreas do Projeto</Label>
                <div className="grid grid-cols-2 gap-3">
                  {areas.map((a) => (
                    <div key={a.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`area-${a.id}`}
                        checked={formData.selectedAreas.includes(a.id)}
                        onCheckedChange={(c) => {
                          const newAreas = c
                            ? [...formData.selectedAreas, a.id]
                            : formData.selectedAreas.filter((id) => id !== a.id)
                          setFormData({
                            ...formData,
                            selectedAreas: newAreas,
                            leadArea: c
                              ? formData.leadArea
                              : formData.leadArea === a.id
                                ? ''
                                : formData.leadArea,
                          })
                        }}
                      />
                      <label htmlFor={`area-${a.id}`} className="text-sm cursor-pointer">
                        {a.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              {formData.selectedAreas.length > 0 && (
                <div className="space-y-2 pt-4 border-t">
                  <Label>Qual será a Área Líder (Lead)?</Label>
                  <Select
                    value={formData.leadArea}
                    onValueChange={(v) => setFormData({ ...formData, leadArea: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a área líder" />
                    </SelectTrigger>
                    <SelectContent>
                      {areas
                        .filter((a) => formData.selectedAreas.includes(a.id))
                        .map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <DynamicBriefingStep
              areaCodes={selectedAreaCodes}
              briefingData={briefingData}
              onBriefingChange={(key, value) => setBriefingData({ ...briefingData, [key]: value })}
              isEditMode={isEditMode}
              projectId={editingId}
              pendingFiles={pendingFiles}
              onFilesChange={setPendingFiles}
            />
          )}

          <div className="flex justify-between pt-6">
            <Button
              variant="outline"
              onClick={() => {
                if (step > 1) {
                  setStep((s) => s - 1)
                } else if (isEditMode && editingId) {
                  navigate(`/projetos/${editingId}`)
                } else {
                  navigate('/projetos')
                }
              }}
            >
              {step === 1 ? 'Cancelar' : 'Voltar'}
            </Button>
            {step < 4 ? (
              <Button onClick={handleNext}>Próximo</Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading || (step === 4 && !allBriefingFieldsFilled)}
              >
                {loading ? 'Processando...' : isEditMode ? 'Salvar Alterações' : 'Finalizar'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
