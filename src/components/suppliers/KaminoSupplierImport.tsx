import { useEffect, useMemo, useState } from 'react'
import { Check, Download, Loader2, Search, ShieldAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from '@/components/ui/use-toast'
import {
  importKaminoSupplier,
  searchKaminoSuppliers,
  type KaminoSupplierSearchResult,
} from '@/services/suppliers'

function formatDocument(value: string | null | undefined) {
  const digits = (value || '').replace(/\D/g, '')
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  if (digits.length === 14)
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  return value || '-'
}

function getSupplierName(supplier: KaminoSupplierSearchResult) {
  return supplier.NomeExibicao || supplier.NomeFantasia || supplier.Nome || `Pessoa ${supplier.ID}`
}

export function KaminoSupplierImport() {
  const [search, setSearch] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')
  const [suppliers, setSuppliers] = useState<KaminoSupplierSearchResult[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRows, setTotalRows] = useState(0)
  const [loading, setLoading] = useState(false)
  const [importingId, setImportingId] = useState<number | null>(null)
  const [importedIds, setImportedIds] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const canSearch = useMemo(() => submittedSearch.trim().length >= 2, [submittedSearch])

  useEffect(() => {
    if (!canSearch) {
      setSuppliers([])
      setTotalPages(1)
      setTotalRows(0)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    searchKaminoSuppliers(submittedSearch.trim(), page, 25)
      .then((result) => {
        if (cancelled) return
        setSuppliers(result.data || [])
        setTotalPages(Math.max(1, result.totalPages || 1))
        setTotalRows(result.totalRows || 0)
      })
      .catch((cause) => {
        if (cancelled) return
        setSuppliers([])
        setError(cause instanceof Error ? cause.message : 'Não foi possível consultar a Kamino.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [canSearch, page, submittedSearch])

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault()
    const value = search.trim()
    if (value.length < 2) {
      setError('Digite pelo menos 2 caracteres ou parte do CPF/CNPJ.')
      return
    }
    setPage(1)
    setSubmittedSearch(value)
  }

  const handleImport = async (kaminoId: number) => {
    setImportingId(kaminoId)
    try {
      const result = await importKaminoSupplier(kaminoId)
      setImportedIds((current) => new Set(current).add(kaminoId))
      toast({
        title: result.alreadyImported ? 'Fornecedor já estava cadastrado' : 'Fornecedor importado',
        description: result.data.name || 'Cadastro vinculado à Kamino com sucesso.',
      })
    } catch (cause) {
      toast({
        title: 'Erro ao importar fornecedor',
        description:
          cause instanceof Error ? cause.message : 'Não foi possível importar o fornecedor.',
        variant: 'destructive',
      })
    } finally {
      setImportingId(null)
    }
  }

  return (
    <div className="rounded-2xl border border-orange-200 bg-orange-50/40 p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-orange-600" />
            <h2 className="font-semibold text-zinc-900">Adicionar fornecedor da Kamino</h2>
            <Badge className="bg-orange-100 text-orange-700 border-orange-200">Produção</Badge>
          </div>
          <p className="text-sm text-zinc-600 mt-1">
            Pesquise um fornecedor já cadastrado na Kamino e importe o cadastro para o banco local
            do Sistema Side3.
          </p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nome, CPF ou CNPJ"
            className="pl-9 bg-white"
          />
        </div>
        <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700">
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Search className="w-4 h-4 mr-2" />
          )}
          Consultar Kamino
        </Button>
      </form>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {canSearch && !loading && (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-200 text-xs text-zinc-500">
            {totalRows ? `${totalRows} resultado(s) encontrado(s)` : 'Nenhum resultado encontrado'}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((supplier) => {
                const isImported = importedIds.has(supplier.ID)
                const isImporting = importingId === supplier.ID
                return (
                  <TableRow key={supplier.ID}>
                    <TableCell className="font-medium">{getSupplierName(supplier)}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {formatDocument(supplier.CPFCNPJ)}
                    </TableCell>
                    <TableCell>{Number(supplier.TipoEmpresa) === 1 ? 'PF' : 'PJ'}</TableCell>
                    <TableCell>
                      {[supplier.Cidade, supplier.UF].filter(Boolean).join('/') || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={isImported ? 'outline' : 'default'}
                        disabled={isImporting || isImported}
                        onClick={() => handleImport(supplier.ID)}
                        className={isImported ? 'text-green-700 border-green-300' : ''}
                      >
                        {isImporting ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : isImported ? (
                          <Check className="w-4 h-4 mr-1" />
                        ) : (
                          <Download className="w-4 h-4 mr-1" />
                        )}
                        {isImported ? 'Importado' : 'Adicionar'}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
              {suppliers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-zinc-500">
                    Nenhum fornecedor encontrado na Kamino.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-zinc-200 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Anterior
              </Button>
              <span className="text-xs text-zinc-500 self-center">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Próxima
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
