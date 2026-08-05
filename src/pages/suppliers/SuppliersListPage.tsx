import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Edit2, Search, Upload } from 'lucide-react'
import { getSuppliers } from '@/services/suppliers'
import { CsvImportDialog } from '@/components/suppliers/CsvImportDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { toast } from '@/components/ui/use-toast'

export default function SuppliersListPage() {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [csvOpen, setCsvOpen] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const { data, totalPages: tp } = await getSuppliers(page, 25, search, typeFilter)
      setSuppliers(data)
      setTotalPages(tp)
    } catch {
      toast({ title: 'Erro ao carregar fornecedores', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => loadData(), 300)
    return () => clearTimeout(t)
  }, [page, search, typeFilter])

  const formatDoc = (doc: string, type: string) => {
    const d = doc.replace(/\D/g, '')
    if (type === 'PF') return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fornecedores</h1>
          <p className="text-muted-foreground">Gerencie a base de fornecedores da agência.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCsvOpen(true)}>
            <Upload className="w-4 h-4 mr-2" /> Importar CSV
          </Button>
          <Button asChild>
            <Link to="/fornecedores/novo">
              <Plus className="w-4 h-4 mr-2" /> Novo Fornecedor
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Buscar por nome ou documento..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={typeFilter}
          onValueChange={(v) => {
            setTypeFilter(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="PF">Pessoa Física</SelectItem>
            <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Cidade/UF</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-semibold">{s.name}</TableCell>
                <TableCell>
                  <Badge
                    variant={s.type === 'PF' ? 'outline' : 'default'}
                    className={s.type === 'PF' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                  >
                    {s.type === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-sm">{formatDoc(s.document, s.type)}</TableCell>
                <TableCell className="text-sm">{s.phone || '-'}</TableCell>
                <TableCell className="text-sm">{s.email || '-'}</TableCell>
                <TableCell className="text-sm">
                  {[s.city, s.uf].filter(Boolean).join('/ ') || '-'}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/fornecedores/${s.id}`}>
                      <Edit2 className="w-4 h-4" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {suppliers.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  Nenhum fornecedor encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  setPage((p) => Math.max(1, p - 1))
                }}
              />
            </PaginationItem>
            <PaginationItem>
              <span className="text-sm text-muted-foreground px-4">
                Página {page} de {totalPages}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  setPage((p) => Math.min(totalPages, p + 1))
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <CsvImportDialog open={csvOpen} onOpenChange={setCsvOpen} onImported={loadData} />
    </div>
  )
}
