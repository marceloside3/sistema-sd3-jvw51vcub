import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { createProject } from '@/services/projects'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'

export default function ProjectFormPage() {
  const [step, setStep] = useState(1)
  const [clients, setClients] = useState<any[]>([])
  const [areas, setAreas] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    client_id: '',
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    status: 'draft',
    selectedAreas: [] as string[],
    leadArea: '',
  })

  useEffect(() => {
    getClients(1, 100, '', 'active').then((res) => setClients(res.data || []))
    supabase
      .from('areas')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
      .then((res) => setAreas(res.data || []))
  }, [])

  const handleNext = () => {
    if (step === 1 && !formData.client_id)
      return toast({ title: 'Selecione um cliente', variant: 'destructive' })
    if (step === 2 && !formData.name)
      return toast({ title: 'Preencha o nome do projeto', variant: 'destructive' })
    setStep((s) => s + 1)
  }

  const handleSubmit = async () => {
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
    } catch (err: any) {
      toast({ title: 'Erro ao criar projeto', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
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
            {step === 1 && 'Passo 1: Selecione o Cliente'}
            {step === 2 && 'Passo 2: Informações Básicas'}
            {step === 3 && 'Passo 3: Áreas Envolvidas'}
          </CardTitle>
          <CardDescription>Preencha os dados do novo projeto.</CardDescription>
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
                  <Label>Data de Fim Prevista</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status Inicial</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
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

          <div className="flex justify-between pt-6">
            <Button
              variant="outline"
              onClick={() => (step > 1 ? setStep((s) => s - 1) : navigate('/projetos'))}
            >
              {step === 1 ? 'Cancelar' : 'Voltar'}
            </Button>
            {step < 3 ? (
              <Button onClick={handleNext}>Próximo</Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Criando...' : 'Finalizar Projeto'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
