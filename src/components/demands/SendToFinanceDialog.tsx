import { useEffect, useMemo, useRef, useState } from 'react'
import { differenceInCalendarDays, format } from 'date-fns'
import {
  Loader2,
  Send,
  AlertTriangle,
  CalendarDays,
  CreditCard,
  Building,
  QrCode,
  FileText,
  Upload,
  CheckCircle2,
  X,
  FileCheck,
  AlertCircle,
  Settings2,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/financial'
import {
  createFinanceRequest,
  notifyFinanceUsersOfUrgentRequest,
  uploadBoletoAttachment,
  type KaminoFinanceFields,
  type PaymentMethod,
} from '@/services/finance-requests'
import { createDashboardFinancePayment } from '@/services/dashboard-finance'
import { getSupplierById, type Supplier } from '@/services/suppliers'
import { logDemandAuditBatch } from '@/services/demand-audit'
import { useToast } from '@/hooks/use-toast'

interface SendToFinanceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: {
    id: string
    item_name: string
    quantity: number
    supplier_id: string | null
    supplier_name: string | null
    unit_cost: number | null
    total_cost: number | null
  } | null
  demandId: string
  projectCode?: string | null
  projectName?: string | null
  userId: string
  onSent: (itemId: string, financeRequestId: string) => void
}

const ALLOWED_BOLETO_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg']
const ALLOWED_BOLETO_EXTENSIONS = ['.pdf', '.jpg', '.jpeg']

const todayInput = () => format(new Date(), 'yyyy-MM-dd')

