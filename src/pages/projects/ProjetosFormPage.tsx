import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useToast } from '@/components/ui/use-toast'
import { getClients } from '@/services/clients'
import { supabase } from '@/lib/supabase/client'
import { createProject } from '@/services/projects'
import { Badge } from '@/components/ui/badge'

export default function ProjetosFormPage() {
  const [step, setStep] = useState(1)
  const [clients, setClients] = useState<any[]>([])
  const [areas, setAreas] = useState<any[]>([])
  const navigate = useNavigate()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    client_id: '',
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    selected_areas: [] as string[],
    lead_area: '',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getClients(1, 100, '', 'active').then((res) => setClients(res.data || []))
    supabase
      .from('areas')
      .select('*')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        if (data) setAreas(data)
      })
  }, [])

  const handleNext = () => {
    if (step === 1 && !formData.client_id) {
      toast({ title: 'Atenção', description: 'Selecione um cliente', variant: 'destructive' })
      return
    }
    if (step === 2 && (!formData.name || !formData.start_date)) {
      toast({
        title: 'Atenção',
        description: 'Preencha os campos obrigatórios',
        variant: 'destructive',
      })
      return
    }
    setStep((s) => s + 1)
  }

  const handleSubmit = async () => {
    if (formData.selected_areas.length === 0 || !formData.lead_area) {
      toast({
        title: 'Atenção',
        description: 'Selecione ao menos uma área e defina a líder',
        variant: 'destructive',
      })
      return
    }
    setLoading(true)
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData?.user) {
        throw new Error('Usuário não autenticado.')
      }

      const { data: projectCode, error: rpcError } = await supabase.rpc('generate_project_code', {
        p_client_id: formData.client_id,
      })

      if (rpcError) {
        throw new Error(`Erro ao gerar código do projeto: ${rpcError.message}`)
      }

      const payload = {
        project_code: projectCode,
        client_id: formData.client_id,
        name: formData.name,
        description: formData.description,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        status: 'active',
        created_by: userData.user.id,
      }
      const mappedAreas = formData.selected_areas.map((id) => ({
        area_id: id,
        is_lead: id === formData.lead_area,
      }))

      const newProject = await createProject(payload, mappedAreas)
      toast({ title: 'Sucesso', description: 'Projeto criado!' })
      navigate(`/projetos/${newProject.id}`)
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const toggleArea = (id: string) => {
    setFormData((prev) => {
      const selected = prev.selected_areas.includes(id)
        ? prev.selected_areas.filter((a) => a !== id)
        : [...prev.selected_areas, id]
      const lead = selected.includes(prev.lead_area) ? prev.lead_area : ''
      return { ...prev, selected_areas: selected, lead_area: lead }
    })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => (step > 1 ? setStep((s) => s - 1) : navigate('/projetos'))}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold">Novo Projeto</h1>
      </div>

      <div className="flex items-center justify-between relative mb-8">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 -z-10 rounded"></div>
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 -z-10 rounded transition-all"
          style={{ width: `${((step - 1) / 2) * 100}%` }}
        ></div>
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${s <= step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}
          >
            {s}
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg border shadow-sm">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Selecione o Cliente</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto p-1">
              {clients.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setFormData({ ...formData, client_id: c.id })}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${formData.client_id === c.id ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' : 'hover:border-gray-400'}`}
                >
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-sm text-gray-500 font-mono mt-1">{c.code}</div>
                  {c.has_lpu && (
                    <Badge variant="secondary" className="mt-2 text-xs">
                      Possui LPU
                    </Badge>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={handleNext}>
                Próximo <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Dados Básicos</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Projeto *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Campanha de Verão"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de Início *</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de Fim Estimada</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição / Escopo</Label>
                <Textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={handleNext}>
                Próximo <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Áreas Envolvidas</h2>
            <p className="text-sm text-gray-500">
              Selecione as áreas que atuarão no projeto e defina uma como líder.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {areas.map((a) => (
                <label
                  key={a.id}
                  className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <Checkbox
                    checked={formData.selected_areas.includes(a.id)}
                    onCheckedChange={() => toggleArea(a.id)}
                  />
                  <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mt-1">
                    {a.name}
                  </span>
                </label>
              ))}
            </div>

            {formData.selected_areas.length > 0 && (
              <div className="mt-8 space-y-4">
                <h3 className="font-semibold border-b pb-2">Defina a Área Líder</h3>
                <RadioGroup
                  value={formData.lead_area}
                  onValueChange={(val) => setFormData({ ...formData, lead_area: val })}
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {formData.selected_areas.map((id) => {
                      const area = areas.find((x) => x.id === id)
                      return (
                        <div key={id} className="flex items-center space-x-2">
                          <RadioGroupItem value={id} id={`lead-${id}`} />
                          <Label htmlFor={`lead-${id}`}>{area?.name}</Label>
                        </div>
                      )
                    })}
                  </div>
                </RadioGroup>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Salvando...' : 'Finalizar Projeto'} <Check className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
