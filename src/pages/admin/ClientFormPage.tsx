import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { ArrowLeft, Save } from 'lucide-react'

import { useCurrentUser } from '@/hooks/use-current-user'
import { getClientById, createClient, updateClient } from '@/services/clients'
import { LpuUploadSection } from '@/components/admin/LpuUploadSection'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/components/ui/use-toast'
import { Card, CardContent } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'

export const validateCNPJ = (cnpj: string) => {
  const clean = cnpj.replace(/[^\d]+/g, '')
  if (clean === '') return true
  if (clean.length !== 14) return false
  if (/^(\d)\1+$/.test(clean)) return false

  let size = clean.length - 2
  let numbers = clean.substring(0, size)
  let digits = clean.substring(size)
  let sum = 0
  let pos = size - 7
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--
    if (pos < 2) pos = 9
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== parseInt(digits.charAt(0))) return false

  size = size + 1
  numbers = clean.substring(0, size)
  sum = 0
  pos = size - 7
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--
    if (pos < 2) pos = 9
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== parseInt(digits.charAt(1))) return false

  return true
}

const formSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(6)
    .regex(/^[A-Z]{3,6}$/, 'Apenas letras maiúsculas (3 a 6 caracteres)'),
  name: z.string().min(2, 'Nome muito curto'),
  cnpj: z
    .string()
    .optional()
    .refine((val) => !val || validateCNPJ(val), { message: 'CNPJ inválido' }),
  contact_name: z.string().optional(),
  contact_email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  segment: z.string().optional(),
  has_lpu: z.boolean().default(false),
})

const maskCNPJ = (value: string) => {
  let v = value.replace(/\D/g, '')
  if (v.length > 14) v = v.substring(0, 14)
  v = v.replace(/^(\d{2})(\d)/, '$1.$2')
  v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
  v = v.replace(/\.(\d{3})(\d)/, '.$1/$2')
  v = v.replace(/(\d{4})(\d)/, '$1-$2')
  return v
}

const maskPhone = (value: string) => {
  let v = value.replace(/\D/g, '')
  if (v.length > 11) v = v.substring(0, 11)
  v = v.replace(/^(\d{2})(\d)/g, '($1) $2')
  v = v.replace(/(\d)(\d{4})$/, '$1-$2')
  return v
}

export default function ClientFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: currentUser } = useCurrentUser()
  const canManage =
    currentUser?.profile?.is_admin === true || currentUser?.profile?.is_director === true
  const [loading, setLoading] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: '',
      name: '',
      cnpj: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      segment: '',
      has_lpu: false,
    },
  })

  const hasLpu = form.watch('has_lpu')

  useEffect(() => {
    if (currentUser && !canManage) {
      navigate('/')
    }
  }, [canManage, currentUser, navigate])

  useEffect(() => {
    if (id) {
      setLoading(true)
      getClientById(id)
        .then((data) => {
          form.reset({
            code: data.code || '',
            name: data.name || '',
            cnpj: data.cnpj || '',
            contact_name: data.contact_name || '',
            contact_email: data.contact_email || '',
            contact_phone: data.contact_phone || '',
            segment: data.segment || '',
            has_lpu: data.has_lpu || false,
          })
        })
        .catch(() => {
          toast({ title: 'Erro ao carregar', variant: 'destructive' })
          navigate('/admin/clientes')
        })
        .finally(() => setLoading(false))
    }
  }, [id, form, navigate])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true)
    try {
      const payload: any = { ...values }
      if (!payload.cnpj) payload.cnpj = null

      if (id) {
        const { code, ...updatePayload } = payload
        await updateClient(id, updatePayload)
        toast({ title: 'Cliente atualizado' })
      } else {
        await createClient(payload)
        toast({ title: 'Cliente criado com sucesso' })
      }
      navigate('/admin/clientes')
    } catch (error: any) {
      if (error.code === '23505') {
        form.setError('code', { message: 'Código já existe' })
      } else {
        toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    form.setValue('name', val, { shouldValidate: true })
    if (!id && !form.getFieldState('code').isDirty && val.length > 0) {
      const parts = val.trim().split(' ')
      let generated = parts[0] || ''
      generated = generated
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Za-z]/g, '')
        .toUpperCase()
      if (generated.length >= 3) {
        form.setValue('code', generated.substring(0, 4))
      } else {
        form.setValue('code', '')
      }
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/clientes">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {id ? 'Editar Cliente' : 'Novo Cliente'}
        </h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Empresa *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Acme Corp" {...field} onChange={handleNameChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: ACME"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          disabled={!!id}
                        />
                      </FormControl>
                      <FormDescription>3 a 6 letras maiúsculas</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="00.000.000/0000-00"
                          {...field}
                          onChange={(e) => field.onChange(maskCNPJ(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="segment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Segmento</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Varejo, Tecnologia..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="col-span-full border-t pt-4">
                  <h3 className="text-sm font-semibold mb-4">Contato Principal</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="contact_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Contato</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contact_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-mail</FormLabel>
                          <FormControl>
                            <Input placeholder="email@exemplo.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contact_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="(00) 00000-0000"
                              {...field}
                              onChange={(e) => field.onChange(maskPhone(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="col-span-full border-t pt-4">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="has_lpu"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Possui LPU (Lista de Preços Unitários)?</FormLabel>
                            <FormDescription>
                              Ative se o contrato prevê aplicação de fee sobre LPU.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    {id && (
                      <LpuUploadSection
                        clientId={id}
                        hasLpu={hasLpu}
                        onLpuDeleted={() => form.setValue('has_lpu', false)}
                        onLpuUploaded={() => form.setValue('has_lpu', true)}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button type="submit" disabled={loading}>
                  <Save className="w-4 h-4 mr-2" /> Salvar
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
