import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/components/ui/use-toast'
import { getSupplierById, createSupplier, updateSupplier } from '@/services/suppliers'
import {
  validateCPF,
  validateCNPJ,
  maskCPF,
  maskCNPJ,
  maskPhone,
  maskCEP,
  maskAgency,
  maskAccount,
} from '@/lib/validators'
import { SupplierFormSkeleton } from '@/components/suppliers/SupplierFormSkeleton'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  )
}

const emptyForm = {
  type: 'PJ',
  document: '',
  name: '',
  phone: '',
  email: '',
  cep: '',
  logradouro: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  uf: '',
  account_type: 'corrente',
  bank: '',
  agency: '',
  account: '',
  operation: '',
  pix_key: '',
  observations: '',
}

export default function SupplierFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Record<string, any>>({ ...emptyForm })

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getSupplierById(id)
      .then((d) => setForm({ ...emptyForm, ...d }))
      .catch(() => {
        toast({ title: 'Erro ao carregar', variant: 'destructive' })
        navigate('/fornecedores')
      })
      .finally(() => setLoading(false))
  }, [id, navigate])

  useEffect(() => {
    const cep = (form.cep || '').replace(/\D/g, '')
    if (cep.length !== 8) return
    fetch(`https://viacep.com.br/ws/${cep}/json/`)
      .then((r) => r.json())
      .then((d) => {
        if (d.erro) return
        setForm((p) => ({
          ...p,
          logradouro: d.logradouro || '',
          neighborhood: d.bairro || '',
          city: d.localidade || '',
          uf: d.uf || '',
        }))
      })
      .catch(() => {})
  }, [form.cep])

  const handleSubmit = async () => {
    if (!form.name?.trim()) return toast({ title: 'Informe o nome', variant: 'destructive' })
    const doc = (form.document || '').replace(/\D/g, '')
    if (!doc) return toast({ title: 'Informe o documento', variant: 'destructive' })
    if (form.type === 'PF' && !validateCPF(doc))
      return toast({ title: 'CPF inválido', variant: 'destructive' })
    if (form.type === 'PJ' && !validateCNPJ(doc))
      return toast({ title: 'CNPJ inválido', variant: 'destructive' })
    setSaving(true)
    try {
      const payload = { ...form, document: doc }
      if (id) {
        await updateSupplier(id, payload)
        toast({ title: 'Fornecedor atualizado' })
      } else {
        await createSupplier(payload)
        toast({ title: 'Fornecedor criado com sucesso' })
      }
      navigate('/fornecedores')
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const docLabel = form.type === 'PF' ? 'CPF' : 'CNPJ'
  const docMask = form.type === 'PF' ? maskCPF : maskCNPJ

  if (loading) {
    return <SupplierFormSkeleton />
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/fornecedores">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{id ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h1>
      </div>
      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Tipo">
              <Select
                value={form.type}
                onValueChange={(v) => {
                  set('type', v)
                  set('document', '')
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                  <SelectItem value="PF">Pessoa Física</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={docLabel}>
              <Input
                value={form.document || ''}
                onChange={(e) => set('document', docMask(e.target.value))}
                placeholder={docLabel}
              />
            </Field>
            <Field label="Nome">
              <Input value={form.name || ''} onChange={(e) => set('name', e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Telefone">
              <Input
                value={form.phone || ''}
                onChange={(e) => set('phone', maskPhone(e.target.value))}
                placeholder="(00) 00000-0000"
              />
            </Field>
            <Field label="E-mail">
              <Input
                value={form.email || ''}
                onChange={(e) => set('email', e.target.value)}
                placeholder="email@exemplo.com"
              />
            </Field>
          </div>
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-3">Endereço</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Field label="CEP">
                <Input
                  value={form.cep || ''}
                  onChange={(e) => set('cep', maskCEP(e.target.value))}
                  placeholder="00000-000"
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="Logradouro">
                  <Input
                    value={form.logradouro || ''}
                    onChange={(e) => set('logradouro', e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Número">
                <Input value={form.number || ''} onChange={(e) => set('number', e.target.value)} />
              </Field>
              <Field label="Complemento">
                <Input
                  value={form.complement || ''}
                  onChange={(e) => set('complement', e.target.value)}
                />
              </Field>
              <Field label="Bairro">
                <Input
                  value={form.neighborhood || ''}
                  onChange={(e) => set('neighborhood', e.target.value)}
                />
              </Field>
              <Field label="Cidade">
                <Input value={form.city || ''} onChange={(e) => set('city', e.target.value)} />
              </Field>
              <Field label="UF">
                <Input
                  value={form.uf || ''}
                  onChange={(e) => set('uf', e.target.value.toUpperCase().substring(0, 2))}
                />
              </Field>
            </div>
          </div>
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-3">Dados Bancários</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Tipo de Conta">
                <Select
                  value={form.account_type || 'corrente'}
                  onValueChange={(v) => set('account_type', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corrente">Corrente</SelectItem>
                    <SelectItem value="poupanca">Poupança</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Banco">
                <Input value={form.bank || ''} onChange={(e) => set('bank', e.target.value)} />
              </Field>
              <Field label="Agência">
                <Input
                  value={form.agency || ''}
                  onChange={(e) => set('agency', maskAgency(e.target.value))}
                  placeholder="1234-5"
                />
              </Field>
              <Field label="Conta">
                <Input
                  value={form.account || ''}
                  onChange={(e) => set('account', maskAccount(e.target.value))}
                  placeholder="12345-6"
                />
              </Field>
              <Field label="Operação">
                <Input
                  value={form.operation || ''}
                  onChange={(e) => set('operation', e.target.value)}
                />
              </Field>
              <Field label="Chave Pix">
                <Input
                  value={form.pix_key || ''}
                  onChange={(e) => set('pix_key', e.target.value)}
                />
              </Field>
            </div>
          </div>
          <div className="border-t pt-4">
            <Field label="Observações">
              <Textarea
                value={form.observations || ''}
                onChange={(e) => set('observations', e.target.value)}
                rows={3}
              />
            </Field>
          </div>
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSubmit} disabled={loading || saving}>
              <Save className="w-4 h-4 mr-2" /> Salvar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
