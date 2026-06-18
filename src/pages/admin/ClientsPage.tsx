import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Edit2, Search } from 'lucide-react'

import { useCurrentUser } from '@/hooks/use-current-user'
import { getClients, updateClient } from '@/services/clients'
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
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/use-toast'
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

export default function ClientsPage() {
  const navigate = useNavigate()
  const { data: currentUser } = useCurrentUser()
  const canManage =
    currentUser?.profile?.is_admin === true || currentUser?.profile?.is_director === true

  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (currentUser && !canManage) {
      navigate('/')
    }
  }, [canManage, currentUser, navigate])

  const loadData = async () => {
    setLoading(true)
    try {
      const { data, totalPages: tp } = await getClients(page, 25, search, statusFilter)
      setClients(data || [])
      setTotalPages(tp)
    } catch (error) {
      toast({ title: 'Erro ao carregar clientes', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData()
    }, 300)
    return () => clearTimeout(timer)
  }, [page, search, statusFilter])

  const handleToggleStatus = async (client: any) => {
    try {
      const newStatus = client.status === 'active' ? 'inactive' : 'active'
      await updateClient(client.id, { status: newStatus })
      toast({ title: newStatus === 'active' ? 'Cliente reativado' : 'Cliente desativado' })
      loadData()
    } catch (error: any) {
      toast({ title: 'Erro ao alterar status', description: error.message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">Gerencie a base de clientes da agência.</p>
        </div>
        <Button asChild>
          <Link to="/admin/clientes/novo">
            <Plus className="w-4 h-4 mr-2" /> Novo Cliente
          </Link>
        </Button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Buscar por nome ou código..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Segmento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((c) => (
              <TableRow key={c.id} className={c.status === 'inactive' ? 'opacity-60' : ''}>
                <TableCell className="font-mono font-medium">{c.code}</TableCell>
                <TableCell className="font-semibold">{c.name}</TableCell>
                <TableCell>{c.cnpj || '-'}</TableCell>
                <TableCell>{c.segment || '-'}</TableCell>
                <TableCell>
                  <Badge
                    variant={c.status === 'active' ? 'outline' : 'destructive'}
                    className={
                      c.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : ''
                    }
                  >
                    {c.status === 'active' ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/admin/clientes/${c.id}`}>
                      <Edit2 className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button
                    variant={c.status === 'active' ? 'ghost' : 'default'}
                    size="sm"
                    onClick={() => handleToggleStatus(c)}
                    className={c.status === 'active' ? 'text-red-600 hover:text-red-700' : ''}
                  >
                    {c.status === 'active' ? 'Desativar' : 'Reativar'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {clients.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  Nenhum cliente encontrado.
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
    </div>
  )
}