export function SendToFinanceDialog({
  open,
  onOpenChange,
  item,
  demandId,
  projectCode,
  projectName,
  userId,
  onSent,
}: SendToFinanceDialogProps) {
  const { toast } = useToast()
  const [sending, setSending] = useState(false)
  const [dueDate, setDueDate] = useState('')
  const [dataCompetencia, setDataCompetencia] = useState(todayInput())
  const [idTipo, setIdTipo] = useState('')
  const [kaminoPersonId, setKaminoPersonId] = useState('')
  const [idContaClassificacao, setIdContaClassificacao] = useState('')
  const [idCentroCusto, setIdCentroCusto] = useState('')
  const [idUnidadeNegocio, setIdUnidadeNegocio] = useState('')
  const [numeroNotaFiscal, setNumeroNotaFiscal] = useState('')
  const [numeroBoleto, setNumeroBoleto] = useState('')
  const [descricao, setDescricao] = useState('')
  const [justification, setJustification] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('')
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [loadingSupplier, setLoadingSupplier] = useState(false)
  const [boletoFile, setBoletoFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!open || !item?.supplier_id) {
      setSupplier(null)
      return
    }
    let cancelled = false
    setLoadingSupplier(true)
    getSupplierById(item.supplier_id)
      .then((data) => {
        if (!cancelled) {
          setSupplier(data)
          setKaminoPersonId(data?.kamino_id ? String(data.kamino_id) : '')
          const documentDigits = String(data?.document || '').replace(/\D/g, '')
          setIdTipo(
            documentDigits.length === 11 ? '494' : documentDigits.length === 14 ? '495' : '',
          )
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar dados do fornecedor:', err)
        if (!cancelled) setSupplier(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingSupplier(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, item?.supplier_id])

  useEffect(() => {
    if (!open) return
    setDataCompetencia(todayInput())
    setIdTipo('')
    setKaminoPersonId('')
    setIdContaClassificacao('')
    setIdCentroCusto('')
    setIdUnidadeNegocio('')
    setNumeroNotaFiscal('')
    setNumeroBoleto('')
    setDescricao(item ? `${item.item_name}${projectName ? ` — ${projectName}` : ''}` : '')
  }, [open, item?.id, projectName])

  const isUrgent = useMemo(() => {
    if (!dueDate) return false
    return differenceInCalendarDays(new Date(dueDate), new Date()) < 30
  }, [dueDate])

  const hasTransferData = useMemo(
    () => Boolean(supplier?.bank?.trim() || supplier?.agency?.trim() || supplier?.account?.trim()),
    [supplier],
  )
  const hasPixData = useMemo(() => Boolean(supplier?.pix_key?.trim()), [supplier])
  const supplierDocument = (supplier?.document || '').replace(/\D/g, '')
  const automaticKaminoType =
    supplierDocument.length === 11 ? 494 : supplierDocument.length === 14 ? 495 : null
  const canConfirm = useMemo(() => {
    if (!dueDate || !item || !userId || !paymentMethod) return false
    if (!idTipo.trim() || !kaminoPersonId.trim()) return false
    if (isUrgent && justification.trim().length < 20) return false
    if (paymentMethod === 'boleto' && !boletoFile) return false
    return true
  }, [
    dueDate,
    isUrgent,
    justification,
    item,
    userId,
    paymentMethod,
    boletoFile,
    idTipo,
    kaminoPersonId,
  ])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setBoletoFile(null)
      setFileError(null)
      return
    }
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    const isExtensionValid = ALLOWED_BOLETO_EXTENSIONS.includes(ext)
    const isMimeValid = ALLOWED_BOLETO_TYPES.includes(file.type.toLowerCase()) || isExtensionValid
    if (!isExtensionValid && !isMimeValid) {
      setFileError('Apenas arquivos JPG ou PDF são permitidos.')
      setBoletoFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      toast({
        title: 'Formato inválido',
        description: 'Anexe somente arquivos PDF ou JPG.',
        variant: 'destructive',
      })
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setFileError('O arquivo deve ter no máximo 20MB.')
      setBoletoFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    setFileError(null)
    setBoletoFile(file)
  }

  const handleRemoveFile = () => {
    setBoletoFile(null)
    setFileError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const parseOptionalPositiveInt = (value: string, label: string): number | null | undefined => {
    if (!value.trim()) return undefined
    const parsed = Number(value)
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error(`${label}, quando preenchido, deve ser um número inteiro positivo.`)
    }
    return parsed
  }

  const handleConfirm = async () => {
    if (!item || !userId || !dueDate || !paymentMethod) return
    if (paymentMethod === 'boleto' && !boletoFile) {
      toast({
        title: 'Anexo obrigatório',
        description: 'É necessário anexar o boleto para continuar.',
        variant: 'destructive',
      })
      return
    }

    setSending(true)
    try {
      let boletoStoragePath: string | null = null
      let boletoFileName: string | null = null
      if (paymentMethod === 'boleto' && boletoFile) {
        const uploadResult = await uploadBoletoAttachment(demandId, boletoFile)
        boletoStoragePath = uploadResult.storagePath
        boletoFileName = uploadResult.fileName
      }

      const parsedIdTipo = parseOptionalPositiveInt(idTipo, 'IDTipo')
      const parsedKaminoPersonId = parseOptionalPositiveInt(kaminoPersonId, 'IDPessoaFavorecido')
      if (
        parsedIdTipo === undefined ||
        parsedIdTipo === null ||
        parsedKaminoPersonId === undefined ||
        parsedKaminoPersonId === null
      ) {
        throw new Error(
          'IDTipo e IDPessoaFavorecido são obrigatórios para criar a solicitação na Kamino.',
        )
      }
      const idConta = parseOptionalPositiveInt(idContaClassificacao, 'IDContaClassificacao')
      const idCentro = parseOptionalPositiveInt(idCentroCusto, 'IDCentroCusto')
      const idUnidade = parseOptionalPositiveInt(idUnidadeNegocio, 'IDUnidadeNegocio')
      const nroNota = parseOptionalPositiveInt(numeroNotaFiscal, 'NroNotaFiscal')
      const paymentDetails = {
        bank: supplier?.bank || null,
        agency: supplier?.agency || null,
        account: supplier?.account || null,
        account_type: supplier?.account_type || null,
        operation: supplier?.operation || null,
        pix_key: supplier?.pix_key || null,
        supplier_name: supplier?.name || item.supplier_name || null,
        supplier_document: supplier?.document || null,
      }
      const calculatedTotal = item.total_cost ?? (item.unit_cost ?? 0) * item.quantity
      const kaminoFields: KaminoFinanceFields = {
        Data: todayInput(),
        Valor: calculatedTotal,
        DataCompetencia: dataCompetencia || todayInput(),
        IDTipo: parsedIdTipo,
        IDPessoaFavorecido: parsedKaminoPersonId,
        IDContaClassificacao: idConta ?? null,
        IDCentroCusto: idCentro ?? null,
        IDUnidadeNegocio: idUnidade ? String(idUnidade) : null,
        Descricao: descricao.trim() || item.item_name,
        Observacoes: projectCode || null,
        NroNotaFiscal: nroNota ?? null,
        NumeroBoleto: numeroBoleto.trim() || null,
        Anexos: boletoStoragePath
          ? [{ storagePath: boletoStoragePath, fileName: boletoFileName }]
          : [],
      }

      const dashboardPayment = await createDashboardFinancePayment({
        demandId,
        demandItemId: item.id,
        projectCode: projectCode || null,
        projectName: projectName || null,
        dueDate,
        paymentMethod,
        paymentDetails,
        kaminoFields,
        isUrgent,
        justification: isUrgent ? justification.trim() : null,
        boletoFileName,
        boletoStoragePath,
      })

      const fr = await createFinanceRequest({
        demand_item_id: item.id,
        demand_id: demandId,
        supplier_id: item.supplier_id,
        supplier_name: item.supplier_name,
        unit_cost: item.unit_cost,
        quantity: item.quantity,
        total_cost: item.total_cost,
        created_by: userId,
        due_date: dueDate,
        is_urgent: isUrgent,
        justification: isUrgent ? justification.trim() : null,
        payment_method: paymentMethod,
        payment_details: {
          ...paymentDetails,
          dashboard_payment_id: dashboardPayment.paymentId,
          kamino_fields: kaminoFields,
        },
        kamino_fields: kaminoFields,
        boleto_url: boletoStoragePath,
        boleto_file_name: boletoFileName,
      })

      const paymentMethodLabels: Record<PaymentMethod, string> = {
        transferencia: 'Transferência Bancária',
        pix: 'Pix',
        boleto: 'Boleto Bancário',
      }
      await logDemandAuditBatch([
        {
          demand_id: demandId,
          item_id: item.id,
          user_id: userId,
          field_name: 'finance_request',
          old_value: null,
          new_value: fr.id,
        },
        {
          demand_id: demandId,
          item_id: item.id,
          user_id: userId,
          field_name: 'finance_kamino_fields',
          old_value: null,
          new_value: JSON.stringify(kaminoFields),
        },
        {
          demand_id: demandId,
          item_id: item.id,
          user_id: userId,
          field_name: 'dashboard_payment_id',
          old_value: null,
          new_value: dashboardPayment.paymentId,
        },
      ])
      if (isUrgent) {
        await notifyFinanceUsersOfUrgentRequest({
          demandId,
          itemName: item.item_name,
          supplierName: item.supplier_name,
          totalCost: item.total_cost,
          dueDate,
        })
      }
      onSent(item.id, fr.id)
      onOpenChange(false)
      resetForm()
      toast({
        title: 'Item enviado para o Financeiro',
        description: `Pagamento criado no Dashboard (${dashboardPayment.paymentId}). Forma: ${paymentMethodLabels[paymentMethod]}`,
      })
    } catch (err: any) {
      console.error('Erro ao enviar para o financeiro:', err)
      toast({
        title: 'Erro ao enviar para o Financeiro',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  const resetForm = () => {
    setDueDate('')
    setDataCompetencia(todayInput())
    setIdTipo('')
    setKaminoPersonId('')
    setIdContaClassificacao('')
    setIdCentroCusto('')
    setIdUnidadeNegocio('')
    setNumeroNotaFiscal('')
    setNumeroBoleto('')
    setDescricao('')
    setJustification('')
    setPaymentMethod('')
    setBoletoFile(null)
    setFileError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleOpenChange = (openState: boolean) => {
    if (!openState) resetForm()
    onOpenChange(openState)
  }

  if (!item) return null
  const todayStr = todayInput()

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-zinc-900">
            <CreditCard className="w-5 h-5 text-orange-500" />
            Enviar item para o Financeiro
          </DialogTitle>
          <DialogDescription>
            Preencha os dados da solicitação Kamino. Valor, Data, favorecido, tipo e código do
            projeto são automáticos quando possível.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-3.5 space-y-2">
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Item:</span>
              <span className="font-semibold text-zinc-900 text-right">{item.item_name}</span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Projeto:</span>
              <span className="font-semibold text-zinc-900 text-right">
                {projectCode || 'Não informado'}
              </span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Fornecedor:</span>
              <span className="font-medium text-zinc-900 text-right">
                {item.supplier_name || 'Não informado'}
              </span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm border-t border-zinc-200 pt-2">
              <span className="font-bold text-zinc-900">Valor:</span>
              <span className="font-mono font-bold text-orange-600">
                {formatCurrency(item.total_cost ?? (item.unit_cost || 0) * item.quantity)}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-orange-200 bg-orange-50/40 p-3.5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-orange-900">
              <Settings2 className="w-4 h-4" />
              Dados da solicitação Kamino
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>IDTipo *</Label>
                <Input
                  type="number"
                  min="1"
                  value={idTipo}
                  onChange={(e) => setIdTipo(e.target.value)}
                  placeholder={
                    automaticKaminoType ? String(automaticKaminoType) : 'Código pré-cadastrado'
                  }
                  disabled={sending}
                />
                <p className="text-[11px] text-muted-foreground">
                  494 para CPF e 495 para CNPJ, quando aplicável.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>IDPessoaFavorecido *</Label>
                <Input
                  type="number"
                  min="1"
                  value={kaminoPersonId}
                  onChange={(e) => setKaminoPersonId(e.target.value)}
                  placeholder="ID do fornecedor na Kamino"
                  disabled={sending}
                />
                <p className="text-[11px] text-muted-foreground">
                  Preenchido pelo vínculo Kamino do fornecedor.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>DataCompetencia</Label>
                <Input
                  type="date"
                  value={dataCompetencia}
                  onChange={(e) => setDataCompetencia(e.target.value)}
                  disabled={sending}
                />
              </div>
              <div className="space-y-1.5">
                <Label>IDContaClassificacao</Label>
                <Input
                  type="number"
                  min="1"
                  value={idContaClassificacao}
                  onChange={(e) => setIdContaClassificacao(e.target.value)}
                  placeholder="Opcional"
                  disabled={sending}
                />
              </div>
              <div className="space-y-1.5">
                <Label>IDCentroCusto</Label>
                <Input
                  type="number"
                  min="1"
                  value={idCentroCusto}
                  onChange={(e) => setIdCentroCusto(e.target.value)}
                  placeholder="Opcional"
                  disabled={sending}
                />
              </div>
              <div className="space-y-1.5">
                <Label>IDUnidadeNegocio</Label>
                <Input
                  type="number"
                  min="1"
                  value={idUnidadeNegocio}
                  onChange={(e) => setIdUnidadeNegocio(e.target.value)}
                  placeholder="Opcional"
                  disabled={sending}
                />
              </div>
              <div className="space-y-1.5">
                <Label>NroNotaFiscal</Label>
                <Input
                  type="number"
                  min="1"
                  value={numeroNotaFiscal}
                  onChange={(e) => setNumeroNotaFiscal(e.target.value)}
                  placeholder="Opcional"
                  disabled={sending}
                />
              </div>
              <div className="space-y-1.5">
                <Label>NumeroBoleto</Label>
                <Input
                  value={numeroBoleto}
                  onChange={(e) => setNumeroBoleto(e.target.value)}
                  placeholder="Opcional"
                  disabled={sending}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descricao</Label>
              <Input
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                disabled={sending}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Observacoes — código do projeto</Label>
              <Textarea
                value={projectCode || ''}
                readOnly
                disabled={sending}
                className="bg-slate-100"
              />
              <p className="text-[11px] text-muted-foreground">
                O código do projeto será enviado automaticamente para a Kamino.
              </p>
            </div>
            <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
              IDTipo e IDPessoaFavorecido serão enviados junto com a solicitação e reutilizados pelo
              Dashboard no envio para a Kamino.
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs font-semibold">
              <CalendarDays className="w-3.5 h-3.5 text-orange-500" />
              Data de Vencimento *
            </Label>
            <Input
              type="date"
              min={todayStr}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs font-semibold">
              <CreditCard className="w-3.5 h-3.5 text-orange-500" />
              Forma de Pagamento *
            </Label>
            <Select
              value={paymentMethod}
              onValueChange={(val) => {
                setPaymentMethod(val as PaymentMethod)
                setBoletoFile(null)
                setFileError(null)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a forma de pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transferencia">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-blue-600" />
                    Transferência Bancária
                  </div>
                </SelectItem>
                <SelectItem value="pix">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-emerald-600" />
                    Pix
                  </div>
                </SelectItem>
                <SelectItem value="boleto">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-orange-600" />
                    Boleto Bancário
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {paymentMethod === 'transferencia' && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 text-xs">
              <p className="font-semibold text-blue-900">Dados bancários do fornecedor</p>
              {loadingSupplier ? (
                <Loader2 className="w-4 h-4 animate-spin mt-2" />
              ) : (
                <p className="mt-1 text-blue-800">
                  {hasTransferData
                    ? `${supplier?.bank || ''} ${supplier?.agency || ''} ${supplier?.account || ''}`
                    : 'Cadastro bancário incompleto.'}
                </p>
              )}
            </div>
          )}

          {paymentMethod === 'pix' && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5 text-xs">
              <p className="font-semibold text-emerald-900">Chave Pix do fornecedor</p>
              <p className="mt-1 font-mono">
                {loadingSupplier
                  ? 'Carregando...'
                  : hasPixData
                    ? supplier?.pix_key
                    : 'Chave Pix não cadastrada.'}
              </p>
            </div>
          )}

          {paymentMethod === 'boleto' && (
            <div className="rounded-xl border border-orange-200 bg-orange-50/40 p-3.5 space-y-3">
              <Label>Anexar boleto (JPG ou PDF) *</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,application/pdf,image/jpeg"
                onChange={handleFileChange}
                className="hidden"
              />
              {!boletoFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer"
                >
                  <Upload className="w-6 h-6 mx-auto text-orange-500" />
                  <p className="text-xs font-semibold">Clique para selecionar o boleto</p>
                </div>
              ) : (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border">
                  <span className="text-xs truncate">{boletoFile.name}</span>
                  <Button type="button" variant="ghost" size="icon" onClick={handleRemoveFile}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
              {fileError && <p className="text-xs text-red-600">{fileError}</p>}
            </div>
          )}

          {isUrgent && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-xs">
                <AlertTriangle className="w-4 h-4" />
                Prazo inferior a 30 dias — justificativa obrigatória
              </div>
              <Label>Justificativa ({justification.trim().length}/20 caracteres mínimos)</Label>
              <Textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={sending || !canConfirm}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {sending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{' '}
            {!sending && <Send className="w-4 h-4 mr-2" />} Confirmar Envio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
