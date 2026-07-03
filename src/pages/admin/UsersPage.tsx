import { useState, useEffect, useMemo, Fragment } from 'react'
import { useCurrentUser } from '@/hooks/use-current-user'
import {
  getAllUsers,
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Plus, Edit2, ChevronRight, ChevronDown, X } from 'lucide-react'
import { UserKpiCards } from '@/components/admin/UserKpiCards'
import { UserExpandedRow } from '@/components/admin/UserExpandedRow'
import { UserFormDialog, UserFormData } from '@/components/admin/UserFormDialog'

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
  created_at: string
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
  const [search, setSearch] = useState('')
  const [profileFilter, setProfileFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [formData, setFormData] = useState<UserFormData>({
    full_name: '',
    email: '',
    profile_id: '',
    areas: [],
  })

  const isPageLoading = loading || currentUserLoading

  useEffect(() => {
    loadData()
  }, [])
  useEffect(() => {
    loadFilters()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      setUsers((await getAllUsers()) as UserRow[])
    } catch {
      toast({ title: 'Erro ao carregar usuários', variant: 'destructive' })
    }
    setLoading(false)
  }

  async function loadFilters() {
    try {
      setProfiles(await getProfiles())
      setAllAreas(await getAreas())
    } catch {
      /* ignored */
    }
  }

  const kpiData = useMemo(
    () => ({
      total: users.length,
      active: users.filter((u) => u.is_active).length,
      inactive: users.filter((u) => !u.is_active).length,
    }),
    [users],
  )

  const filteredUsers = useMemo(
    () =>
      users.filter((u) => {
        if (search) {
          const q = search.toLowerCase()
          if (!u.full_name?.toLowerCase().includes(q) && !u.email?.toLowerCase().includes(q))
            return false
        }
        if (profileFilter !== 'all' && u.profile_id !== profileFilter) return false
        if (statusFilter !== 'all' && u.is_active !== (statusFilter === 'active')) return false
        return true
      }),
    [users, search, profileFilter, statusFilter],
  )

  const hasFilters = search !== '' || profileFilter !== 'all' || statusFilter !== 'all'

  function clearFilters() {
    setSearch('')
    setProfileFilter('all')
    setStatusFilter('all')
  }

  function openNewUser() {
    setEditingUser(null)
    setFormData({ full_name: '', email: '', profile_id: '', areas: [] })
    setIsModalOpen(true)
  }

  function openEditUser(u: UserRow) {
    setEditingUser(u)
    setFormData({
      full_name: u.full_name || '',
      email: u.email || '',
      profile_id: u.profile_id || '',
      areas: safeAreas(u.areas).map((a) => ({ area_id: a.area!.id, is_principal: a.is_principal })),
    })
    setIsModalOpen(true)
  }

  async function handleSave() {
    if (!formData.full_name || !formData.email || !formData.profile_id)
      return toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' })
    const principalAreas = formData.areas.filter((a) => a.is_principal)
    if (principalAreas.length !== 1 && formData.areas.length > 0)
      return toast({
        title: 'Selecione exatamente uma área como principal',
        variant: 'destructive',
      })
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

  async function handleToggleStatus(u: UserRow) {
    if (!currentUserId || u.id === currentUserId)
      return toast({
        title: 'Ação não permitida',
        description: 'Não pode desativar o próprio usuário',
        variant: 'destructive',
      })
    if (u.is_active && u.profile?.is_admin) {
      const count = await countActiveAdmins()
      if (count <= 1)
        return toast({
          title: 'Ação não permitida',
          description: 'O sistema precisa de pelo menos 1 administrador ativo',
          variant: 'destructive',
        })
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
    } catch {
      toast({ title: 'Erro ao alterar status', variant: 'destructive' })
    }
  }

  if (isPageLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
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

      <UserKpiCards {...kpiData} />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Filtros</CardTitle>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7">
                <X className="w-3 h-3 mr-1" />
                Limpar filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
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
        </CardContent>
      </Card>

      <div className="bg-white rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]" />
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((u) => (
                <Fragment key={u.id}>
                  <TableRow className={!u.is_active ? 'opacity-60' : ''}>
                    <TableCell
                      className="align-middle cursor-pointer"
                      onClick={() => setExpandedId(expandedId === u.id ? null : u.id)}
                    >
                      {expandedId === u.id ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{u.full_name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      {u.profile ? (
                        <Badge variant="secondary" className="text-xs">
                          {u.profile.name}
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={u.is_active ? 'outline' : 'destructive'}
                        className={u.is_active ? 'bg-green-50 text-green-700 border-green-200' : ''}
                      >
                        {u.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
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
                  {expandedId === u.id && <UserExpandedRow user={u} colSpan={6} />}
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <UserFormDialog
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        editingUser={editingUser}
        profiles={profiles}
        allAreas={allAreas}
        formData={formData}
        setFormData={setFormData}
        onSave={handleSave}
        currentUserId={currentUserId}
      />
    </div>
  )
}
