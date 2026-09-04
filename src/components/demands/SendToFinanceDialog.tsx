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
  type PaymentMethod,
} from '@/services/finance-requests'
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
  userId: string
  onSent: (itemId: string, financeRequestId: string) => void
}

const ALLOWED_BOLETO_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg']
const ALLOWED_BOLETO_EXTENSIONS = ['.pdf', '.jpg', '.jpeg']

export function SendToFinanceDialog({
  open,
  onOpenChange,
  item,
  demandId,
  userId,
  onSent,
}: SendToFinanceDialogProps) {
  const { toast } = useToast()
  const [sending, setSending] = useState(false)
  const [dueDate, setDueDate] = useState('')
  const [justification, setJustification] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('')
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [loadingSupplier, setLoadingSupplier] = useState(false)
  const [boletoFile, setBoletoFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Carregar dados completos do fornecedor quando abrir o modal ou mudar o item
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
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar dados bancários do fornecedor:', err)
        if (!cancelled) setSupplier(null)
      })
      .finally(() => {
        if (!cancelled) setLoadingSupplier(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, item?.supplier_id])

  const isUrgent = useMemo(() => {
    if (!dueDate) return false
    return differenceInCalendarDays(new Date(dueDate), new Date()) < 30
  }, [dueDate])

  // Verificação de preenchimento dos dados bancários do fornecedor
  const hasTransferData = useMemo(() => {
    if (!supplier) return false
    return Boolean(supplier.bank?.trim() || supplier.agency?.trim() || supplier.account?.trim())
  }, [supplier])

  const hasPixData = useMemo(() => {
    if (!supplier) return false
    return Boolean(supplier.pix_key?.trim())
  }, [supplier])

  const canConfirm = useMemo(() => {
    if (!dueDate || !item || !userId) return false
    if (!paymentMethod) return false
    if (isUrgent && justification.trim().length < 20) return false
    if (paymentMethod === 'boleto' && !boletoFile) return false
    return true
  }, [dueDate, isUrgent, justification, item, userId, paymentMethod, boletoFile])

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
        description: 'Por favor anexe apenas arquivos no formato JPG ou PDF.',
        variant: 'destructive',
      })
      return
    }

    // Limite de 20MB para boletos
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

  const handleConfirm = async () => {
    if (!item || !userId || !dueDate || !paymentMethod) return
    if (paymentMethod === 'boleto' && !boletoFile) {
      toast({
        title: 'Anexo obrigatório',
        description: 'É necessário anexar o boleto (JPG ou PDF) para continuar.',
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

      // Preparar detalhes bancários com base nos dados do fornecedor
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
        payment_details: paymentDetails,
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
          field_name: 'finance_due_date',
          old_value: null,
          new_value: dueDate,
        },
        {
          demand_id: demandId,
          item_id: item.id,
          user_id: userId,
          field_name: 'finance_payment_method',
          old_value: null,
          new_value: paymentMethodLabels[paymentMethod],
        },
        {
          demand_id: demandId,
          item_id: item.id,
          user_id: userId,
          field_name: 'finance_is_urgent',
          old_value: null,
          new_value: String(isUrgent),
        },
        ...(isUrgent
          ? [
              {
                demand_id: demandId,
                item_id: item.id,
                user_id: userId,
                field_name: 'finance_justification',
                old_value: null,
                new_value: justification.trim(),
              },
            ]
          : []),
        ...(boletoFileName
          ? [
              {
                demand_id: demandId,
                item_id: item.id,
                user_id: userId,
                field_name: 'finance_boleto_attachment',
                old_value: null,
                new_value: boletoFileName,
              },
            ]
          : []),
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
        description: `Forma de pagamento: ${paymentMethodLabels[paymentMethod]}`,
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
    setJustification('')
    setPaymentMethod('')
    setBoletoFile(null)
    setFileError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleOpenChange = (openState: boolean) => {
    if (!openState) {
      resetForm()
    }
    onOpenChange(openState)
  }

  if (!item) return null

  const todayStr = format(new Date(), 'yyyy-MM-dd')

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-zinc-900">
            <CreditCard className="w-5 h-5 text-orange-500" />
            Enviar para o Financeiro
          </DialogTitle>
          <DialogDescription>
            Confirme os detalhes do pagamento e fornecedor para envio ao Financeiro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Card Resumo do Item */}
          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-3.5 space-y-2">
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Item:</span>
              <span className="font-semibold text-zinc-900 text-right">{item.item_name}</span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Fornecedor:</span>
              <span className="font-medium text-zinc-900 text-right">
                {item.supplier_name || 'Não informado'}
              </span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Quantidade:</span>
              <span className="font-mono font-medium text-zinc-900">{item.quantity}</span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Custo Unitário:</span>
              <span className="font-mono font-medium text-zinc-900">
                {formatCurrency(item.unit_cost)}
              </span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm border-t border-zinc-200 pt-2">
              <span className="font-bold text-zinc-900">Custo Total:</span>
              <span className="font-mono font-bold text-orange-600">
                {formatCurrency(item.total_cost)}
              </span>
            </div>
          </div>

          {/* Campo: Data de Vencimento */}
          <div className="space-y-1.5">
            <Label htmlFor="due-date" className="flex items-center gap-1.5 text-xs font-semibold">
              <CalendarDays className="w-3.5 h-3.5 text-orange-500" />
              Data de Vencimento <span className="text-red-500">*</span>
            </Label>
            <Input
              id="due-date"
              type="date"
              min={todayStr}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded-xl focus-visible:ring-orange-500"
            />
          </div>

          {/* Campo: Forma de Pagamento */}
          <div className="space-y-1.5">
            <Label
              htmlFor="payment-method"
              className="flex items-center gap-1.5 text-xs font-semibold"
            >
              <CreditCard className="w-3.5 h-3.5 text-orange-500" />
              Forma de Pagamento <span className="text-red-500">*</span>
            </Label>
            <Select
              value={paymentMethod}
              onValueChange={(val) => {
                setPaymentMethod(val as PaymentMethod)
                setBoletoFile(null)
                setFileError(null)
              }}
            >
              <SelectTrigger id="payment-method" className="rounded-xl focus:ring-orange-500">
                <SelectValue placeholder="Selecione a forma de pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transferencia">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-blue-600" />
                    <span>Transferência Bancária (TED / DOC / TEF)</span>
                  </div>
                </SelectItem>
                <SelectItem value="pix">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-emerald-600" />
                    <span>Pix</span>
                  </div>
                </SelectItem>
                <SelectItem value="boleto">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-orange-600" />
                    <span>Boleto Bancário (Requer anexo PDF/JPG)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Seção Condicional: Transferência Bancária */}
          {paymentMethod === 'transferencia' && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-900">
                  <Building className="w-4 h-4 text-blue-600" />
                  <span>Dados Bancários do Fornecedor</span>
                </div>
                {loadingSupplier && <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />}
              </div>

              {!hasTransferData && !loadingSupplier ? (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold">Cadastro bancário incompleto</p>
                    <p className="text-[11px] leading-relaxed text-amber-700">
                      O fornecedor selecionado não possui dados bancários cadastrados (banco,
                      agência, conta). Recomendamos completar o cadastro do fornecedor para agilizar
                      a liberação financeira.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Banco:</span>
                    <span className="font-medium text-zinc-900">
                      {supplier?.bank || 'Não informado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Tipo de Conta:</span>
                    <span className="font-medium text-zinc-900 capitalize">
                      {supplier?.account_type || 'Corrente'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Agência:</span>
                    <span className="font-mono font-medium text-zinc-900">
                      {supplier?.agency || 'Não informada'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Conta:</span>
                    <span className="font-mono font-medium text-zinc-900">
                      {supplier?.account || 'Não informada'}
                    </span>
                  </div>
                  {supplier?.operation && (
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Operação:</span>
                      <span className="font-mono font-medium text-zinc-900">
                        {supplier.operation}
                      </span>
                    </div>
                  )}
                  {supplier?.document && (
                    <div>
                      <span className="text-muted-foreground block text-[11px]">CPF / CNPJ:</span>
                      <span className="font-mono font-medium text-zinc-900">
                        {supplier.document}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Seção Condicional: Pix */}
          {paymentMethod === 'pix' && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900">
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  <span>Chave Pix do Fornecedor</span>
                </div>
                {loadingSupplier && (
                  <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                )}
              </div>

              {!hasPixData && !loadingSupplier ? (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold">Chave Pix não cadastrada</p>
                    <p className="text-[11px] leading-relaxed text-amber-700">
                      O fornecedor não possui chave Pix informada no cadastro. Recomendamos
                      cadastrar a chave no cadastro de fornecedores para evitar pendências no
                      pagamento.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-xs pt-1">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Chave Pix:</span>
                    <span className="font-mono font-semibold text-emerald-950 text-sm select-all">
                      {supplier?.pix_key}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-emerald-200/50">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Beneficiário:</span>
                      <span className="font-medium text-zinc-900">
                        {supplier?.name || item.supplier_name}
                      </span>
                    </div>
                    {supplier?.document && (
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Documento:</span>
                        <span className="font-mono font-medium text-zinc-900">
                          {supplier.document}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Seção Condicional: Boleto com Upload Obrigatório (apenas JPG ou PDF) */}
          {paymentMethod === 'boleto' && (
            <div className="rounded-xl border border-orange-200/80 bg-orange-50/40 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="boleto-upload"
                  className="flex items-center gap-1.5 text-xs font-semibold text-orange-950"
                >
                  <FileText className="w-4 h-4 text-orange-600" />
                  Anexar Boleto Bancário <span className="text-red-500">* (JPG ou PDF)</span>
                </Label>
                <span className="text-[10px] text-muted-foreground">Máx. 20MB</span>
              </div>

              <input
                ref={fileInputRef}
                id="boleto-upload"
                type="file"
                accept=".pdf,.jpg,.jpeg,application/pdf,image/jpeg"
                onChange={handleFileChange}
                className="hidden"
              />

              {!boletoFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                    fileError
                      ? 'border-red-300 bg-red-50/50'
                      : 'border-orange-300/80 bg-white hover:bg-orange-50/70 hover:border-orange-400'
                  }`}
                >
                  <Upload className="w-6 h-6 mx-auto mb-1.5 text-orange-500" />
                  <p className="text-xs font-semibold text-zinc-800">
                    Clique para selecionar o arquivo do boleto
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Formatos aceitos: apenas <strong className="text-orange-700">PDF</strong> ou{' '}
                    <strong className="text-orange-700">JPG</strong>
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-orange-200 text-xs">
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <FileCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-900 truncate">{boletoFile.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {(boletoFile.size / 1024).toFixed(1)} KB • Arquivo pronto para envio
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveFile}
                    className="h-7 w-7 text-zinc-500 hover:text-red-600 hover:bg-red-50 shrink-0"
                    title="Remover arquivo"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {fileError && (
                <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {fileError}
                </p>
              )}
            </div>
          )}

          {/* Alerta e Justificativa de Urgência (<30 dias) */}
          {isUrgent && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="text-xs font-medium">
                  Prazo inferior a 30 dias — justificativa obrigatória para o Financeiro
                </span>
              </div>
              <Label htmlFor="justification" className="text-xs font-semibold">
                Justificativa <span className="text-red-500">*</span>
                <span className="text-muted-foreground ml-1">
                  ({justification.trim().length}/20 caracteres mínimos)
                </span>
              </Label>
              <Textarea
                id="justification"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={3}
                placeholder="Explique a urgência do pagamento deste item..."
                className="rounded-xl focus-visible:ring-orange-500"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={sending}
            className="rounded-xl border-zinc-200"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={sending || !canConfirm}
            className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-xs font-medium"
          >
            {sending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {!sending && <Send className="w-4 h-4 mr-2" />}
            Confirmar Envio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
