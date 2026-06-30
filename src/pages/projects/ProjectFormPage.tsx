import { useState, useEffect } from 'react'
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { getClients } from '@/services/clients'
import { createProject, getProjectById } from '@/services/projects'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'

export default function ProjectFormPage() {
  const { id } = useParams()
  const isEditMode = !!id
  const editingId = id

  const [step, setStep] = useState(1)
  const [clients, setClients] = useState<any[]>([])
  const [areas, setAreas] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isLoadingProject, setIsLoadingProject] = useState(false)
  const [isProjectCompleted, setIsProjectCompleted] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()

  const [formData, setFormData] = useState({
    client_id: '',
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    status: 'active',
    selectedAreas: [] as string[],
    leadArea: '',
    origin_type: 'manual',
    briefing_data: {
      objetivo: '',
      publico_alvo: '',
      canais: '',
      prazo: '',
      budget: '',
      restricoes: '',
      referencias: '',
    },
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

            const bData = proj.briefing_data || {}

            setFormData({
              client_id: proj.client_id || '',
              name: proj.name || '',
              description: proj.description || '',
              start_date: proj.start_date ? proj.start_date.split('T')[0] : '',
              end_date: proj.end_date ? proj.end_date.split('T')[0] : '',
              status: proj.status || 'active',
              selectedAreas: projectAreas.map((a: any) => a.area_id) || [],
              leadArea: projectAreas.find((a: any) => a.is_lead)?.area_id || '',
              origin_type: proj.origin_type || 'manual',
              briefing_data: {
                objetivo: bData.objetivo || '',
                publico_alvo: bData.publico_alvo || '',
                canais: bData.canais || '',
                prazo: bData.prazo || '',
                budget: bData.budget || '',
                restricoes: bData.restricoes || '',
                referencias: bData.referencias || '',
              },
            })
          }
        })
        .finally(() => setIsLoadingProject(false))
    }
  }, [isEditMode, editingId])

  const handleNext = () => {
    if (step === 1 && !formData.client_id)
      return toast({ title: 'Selecione um cliente', variant: 'destructive' })
    if (step === 2 && !formData.name)
      return toast({ title: 'Preencha o nome do projeto', variant: 'destructive' })
    setStep((s) => s + 1)
  }

  const handleBudgetChange = (val: string) => {
    const numeric = val.replace(/\D/g, '')
    if (!numeric) {
      setFormData((f) => ({ ...f, briefing_data: { ...f.briefing_data, budget: '' } }))
      return
    }
    const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    const masked = formatter.format(Number(numeric) / 100)
    setFormData((f) => ({ ...f, briefing_data: { ...f.briefing_data, budget: masked } }))
  }

  const handleSubmit = async () => {
    const {
      data: { user: sessionUser },
      error: sessionError,
    } = await supabase.auth.getUser()
    if (sessionError || !sessionUser?.id) {
      toast({
        title: 'Sessão expirada',
        description: 'Não foi possível identificar seu usuário. Faça login novamente.',
        variant: 'destructive',
      })
      return
    }
    const validUserId = sessionUser.id
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!UUID_REGEX.test(validUserId)) {
      toast({
        title: 'ID de usuário inválido',
        description: 'O ID da sessão não é um UUID válido. Faça login novamente.',
        variant: 'destructive',
      })
      return
    }

    if (!formData.name || !formData.name.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'O nome do projeto é obrigatório.',
        variant: 'destructive',
      })
      return
    }

    if (!formData.client_id) {
      toast({
        title: 'Campo obrigatório',
        description: 'O cliente é obrigatório.',
        variant: 'destructive',
      })
      return
    }

    if (!formData.end_date) {
      toast({
        title: 'Campo obrigatório',
        description: 'Data de Fim Prevista é obrigatória.',
        variant: 'destructive',
      })
      return
    }

    if (formData.selectedAreas.length === 0)
      return toast({ title: 'Selecione ao menos uma área', variant: 'destructive' })
    if (!formData.leadArea || !formData.selectedAreas.includes(formData.leadArea))
      return toast({ title: 'Selecione a área líder dentre as marcadas', variant: 'destructive' })

    const b = formData.briefing_data
    const isBriefingComplete = Boolean(
      b.objetivo &&
      b.publico_alvo &&
      b.canais &&
      b.prazo &&
      b.budget &&
      b.restricoes &&
      b.referencias,
    )
    const briefingCompletedAt = isBriefingComplete ? new Date().toISOString() : null

    setLoading(true)
    try {
      const areaPayload = formData.selectedAreas.map((a) => ({
        area_id: a,
        is_lead: a === formData.leadArea,
      }))

      if (isEditMode && editingId) {
        const { error: updateError } = await supabase
          .from('projects')
          .update({
            name: formData.name,
            description: formData.description,
            start_date: formData.start_date || null,
            end_date: formData.end_date,
            client_id: formData.client_id,
            status: formData.status,
            origin_type: formData.origin_type,
            briefing_data: formData.briefing_data,
            briefing_completed_at: briefingCompletedAt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId)

        if (updateError) {
          console.error('[ProjectFormPage] Error updating project:', {
            message: updateError.message,
            code: updateError.code,
            details: updateError.details,
            hint: updateError.hint,
            editingId,
          })
          throw updateError
        }

        const { error: delError } = await supabase
          .from('project_areas')
          .delete()
          .eq('project_id', editingId)

        if (delError) {
          console.error('[ProjectFormPage] Error deleting project areas:', {
            message: delError.message,
            code: delError.code,
            details: delError.details,
            hint: delError.hint,
            editingId,
          })
          throw delError
        }

        const { error: insError } = await supabase
          .from('project_areas')
          .insert(areaPayload.map((a) => ({ ...a, project_id: editingId })))

        if (insError) {
          console.error('[ProjectFormPage] Error inserting project areas:', {
            message: insError.message,
            code: insError.code,
            details: insError.details,
            hint: insError.hint,
            editingId,
            areaPayload,
          })
          throw insError
        }

        toast({ title: 'Projeto atualizado com sucesso!' })
        navigate(`/projetos/${editingId}`)
      } else {
        const projectPayload = {
          name: formData.name,
          description: formData.description,
          start_date: formData.start_date || new Date().toISOString().split('T')[0],
          end_date: formData.end_date,
          client_id: formData.client_id,
          status: formData.status,
          origin_type: formData.origin_type,
          briefing_data: formData.briefing_data,
          briefing_completed_at: briefingCompletedAt,
          created_by: validUserId,
        }

        const project = await createProject(projectPayload, areaPayload)

        if (!project) {
          throw new Error('Falha ao criar projeto: resposta vazia do servidor.')
        }

        toast({ title: 'Projeto criado com sucesso!' })
        navigate(`/projetos/${project.id}`)
      }
    } catch (err: any) {
      console.error('[ProjectFormPage] Erro ao salvar projeto:', {
        error: err,
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
        techAlert: err?.techAlert,
        isEditMode,
        editingId,
        validUserId,
        formData: {
          name: formData.name,
          client_id: formData.client_id,
          selectedAreas: formData.selectedAreas,
          leadArea: formData.leadArea,
        },
      })
      let errorTitle = isEditMode ? 'Erro ao atualizar projeto' : 'Erro ao criar projeto'
      let errorDesc =
        err?.message || 'Ocorreu um erro inesperado. Verifique o console para mais detalhes.'

      if (err?.techAlert) {
        errorDesc = err.techAlert
      }

      if (err?.code === '42501') {
        errorTitle = 'Permissão negada (RLS Policy Violation)'
        errorDesc =
          err?.techAlert ||
          'Você não tem permissão para realizar esta operação. Verifique se seu perfil está corretamente configurado ou contate o administrador.'
      } else if (err?.code === '23503') {
        errorTitle = 'Erro de integridade'
        errorDesc =
          'Referência inválida. Verifique se o cliente e as áreas selecionadas são válidos.'
      } else if (err?.code === '23505') {
        errorTitle = 'Duplicidade'
        errorDesc = 'Já existe um projeto com estes dados.'
      } else if (err?.message?.includes('não está registrado')) {
        errorTitle = 'Usuário não registrado'
        errorDesc = err.message
      }

      toast({
        title: errorTitle,
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-8">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`flex-1 h-2 rounded-full ${step >= s ? 'bg-blue-600' : 'bg-gray-200'}`}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {isEditMode ? 'Editar Projeto' : 'Novo Projeto'} -{' '}
            {step === 1 && 'Passo 1: Selecione o Cliente'}
            {step === 2 && 'Passo 2: Informações Básicas e Briefing'}
            {step === 3 && 'Passo 3: Áreas Envolvidas'}
          </CardTitle>
          <CardDescription>
            {isEditMode ? 'Atualize os dados do projeto.' : 'Preencha os dados do novo projeto.'}
          </CardDescription>
        </CardHeader>
        {isProjectCompleted && (
          <div className="mx-6 px-4 py-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-sm mb-4">
            Projeto Concluído. Apenas descrição, status e áreas podem ser editados. Campos críticos
            (nome, datas, cliente, prioridade) estão bloqueados.
          </div>
        )}
        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
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
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Projeto</Label>
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
                    required
                    disabled={isProjectCompleted}
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <Accordion type="single" collapsible className="w-full border rounded-md px-4 mt-6">
                <AccordionItem value="briefing" className="border-b-0">
                  <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                    Briefing do Projeto
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4 pb-4">
                    <div className="space-y-2">
                      <Label>1. Objetivo</Label>
                      <Textarea
                        placeholder="Qual é o objetivo principal do projeto?"
                        value={formData.briefing_data.objetivo}
                        onChange={(e) =>
                          setFormData((f) => ({
                            ...f,
                            briefing_data: { ...f.briefing_data, objetivo: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>2. Público-alvo</Label>
                      <Textarea
                        placeholder="Quem queremos atingir?"
                        value={formData.briefing_data.publico_alvo}
                        onChange={(e) =>
                          setFormData((f) => ({
                            ...f,
                            briefing_data: { ...f.briefing_data, publico_alvo: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>3. Canais</Label>
                      <Textarea
                        placeholder="Onde será veiculado? (ex: Instagram, E-mail, Site)"
                        value={formData.briefing_data.canais}
                        onChange={(e) =>
                          setFormData((f) => ({
                            ...f,
                            briefing_data: { ...f.briefing_data, canais: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>4. Prazo</Label>
                        <Input
                          type="date"
                          value={formData.briefing_data.prazo}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              briefing_data: { ...f.briefing_data, prazo: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>5. Budget</Label>
                        <Input
                          placeholder="R$ 0,00"
                          value={formData.briefing_data.budget}
                          onChange={(e) => handleBudgetChange(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>6. Restrições</Label>
                      <Textarea
                        placeholder="O que não pode ser feito ou dito?"
                        value={formData.briefing_data.restricoes}
                        onChange={(e) =>
                          setFormData((f) => ({
                            ...f,
                            briefing_data: { ...f.briefing_data, restricoes: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>7. Referências</Label>
                      <Textarea
                        placeholder="Links ou ideias de referência"
                        value={formData.briefing_data.referencias}
                        onChange={(e) =>
                          setFormData((f) => ({
                            ...f,
                            briefing_data: { ...f.briefing_data, referencias: e.target.value },
                          }))
                        }
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
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
            {step < 3 ? (
              <Button onClick={handleNext}>Próximo</Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Processando...' : isEditMode ? 'Salvar Alterações' : 'Criar Projeto'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
