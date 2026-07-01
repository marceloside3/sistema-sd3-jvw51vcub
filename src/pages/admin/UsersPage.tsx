import { useState, useEffect, useMemo } from 'react'
import { useCurrentUser } from '@/hooks/use-current-user'
import {
  getUsers,
  inviteUser,
  updateUser,
  countActiveAdmins,
  getProfiles,
  getAreas,
} from '@/services/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { format } from 'date-fns'
import { Search, Plus, Edit2 } from 'lucide-react'

interface UserArea {
  is_principal: boolean
  area: { id: string; name: string } | null
}

interface UserRow {
  id: string
  full_name: string
  email: string
  is_active: boolean
  last_login_at: string | null
  profile_id: string | null
  profile: { id: string; name: string; is_admin: boolean; is_system: boolean } | null
  areas: UserArea[] | null
}

function safeAreas(areas: UserArea[] | null | undefined): UserArea[] {
  if (!Array.isArray(areas)) return []
  return areas.filter((a) => a && a.area && a.area.id)
}

export default function UsersPage() {
  const { data: currentUser, loading: currentUserLoading } = useCurrentUser()
  const isAdmin =
    currentUser?.profile?.is_admin === true || currentUser?.profile?.is_system === true
  const currentUserId = currentUser?.id ?? null

  const [users, setUsers] = useState<UserRow[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [allAreas, setAllAreas] = useState<any[]>([])

  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [profileFilter, setProfileFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    profile_id: '',
    areas: [] as { area_id: string; is_principal: boolean }[],
  })

  const isPageLoading = loading || currentUserLoading

  const safeUsers = useMemo(
    () => (Array.isArray(users) ? users.filter((u) => u && u.id && u.email) : []),
    [users],
  )

  useEffect(() => {
    loadData()
  }, [page, search, profileFilter, statusFilter])

  useEffect(() => {
    loadFilters()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await getUsers(page, 25, search, profileFilter, statusFilter)
      setUsers((res.data || []) as UserRow[])
      setTotalPages(res.totalPages || 1)
    } catch (error) {
      toast({ title: 'Erro ao carregar usuários', variant: 'destructive' })
    }
    setLoading(false)
  }

  const loadFilters = async () => {
    try {
      setProfiles(await getProfiles())
      setAllAreas(await getAreas())
    } catch {
      /* intentionally ignored */
    }
  }

  const openNewUser = () => {
    setEditingUser(null)
    setFormData({ full_name: '', email: '', profile_id: '', areas: [] })
    setIsModalOpen(true)
  }

  const openEditUser = (u: UserRow) => {
    setEditingUser(u)
    setFormData({
      full_name: u.full_name || '',
      email: u.email || '',
      profile_id: u.profile_id || '',
      areas: safeAreas(u.areas).map((a) => ({
        area_id: a.area!.id,
        is_principal: a.is_principal,
      })),
    })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!formData.full_name || !formData.email || !formData.profile_id) {
      return toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' })
    }
    const principalAreas = formData.areas.filter((a) => a.is_principal)
    if (principalAreas.length !== 1 && formData.areas.length > 0) {
      return toast({
        title: 'Selecione exatamente uma área como principal',
        variant: 'destructive',
      })
    }

    try {
      if (editingUser) {
        await updateUser(editingUser.id, { ...formData, is_active: editingUser.is_active })
        toast({ title: 'Usuário atualizado com sucesso' })
      } else {
        await inviteUser(formData)
        toast({ title: 'Convite enviado com sucesso' })
      }
      setIsModalOpen(false)
      loadData()
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' })
    }
  }

  const handleToggleStatus = async (u: UserRow) => {
    if (!currentUserId || u.id === currentUserId) {
      return toast({
        title: 'Ação não permitida',
        description: 'Não pode desativar o próprio usuário',
        variant: 'destructive',
      })
    }
    if (u.is_active && u.profile?.is_admin) {
      const count = await countActiveAdmins()
      if (count <= 1) {
        return toast({
          title: 'Ação não permitida',
          description: 'O sistema precisa de pelo menos 1 administrador ativo',
          variant: 'destructive',
        })
      }
    }

    if (u.is_active && !window.confirm('Tem certeza? O usuário não conseguirá mais fazer login.'))
      return

    try {
      await updateUser(u.id, {
        full_name: u.full_name,
        profile_id: u.profile_id,
        is_active: !u.is_active,
        areas: safeAreas(u.areas).map((a) => ({
          area_id: a.area!.id,
          is_principal: a.is_principal,
        })),
      })
      toast({ title: u.is_active ? 'Usuário desativado' : 'Usuário reativado' })
      loadData()
    } catch (error: any) {
      toast({ title: 'Erro ao alterar status', variant: 'destructive' })
    }
  }

  if (isPageLoading && safeUsers.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg border">
          <Skeleton className="flex-1 h-10" />
          <Skeleton className="w-[180px] h-10" />
          <Skeleton className="w-[180px] h-10" />
        </div>
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground">Gerencie o acesso ao sistema.</p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Button onClick={openNewUser} disabled={!isAdmin}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Usuário
              </Button>
            </div>
          </TooltipTrigger>
          {!isAdmin && <TooltipContent>Apenas administradores</TooltipContent>}
        </Tooltip>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg border">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <Input
            placeholder="Buscar nome ou email..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={profileFilter} onValueChange={setProfileFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Perfil" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os perfis</SelectItem>
            {profiles.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Áreas</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Último Login</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {safeUsers.length === 0 && !isPageLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            )}
            {safeUsers.map((u) => {
              const userAreas = safeAreas(u.areas)
              return (
                <TableRow key={u.id} className={!u.is_active ? 'opacity-60' : ''}>
                  <TableCell className="font-medium">{u.full_name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.profile?.name ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {userAreas.length === 0 && (
                        <span className="text-xs text-muted-foreground">Sem área</span>
                      )}
                      {userAreas.map((a) => (
                        <Badge
                          key={a.area?.id}
                          variant={a.is_principal ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {a.is_principal && <span className="mr-1">⭐</span>}
                          {a.area?.name ?? 'Área removida'}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={u.is_active ? 'outline' : 'destructive'}
                      className={u.is_active ? 'bg-green-50 text-green-700 border-green-200' : ''}
                    >
                      {u.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {u.last_login_at
                      ? format(new Date(u.last_login_at), 'dd/MM/yyyy HH:mm')
                      : 'Nunca'}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditUser(u)}
                            disabled={!isAdmin || u.id === currentUserId}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {!isAdmin && <TooltipContent>Apenas administradores</TooltipContent>}
                      {isAdmin && u.id === currentUserId && (
                        <TooltipContent>Não é possível editar o próprio usuário</TooltipContent>
                      )}
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            variant={u.is_active ? 'ghost' : 'default'}
                            size="sm"
                            onClick={() => handleToggleStatus(u)}
                            disabled={!isAdmin || u.id === currentUserId}
                            className={u.is_active ? 'text-red-600 hover:text-red-700' : ''}
                          >
                            {u.is_active ? 'Desativar' : 'Reativar'}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {!isAdmin && <TooltipContent>Apenas administradores</TooltipContent>}
                    </Tooltip>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Página {page} de {totalPages || 1}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
          >
            Próximo
          </Button>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
            {!editingUser && (
              <DialogDescription>
                Um convite será enviado por e-mail para que o usuário defina sua senha.
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!!editingUser}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Perfil de Acesso</Label>
              <Select
                value={formData.profile_id}
                onValueChange={(v) => setFormData({ ...formData, profile_id: v })}
                disabled={!!editingUser && editingUser.id === currentUserId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Áreas de Atuação</Label>
              <div className="border rounded-md p-4 space-y-3 max-h-48 overflow-y-auto">
                {allAreas.map((area) => {
                  const isSelected = formData.areas.some((a) => a.area_id === area.id)
                  const isPrincipal = formData.areas.find(
                    (a) => a.area_id === area.id,
                  )?.is_principal

                  return (
                    <div key={area.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(c) => {
                            if (c) {
                              setFormData({
                                ...formData,
                                areas: [
                                  ...formData.areas,
                                  { area_id: area.id, is_principal: formData.areas.length === 0 },
                                ],
                              })
                            } else {
                              setFormData({
                                ...formData,
                                areas: formData.areas
                                  .filter((a) => a.area_id !== area.id)
                                  .map((a, i) => ({ ...a, is_principal: i === 0 })),
                              })
                            }
                          }}
                        />
                        <Label className="font-normal">{area.name}</Label>
                      </div>
                      {isSelected && (
                        <label className="flex items-center space-x-2 text-sm text-gray-500 cursor-pointer">
                          <input
                            type="radio"
                            checked={isPrincipal}
                            onChange={() => {
                              setFormData({
                                ...formData,
                                areas: formData.areas.map((a) => ({
                                  ...a,
                                  is_principal: a.area_id === area.id,
                                })),
                              })
                            }}
                          />
                          <span>Principal</span>
                        </label>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
