import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Package,
  FileSpreadsheet,
  Pencil,
  Coins,
  Sparkles,
} from 'lucide-react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase/client'
import { createDemand, createDemandItems, DemandItemInput } from '@/services/demands'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useAuth } from '@/hooks/use-auth'
import { getProjects } from '@/services/projects'
import { PendingFilesPicker } from '@/components/attachments/PendingFilesPicker'
import { uploadAttachment } from '@/services/attachments'
import { getLpuItems, LpuItem, findMatchingLpuItem } from '@/services/lpu'
import { LpuItemPicker } from '@/components/demands/LpuItemPicker'

interface DemandItem {
  item_name: string
  description: string
  quantity: number
  deadline: string
  delivery_location: string
  lpu_item_id: string | null
  unit_price: number | null
  is_custom: boolean
  lpu_range: string | null
}

function normalizeStr(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

const emptyItem: DemandItem = {
  item_name: '',
  description: '',
  quantity: 1,
  deadline: '',
  delivery_location: '',
  lpu_item_id: null,
  unit_price: null,
  is_custom: true,
  lpu_range: null,
}

export default function NovaDemandaPage() {
  const params = useParams()
  const [searchParams] = useSearchParams()
  const initialProjectId = params.id || searchParams.get('projectId') || ''

  const { data: currentUser } = useCurrentUser()
  const { user: authUser } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const currentUserId = currentUser?.id ?? authUser?.id ?? null

  const [projects, setProjects] = useState<any[]>([])
  const [areas, setAreas] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [lpuItems, setLpuItems] = useState<LpuItem[]>([])

  const [formData, setFormData] = useState({
    project_id: initialProjectId,
    title: '',
    description: '',
    priority: 'normal',
    to_area_id: '',
    to_user_id: 'any',
    tipo_criacao: '' as '' | 'peca_digital' | 'peca_impressa' | '3d',
    due_date: '',
    // Criação-specific fields
    entrega_a_ser_feita: '',
    finalidade_peca: '',
    formato_peca: '',
    quantidade_pecas: 1,
    direcional_pecas: '',
  })
  // Separate state for the link references input (one link per line)
  const [refLinksInput, setRefLinksInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(
    null,
  )

  const [demandItems, setDemandItems] = useState<DemandItem[]>([])
  const [lpuLoaded, setLpuLoaded] = useState(false)
  const [fetchedClientId, setFetchedClientId] = useState<string | null>(null)
  const [itemForm, setItemForm] = useState<DemandItem>(emptyItem)
  const [itemMode, setItemMode] = useState<'lpu' | 'manual'>('manual')

  const selectedArea = areas.find((a) => a.id === formData.to_area_id)
  const areaCode = selectedArea ? normalizeStr(selectedArea.code || '') : ''
  const isCriacaoArea = areaCode === 'criacao'
  const isProducaoArea = areaCode === 'producao'
  const isFinanceiroArea = areaCode === 'financeiro'

  const [financeForm, setFinanceForm] = useState({
    client_id: '',
    cnpj: '',
    issuance_type: '',
    amount: '',
    payment_due_date: '',
    nf_description: '',
    notes: '',
  })
  const selectedFinanceClient = clients.find((c) => c.id === financeForm.client_id)
  // Auto-fill CNPJ whenever the selected client changes (if client has a CNPJ)
  useEffect(() => {
    setFinanceForm((prev) => ({
      ...prev,
      cnpj: selectedFinanceClient?.cnpj || '',
    }))
  }, [selectedFinanceClient?.id])
  // Reset finance form fields when leaving the Financeiro area
  useEffect(() => {
    if (!isFinanceiroArea) {
      setFinanceForm({
        client_id: '',
        cnpj: '',
        issuance_type: '',
        amount: '',
        payment_due_date: '',
        nf_description: '',
        notes: '',
      })
    }
  }, [isFinanceiroArea])

  // Reset tipo_criacao when leaving Criação area
  useEffect(() => {
    if (!isCriacaoArea && formData.tipo_criacao) {
      setFormData((prev) => ({ ...prev, tipo_criacao: '' }))
    }
  }, [isCriacaoArea, formData.tipo_criacao])

  // Reset Criação-specific fields when leaving Criação area (no reload)
  useEffect(() => {
    if (!isCriacaoArea) {
      setFormData((prev) => {
        const needsReset =
          prev.entrega_a_ser_feita ||
          prev.finalidade_peca ||
          prev.formato_peca ||
          prev.quantidade_pecas !== 1 ||
          prev.direcional_pecas
        if (!needsReset) return prev
        return {
          ...prev,
          entrega_a_ser_feita: '',
          finalidade_peca: '',
          formato_peca: '',
          quantidade_pecas: 1,
          direcional_pecas: '',
        }
      })
      setRefLinksInput((prev) => (prev ? '' : prev))
    }
  }, [isCriacaoArea])

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === formData.project_id),
    [projects, formData.project_id],
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
      .order('display_order')
      .then(({ data }) => {
        if (data) setAreas(data)
      })
    // Load active clients for the Financeiro area dropdown
    supabase
      .from('clients')
      .select('id, code, name, cnpj')
      .eq('status', 'active')
      .order('name', { ascending: true })
      .then(({ data }) => {
        if (data) setClients(data)
      })
  }, [])

  useEffect(() => {
    if (formData.to_area_id) {
      if (isCriacaoArea) {
        // Gate do Diretor: show only users with is_director = true linked to Criação
        supabase
          .from('area_responsibles')
          .select('user_id, users!inner(id, full_name, profiles!inner(is_director))')
          .eq('area_id', formData.to_area_id)
          .eq('users.profiles.is_director', true)
          .then(({ data }) => {
            if (data) {
              const directors = data
                .map((d: any) => d.users)
                .filter((u: any) => u?.profiles?.is_director === true)
              setUsers(directors)
            }
          })
      } else {
        supabase
          .from('area_responsibles')
          .select('user_id, users!inner(id, full_name)')
          .eq('area_id', formData.to_area_id)
          .then(({ data }) => {
            if (data) setUsers(data.map((d) => d.users))
          })
      }
    } else {
      setUsers([])
    }
  }, [formData.to_area_id, isCriacaoArea])

  useEffect(() => {
    const clientId = selectedProject?.client?.id || selectedProject?.client_id
    if (!clientId && formData.project_id && isProducaoArea) {
      supabase
        .from('projects')
        .select('client_id')
        .eq('id', formData.project_id)
        .single()
        .then(({ data }) => {
          setFetchedClientId(data?.client_id ?? null)
        })
    } else {
      setFetchedClientId(null)
    }
  }, [formData.project_id, isProducaoArea, selectedProject?.client?.id, selectedProject?.client_id])

  useEffect(() => {
    const clientId = selectedProject?.client?.id || selectedProject?.client_id || fetchedClientId
    if (isProducaoArea && clientId) {
      setLpuLoaded(false)
      getLpuItems(clientId)
        .then((items) => {
          setLpuItems(items)
          setLpuLoaded(true)
          setItemMode(items.length > 0 ? 'lpu' : 'manual')
          setItemForm({ ...emptyItem, is_custom: items.length === 0 })
        })
        .catch(() => {
          setLpuItems([])
          setLpuLoaded(true)
          setItemMode('manual')
        })
    } else {
      setLpuItems([])
      setLpuLoaded(false)
    }
  }, [isProducaoArea, selectedProject?.client?.id, selectedProject?.client_id, fetchedClientId])

  const handleLpuSelect = (itemName: string) => {
    const isFromLpu = lpuItems.some(
      (item) => item.item_name.toLowerCase() === itemName.toLowerCase(),
    )
    const matched = findMatchingLpuItem(lpuItems, itemName, itemForm.quantity || 1)
    setItemForm({
      ...emptyItem,
      item_name: itemName,
      description: matched?.description || '',
      lpu_item_id: matched?.id || null,
      unit_price: matched ? matched.unit_value : null,
      is_custom: !isFromLpu,
      lpu_range: matched?.range || null,
      quantity: itemForm.quantity || 1,
      deadline: itemForm.deadline,
      delivery_location: itemForm.delivery_location,
    })
  }

  const handleTipoCriacaoChange = (tipo: 'peca_digital' | 'peca_impressa' | '3d') => {
    const daysToAdd =
      tipo === 'peca_digital' ? 3 : tipo === 'peca_impressa' ? 4 : tipo === '3d' ? 5 : 0
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + daysToAdd)
    const formattedDate = targetDate.toISOString().split('T')[0]

    setFormData((prev) => ({
      ...prev,
      tipo_criacao: tipo,
      due_date: formattedDate,
    }))
  }

  const handleQuantityChange = (newQuantity: number) => {
    setItemForm((prev) => {
      const updated = { ...prev, quantity: newQuantity }
      if (!prev.is_custom && prev.item_name) {
        const matched = findMatchingLpuItem(lpuItems, prev.item_name, newQuantity)
        if (matched) {
          updated.unit_price = matched.unit_value
          updated.lpu_item_id = matched.id
          updated.lpu_range = matched.range
        }
      }
      return updated
    })
  }

  const switchMode = (mode: 'lpu' | 'manual') => {
    setItemMode(mode)
    setItemForm({ ...emptyItem, is_custom: mode === 'manual' })
  }

  const handleAddItem = () => {
    if (!itemForm.item_name.trim()) {
      toast({ title: 'Atenção', description: 'Informe o nome do item', variant: 'destructive' })
      return
    }
    if (itemForm.quantity < 1) {
      toast({
        title: 'Atenção',
        description: 'A quantidade deve ser pelo menos 1',
        variant: 'destructive',
      })
      return
    }
    setDemandItems([...demandItems, { ...itemForm }])
    setItemForm({ ...emptyItem, is_custom: itemMode === 'manual' })
  }

  const handleRemoveItem = (index: number) => {
    setDemandItems(demandItems.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.project_id || !formData.to_area_id) {
      toast({
        title: 'Atenção',
        description: 'Preencha os campos obrigatórios',
        variant: 'destructive',
      })
      return
    }
    if (!isFinanceiroArea && !formData.title) {
      toast({
        title: 'Atenção',
        description: 'Preencha os campos obrigatórios',
        variant: 'destructive',
      })
      return
    }
    if (isProducaoArea && demandItems.length === 0) {
      toast({
        title: 'Atenção',
        description: 'Adicione pelo menos um item de demanda para a área de Produção',
        variant: 'destructive',
      })
      return
    }
    if (isFinanceiroArea) {
      if (!financeForm.client_id || !financeForm.issuance_type || !financeForm.amount) {
        toast({
          title: 'Atenção',
          description: 'Preencha Cliente, Tipo de Emissão e Valor para a área Financeiro',
          variant: 'destructive',
        })
        return
      }
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
      const issuanceTypeLabel =
        financeForm.issuance_type === 'nota_fiscal'
          ? 'Nota Fiscal'
          : financeForm.issuance_type === 'nota_debito'
            ? 'Nota de Débito'
            : financeForm.issuance_type === 'recibo'
              ? 'Recibo'
              : ''
      const financeTitle = `${issuanceTypeLabel}${
        selectedFinanceClient ? ` — ${selectedFinanceClient.name}` : ''
      }`
      const financeDescription =
        financeForm.nf_description ||
        financeForm.notes ||
        `Solicitação financeira${selectedFinanceClient ? ` — ${selectedFinanceClient.name}` : ''}`

      const payload: Record<string, any> = {
        project_id: formData.project_id,
        from_user_id: currentUserId,
        from_area_id: currentUser?.areas?.[0]?.id || null,
        to_area_id: formData.to_area_id,
        to_user_id: formData.to_user_id === 'any' ? null : formData.to_user_id,
        title: isFinanceiroArea ? financeTitle : formData.title,
        description: isFinanceiroArea ? financeDescription : formData.description,
        priority: formData.priority,
        tipo_criacao: isCriacaoArea && formData.tipo_criacao ? formData.tipo_criacao : null,
        due_date: isFinanceiroArea
          ? financeForm.payment_due_date || null
          : formData.due_date || null,
        status: 'pending',
      }

      // Criação-specific fields — only set when destination is Criação
      if (isCriacaoArea) {
        payload.entrega_a_ser_feita = formData.entrega_a_ser_feita.trim() || null
        payload.finalidade_peca = formData.finalidade_peca.trim() || null
        payload.formato_peca = formData.formato_peca.trim() || null
        payload.quantidade_pecas =
          Number.isFinite(formData.quantidade_pecas) && formData.quantidade_pecas >= 1
            ? Math.floor(formData.quantidade_pecas)
            : 1
        payload.direcional_pecas = formData.direcional_pecas.trim() || null

        // References = uploaded files (paths registered after upload) + link lines
        const linkLines = refLinksInput
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
        const refLinks = linkLines.map((url) => ({ type: 'link', url }))
        payload.referencias = refLinks.length > 0 ? refLinks : null
      }

      if (isFinanceiroArea) {
        payload.financial_data = {
          client_id: financeForm.client_id,
          client_name: selectedFinanceClient?.name || null,
          cnpj: financeForm.cnpj || null,
          issuance_type: financeForm.issuance_type,
          amount: financeForm.amount !== '' ? Number(financeForm.amount.replace(',', '.')) : null,
          payment_due_date: financeForm.payment_due_date || null,
          nf_description: financeForm.nf_description || null,
          notes: financeForm.notes || null,
        }
      }

      const newDemand = await createDemand(payload)

      if (isProducaoArea && demandItems.length > 0) {
        const items: DemandItemInput[] = demandItems.map((item) => ({
          item_name: item.item_name,
          description: item.description || undefined,
          quantity: item.quantity,
          deadline: item.deadline || null,
          delivery_location: item.delivery_location || undefined,
          lpu_item_id: item.lpu_item_id,
          unit_price: item.unit_price,
          is_custom: item.is_custom,
        }))
        await createDemandItems(newDemand.id, items)
      }

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

  const hasLpu = lpuItems.length > 0

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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Área Destino *</Label>
              <Select
                value={formData.to_area_id}
                onValueChange={(v) =>
                  setFormData({ ...formData, to_area_id: v, to_user_id: 'any', tipo_criacao: '' })
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
                  <SelectValue
                    placeholder={
                      isCriacaoArea ? 'Qualquer diretor da Criação' : 'Qualquer pessoa da área'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">
                    {isCriacaoArea ? 'Qualquer diretor da Criação' : 'Qualquer pessoa da área'}
                  </SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!isFinanceiroArea && (
            <>
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

              {isCriacaoArea && (
                <div className="space-y-2 p-3 bg-blue-50/50 border border-blue-100 rounded-lg animate-fade-in">
                  <Label htmlFor="tipo-criacao" className="font-medium text-blue-950">
                    Tipo de Criação
                  </Label>
                  <Select
                    value={formData.tipo_criacao}
                    onValueChange={(v) =>
                      handleTipoCriacaoChange(v as 'peca_digital' | 'peca_impressa' | '3d')
                    }
                  >
                    <SelectTrigger id="tipo-criacao" className="bg-white">
                      <SelectValue placeholder="Selecione o tipo de criação para calcular o SLA" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="peca_digital">
                        🖥️ Peça Digital — SLA de 3 dias úteis
                      </SelectItem>
                      <SelectItem value="peca_impressa">
                        🖨️ Peça Impressa — SLA de 4 dias úteis
                      </SelectItem>
                      <SelectItem value="3d">🧊 3D — SLA de 5 dias úteis</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Ao selecionar um tipo, a data de entrega é preenchida automaticamente e pode ser
                    ajustada abaixo.
                  </p>
                </div>
              )}

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
                  <Label>Prazo</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
              </div>
            </>
          )}

          {isCriacaoArea && (
            <div className="pt-4 border-t space-y-4 animate-fade-in">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-lg">Detalhes da Criação</h3>
              </div>

              <div className="grid grid-cols-1 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="space-y-2">
                  <Label>Entrega a ser feita</Label>
                  <Textarea
                    rows={3}
                    value={formData.entrega_a_ser_feita}
                    onChange={(e) =>
                      setFormData({ ...formData, entrega_a_ser_feita: e.target.value })
                    }
                    placeholder="Descreva a entrega esperada (ex: 3 artes finais para redes sociais, vídeo de 15s, etc.)"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Finalidade da Peça</Label>
                    <Input
                      value={formData.finalidade_peca}
                      onChange={(e) =>
                        setFormData({ ...formData, finalidade_peca: e.target.value })
                      }
                      placeholder="Ex: Campanha de lançamento do produto X"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Formato da Peça</Label>
                    <Input
                      value={formData.formato_peca}
                      onChange={(e) => setFormData({ ...formData, formato_peca: e.target.value })}
                      placeholder="Ex: 1080x1080, Stories, A4"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantidade de Peças</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.quantidade_pecas}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          quantidade_pecas: Math.max(1, parseInt(e.target.value) || 1),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Direcional de Cada Peça</Label>
                    <Textarea
                      rows={2}
                      value={formData.direcional_pecas}
                      onChange={(e) =>
                        setFormData({ ...formData, direcional_pecas: e.target.value })
                      }
                      placeholder="Orientações criativas (referências, tom de voz, restrições, etc.)"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Referências</Label>
                  <PendingFilesPicker files={pendingFiles} onChange={setPendingFiles} />
                  <Textarea
                    rows={2}
                    value={refLinksInput}
                    onChange={(e) => setRefLinksInput(e.target.value)}
                    placeholder="Cole aqui links de referência (um por linha)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Anexe arquivos (imagens/PDFs) acima e/ou inclua links externos como referência
                    criativa.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {isFinanceiroArea && (
          <div className="pt-4 border-t space-y-4 animate-fade-in">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">Dados Financeiros</h3>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="space-y-2 col-span-2">
                <Label>Cliente *</Label>
                <Select
                  value={financeForm.client_id}
                  onValueChange={(v) => setFinanceForm({ ...financeForm, client_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.code} - {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 col-span-2">
                <Label>CNPJ</Label>
                <Input
                  value={financeForm.cnpj}
                  onChange={(e) => setFinanceForm({ ...financeForm, cnpj: e.target.value })}
                  placeholder="Preenchido automaticamente pelo cliente"
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Emissão *</Label>
                <Select
                  value={financeForm.issuance_type}
                  onValueChange={(v) => setFinanceForm({ ...financeForm, issuance_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nota_fiscal">Nota Fiscal</SelectItem>
                    <SelectItem value="nota_debito">Nota de Débito</SelectItem>
                    <SelectItem value="recibo">Recibo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Valor *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={financeForm.amount}
                  onChange={(e) => setFinanceForm({ ...financeForm, amount: e.target.value })}
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label>Prazo de Pagamento</Label>
                <Input
                  type="date"
                  value={financeForm.payment_due_date}
                  onChange={(e) =>
                    setFinanceForm({ ...financeForm, payment_due_date: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label>Descrição da NF</Label>
                <Input
                  value={financeForm.nf_description}
                  onChange={(e) =>
                    setFinanceForm({ ...financeForm, nf_description: e.target.value })
                  }
                  placeholder="Descrição da nota fiscal"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label>Observações</Label>
                <Textarea
                  rows={3}
                  value={financeForm.notes}
                  onChange={(e) => setFinanceForm({ ...financeForm, notes: e.target.value })}
                  placeholder="Observações adicionais"
                />
              </div>
            </div>
          </div>
        )}

        {isProducaoArea && (
          <div className="pt-4 border-t space-y-4 animate-fade-in">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">Itens de Demanda</h3>
            </div>

            {hasLpu && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={itemMode === 'lpu' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => switchMode('lpu')}
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Selecionar da LPU
                </Button>
                <Button
                  type="button"
                  variant={itemMode === 'manual' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => switchMode('manual')}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Adicionar Manual
                </Button>
              </div>
            )}

            {!hasLpu && lpuLoaded && (
              <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                Este cliente ainda não possui itens cadastrados na LPU
              </div>
            )}

            {hasLpu && itemMode === 'lpu' && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="space-y-2 col-span-2">
                  <Label>Selecionar Item da LPU *</Label>
                  <LpuItemPicker
                    items={lpuItems}
                    onSelect={handleLpuSelect}
                    value={itemForm.item_name}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Descrição</Label>
                  <Input
                    value={itemForm.description}
                    onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                    placeholder="Descrição do item"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor Unitário</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={itemForm.unit_price ?? ''}
                    onChange={(e) =>
                      setItemForm({
                        ...itemForm,
                        unit_price: e.target.value ? parseFloat(e.target.value) : null,
                      })
                    }
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Faixa (Range)</Label>
                  <Input
                    value={itemForm.lpu_range ?? ''}
                    readOnly
                    placeholder="—"
                    className="bg-muted/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    min={1}
                    value={itemForm.quantity}
                    onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prazo do Item</Label>
                  <Input
                    type="date"
                    value={itemForm.deadline}
                    onChange={(e) => setItemForm({ ...itemForm, deadline: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Local de Entrega</Label>
                  <Input
                    value={itemForm.delivery_location}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, delivery_location: e.target.value })
                    }
                    placeholder="Ex: Agência - Sala de Reuniões"
                  />
                </div>
                <div className="col-span-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddItem}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Item
                  </Button>
                </div>
              </div>
            )}

            {(!hasLpu || itemMode === 'manual') && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="space-y-2 col-span-2">
                  <Label>Item *</Label>
                  <Input
                    value={itemForm.item_name}
                    onChange={(e) => setItemForm({ ...itemForm, item_name: e.target.value })}
                    placeholder="Ex: Banner impresso A2"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Descrição do Item</Label>
                  <Textarea
                    rows={2}
                    value={itemForm.description}
                    onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                    placeholder="Detalhes do item (material, acabamento, etc.)"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    min={1}
                    value={itemForm.quantity}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, quantity: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor Unitário (Opcional)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={itemForm.unit_price ?? ''}
                    onChange={(e) =>
                      setItemForm({
                        ...itemForm,
                        unit_price: e.target.value ? parseFloat(e.target.value) : null,
                      })
                    }
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prazo do Item</Label>
                  <Input
                    type="date"
                    value={itemForm.deadline}
                    onChange={(e) => setItemForm({ ...itemForm, deadline: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Local de Entrega</Label>
                  <Input
                    value={itemForm.delivery_location}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, delivery_location: e.target.value })
                    }
                    placeholder="Ex: Agência - Sala de Reuniões"
                  />
                </div>
                <div className="col-span-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddItem}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Item
                  </Button>
                </div>
              </div>
            )}

            {demandItems.length > 0 && (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="w-16 text-center">Qtd</TableHead>
                      <TableHead className="w-28 text-right">Vl. Unit.</TableHead>
                      <TableHead>Prazo</TableHead>
                      <TableHead>Local</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {demandItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="font-medium flex items-center gap-1">
                            {item.item_name}
                            {item.is_custom && (
                              <span className="text-xs bg-muted px-1.5 py-0.5 rounded">Manual</span>
                            )}
                          </div>
                          {item.description && (
                            <div className="text-xs text-muted-foreground">{item.description}</div>
                          )}
                          {item.lpu_range && (
                            <div className="text-xs text-muted-foreground">
                              Faixa: {item.lpu_range}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          {item.unit_price ? `R$ ${Number(item.unit_price).toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell>{item.deadline || '-'}</TableCell>
                        <TableCell>{item.delivery_location || '-'}</TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

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
