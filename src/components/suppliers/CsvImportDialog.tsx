import { useState, useRef } from 'react'
import { Upload, Loader2, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { batchInsertSuppliers } from '@/services/suppliers'

const HEADER_MAP: Record<string, string> = {
  tipo: 'type',
  tipoempresa: 'type',
  cpf: 'document',
  cnpj: 'document',
  documento: 'document',
  cpfcnpj: 'document',
  nome: 'name',
  telefone: 'phone',
  email: 'email',
  'e-mail': 'email',
  cep: 'cep',
  logradouro: 'logradouro',
  endereco: 'logradouro',
  numero: 'number',
  nro: 'number',
  complemento: 'complement',
  bairro: 'neighborhood',
  cidade: 'city',
  uf: 'uf',
  estado: 'uf',
  tipo_conta: 'account_type',
  'tipo de conta': 'account_type',
  banco: 'bank',
  nomebanco: 'bank',
  agencia: 'agency',
  agenciabancaria: 'agency',
  conta: 'account',
  operacao: 'operation',
  chave_pix: 'pix_key',
  'chave pix': 'pix_key',
  pix: 'pix_key',
  observacoes: 'observations',
  observações: 'observations',
  obs: 'observations',
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else inQuotes = false
      } else field += c
    } else {
      if (c === '"') inQuotes = true
      else if (c === ';' || c === ',') {
        row.push(field)
        field = ''
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++
        row.push(field)
        field = ''
        rows.push(row)
        row = []
      } else field += c
    }
  }
  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

function normalizeSupplierType(value: string, document: string): string {
  const v = value.trim().toUpperCase()
  if (
    v === 'PF' ||
    v === 'PESSOA FÍSICA' ||
    v === 'PESSOA FISICA' ||
    v === 'FÍSICA' ||
    v === 'FISICA'
  )
    return 'PF'
  if (
    v === 'PJ' ||
    v === 'PESSOA JURÍDICA' ||
    v === 'PESSOA JURIDICA' ||
    v === 'JURÍDICA' ||
    v === 'JURIDICA'
  )
    return 'PJ'
  return document && document.length <= 11 ? 'PF' : 'PJ'
}

interface CsvImportDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  onImported: () => void
}

export function CsvImportDialog({ open, onOpenChange, onImported }: CsvImportDialogProps) {
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [parsed, setParsed] = useState<any[]>([])
  const [invalidRows, setInvalidRows] = useState<{ row: number; reason: string }[]>([])
  const [results, setResults] = useState<{
    success: number
    failed: number
    errors: string[]
  } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setParsed([])
    setInvalidRows([])
    setResults(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setParsing(true)
    setResults(null)
    setInvalidRows([])
    try {
      const text = await file.text()
      const rows = parseCSV(text)
      if (rows.length < 2) {
        setParsed([])
        return
      }
      const headers = rows[0].map((h) => h.trim().toLowerCase())
      const valid: any[] = []
      const invalid: { row: number; reason: string }[] = []

      rows.slice(1).forEach((r, idx) => {
        if (!r.some((c) => c.trim())) return

        const csvRow = idx + 2
        const obj: Record<string, any> = {}
        headers.forEach((h, i) => {
          const key = HEADER_MAP[h]
          if (key) obj[key] = (r[i] || '').trim()
        })

        if (obj.document) obj.document = obj.document.replace(/[^\d]/g, '')

        if (obj.type) {
          obj.type = normalizeSupplierType(obj.type, obj.document)
        } else {
          obj.type = obj.document && obj.document.length <= 11 ? 'PF' : 'PJ'
        }

        const missing: string[] = []
        if (!obj.name) missing.push('Nome não informado')
        if (!obj.document) missing.push('Documento não informado')

        if (missing.length > 0) {
          invalid.push({ row: csvRow, reason: missing.join(' e ') })
          return
        }

        obj._csvRow = csvRow
        valid.push(obj)
      })

      setParsed(valid)
      setInvalidRows(invalid)

      if (valid.length === 0 && invalid.length > 0) {
        setResults({
          success: 0,
          failed: invalid.length,
          errors: invalid.map((r) => `Linha ${r.row}: ${r.reason}`),
        })
      }
    } finally {
      setParsing(false)
    }
  }

  const handleImport = async () => {
    setImporting(true)
    try {
      const res = await batchInsertSuppliers(parsed)
      const allErrors = [...invalidRows.map((r) => `Linha ${r.row}: ${r.reason}`), ...res.errors]
      setResults({
        success: res.success,
        failed: invalidRows.length + res.failed,
        errors: allErrors,
      })
      if (res.success > 0) onImported()
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset()
        onOpenChange(v)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar Fornecedores via CSV</DialogTitle>
          <DialogDescription>
            Colunas reconhecidas: Nome, CPFCNPJ, TipoEmpresa, Logradouro, Nro, Complemento, Bairro,
            CEP, Cidade, UF, Email, NomeBanco, AgenciaBancaria, Telefone, TipoConta, Conta,
            Operacao, ChavePix, Observacoes. Colunas não mapeadas (IE, InscricaoMunicipal,
            NomeFantasia, CidadeUF) serão ignoradas.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={handleFile}
          />
          <Button
            variant="outline"
            className="w-full"
            disabled={parsing || importing}
            onClick={() => fileRef.current?.click()}
          >
            {parsing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            {parsing ? 'Processando...' : 'Selecionar arquivo CSV'}
          </Button>
          {parsed.length > 0 && !results && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-primary" />
                {parsed.length} fornecedor(es) prontos para importar.
              </div>
              {invalidRows.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <AlertCircle className="w-4 h-4" />
                  {invalidRows.length} linha(s) com dados obrigatórios faltando serão reportadas
                  como falha.
                </div>
              )}
            </div>
          )}
          {parsed.length === 0 && invalidRows.length === 0 && !results && !parsing && (
            <div className="text-sm text-muted-foreground text-center py-4">
              Selecione um arquivo CSV para visualizar os fornecedores.
            </div>
          )}
          {results && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" /> {results.success} fornecedor(es) importado(s)
                com sucesso.
              </div>
              {results.failed > 0 && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" /> {results.failed} linha(s) com falha.
                </div>
              )}
              {results.errors.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {results.errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-red-600">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {err}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          {parsed.length > 0 && !results && (
            <Button onClick={handleImport} disabled={importing}>
              {importing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Importar {parsed.length} fornecedor(es)
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
