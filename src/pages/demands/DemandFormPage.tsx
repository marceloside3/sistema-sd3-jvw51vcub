import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { createDemand } from '@/services/demands'
import { useCurrentUser } from '@/hooks/use-current-user'

export default function DemandFormPage() {
  const { id } = useParams() // project_id
  const navigate = useNavigate()
  const { toast } = useToast()
  const { data: userCtx } = useCurrentUser()
  const [loading, setLoading] = useState(false)
  const [areas, setAreas] = useState<any[]>([])
  const [responsibles, setResponsibles] = useState<any[]>([])

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'normal',
    to_area_id: '',
    to_user_id: 'unassigned',
    due_date: '',
    from_area_id: '',
  })

  useEffect(() => {
    supabase
      .from('areas')
      .select('*')
      .eq('is_active', true)
      .order('name')
      .then((res) => setAreas(res.data || []))
    if (userCtx?.areas && userCtx.areas.length > 0) {
      setFormData((prev) => ({
        ...prev,
        from_area_id: userCtx.areas.find((a) => a.is_principal)?.id || userCtx.areas[0].id,
      }))
    }
  }, [userCtx])

  useEffect(() => {
    if (formData.to_area_id) {
      supabase
        .from('area_responsibles')
        .select('user_id, users(full_name)')
        .eq('area_id', formData.to_area_id)
        .then((res) => {
          setResponsibles(res.data || [])
          setFormData((prev) => ({ ...prev, to_user_id: 'unassigned' }))
        })
    }
  }, [formData.to_area_id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.to_area_id || !formData.from_area_id) {
      return toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' })
    }

    setLoading(true)
    try {
      const payload = {
        project_id: id,
        from_user_id: userCtx?.user?.id,
        from_area_id: formData.from_area_id,
        to_area_id: formData.to_area_id,
        to_user_id: formData.to_user_id === 'unassigned' ? null : formData.to_user_id,
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        due_date: formData.due_date || null,
      }

      await createDemand(payload)
      toast({ title: 'Demanda criada com sucesso' })
      navigate(`/projetos/${id}`)
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Nova Demanda Inter-área</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Sua Área Solicitante</Label>
              <Select
                value={formData.from_area_id}
                onValueChange={(v) => setFormData({ ...formData, from_area_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione sua área" />
                </SelectTrigger>
                <SelectContent>
                  {userCtx?.areas.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Título da Demanda *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Área de Destino *</Label>
                <Select
                  value={formData.to_area_id}
                  onValueChange={(v) => setFormData({ ...formData, to_area_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
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
                <Label>Usuário Específico (Opcional)</Label>
                <Select
                  value={formData.to_user_id}
                  onValueChange={(v) => setFormData({ ...formData, to_user_id: v })}
                  disabled={!formData.to_area_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Qualquer pessoa da área" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Qualquer pessoa</SelectItem>
                    {responsibles.map((r) => (
                      <SelectItem key={r.user_id} value={r.user_id}>
                        {r.users?.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                <Label>Data de Vencimento (Opcional)</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Enviando...' : 'Criar Demanda'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
