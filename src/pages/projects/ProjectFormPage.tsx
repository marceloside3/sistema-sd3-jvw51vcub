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
import { getClients } from '@/services/clients'
import { createProject, getProjectById } from '@/services/projects'
import { useToast } from '@/hooks/use-toast'
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
  const navigate = useNavigate()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    client_id: '',
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    status: 'active',
    selectedAreas: [] as string[],
    leadArea: '',
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
            setFormData({
              client_id: proj.client_id || '',
              name: proj.name || '',
              description: proj.description || '',
              start_date: proj.start_date ? proj.start_date.split('T')[0] : '',
              end_date: proj.end_date ? proj.end_date.split('T')[0] : '',
              status: proj.status || 'active',
              selectedAreas: projectAreas.map((a: any) => a.area_id) || [],
              leadArea: projectAreas.find((a: any) => a.is_lead)?.area_id || '',
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

  const handleSubmit = async () => {
    if (!formData.end_date) {
      alert('Data de Fim Prevista é obrigatória.')
      return
    }

    if (formData.selectedAreas.length === 0)
      return toast({ title: 'Selecione ao menos uma área', variant: 'destructive' })
    if (!formData.leadArea || !formData.selectedAreas.includes(formData.leadArea))
      return toast({ title: 'Selecione a área líder dentre as marcadas', variant: 'destructive' })

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
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId)

        if (updateError) throw updateError

        const { error: delError } = await supabase
          .from('project_areas')
          .delete()
          .eq('project_id', editingId)

        if (delError) throw delError

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
            end_date: formData.end_date || new Date().toISOString().split('T')[0],
            client_id: formData.client_id,
            status: formData.status,
          },
          areaPayload,
        )

        toast({ title: 'Projeto criado com sucesso!' })
        navigate(`/projetos/${project.id}`)
      }
    } catch (err: any) {
      toast({
        title: isEditMode ? 'Erro ao atualizar projeto' : 'Erro ao criar projeto',
        description: err.message,
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
            {step === 2 && 'Passo 2: Informações Básicas'}
            {step === 3 && 'Passo 3: Áreas Envolvidas'}
          </CardTitle>
          <CardDescription>
            {isEditMode ? 'Atualize os dados do projeto.' : 'Preencha os dados do novo projeto.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <Label>Cliente</Label>
              <Select
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
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
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
