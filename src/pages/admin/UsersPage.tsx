import { useState, useEffect } from 'react'
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

export default function UsersPage() {
  const { data: currentUser } = useCurrentUser()
  const isAdmin =
    currentUser?.profile?.is_admin === true || currentUser?.profile?.is_system === true

  const [users, setUsers] = useState<any[]>([])
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

  useEffect(() => {
    loadData()
    loadFilters()
  }, [page, search, profileFilter, statusFilter])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await getUsers(page, 25, search, profileFilter, statusFilter)
      setUsers(res.data || [])
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

  const openEditUser = (u: any) => {
    setEditingUser(u)
    setFormData({
      full_name: u.full_name,
      email: u.email,
      profile_id: u.profile_id,
      areas: (u.areas || [])
        .filter((a: any) => a?.area?.id)
        .map((a: any) => ({ area_id: a.area!.id, is_principal: a.is_principal })),
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

  const handleToggleStatus = async (u: any) => {
    if (u.id === currentUser?.user.id) {
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
        areas: (u.areas || [])
          .filter((a: any) => a?.area?.id)
          .map((a: any) => ({ area_id: a.area!.id, is_principal: a.is_principal })),
      })
      toast({ title: u.is_active ? 'Usuário desativado' : 'Usuário reativado' })
      loadData()
    } catch (error: any) {
      toast({ title: 'Erro ao alterar status', variant: 'destructive' })
    }
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
            {users.map((u) => (
              <TableRow key={u.id} className={!u.is_active ? 'opacity-60' : ''}>
                <TableCell className="font-medium">{u.full_name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.profile?.name}</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {(u.areas || [])
                      .filter((a: any) => a?.area?.id)
                      .map((a: any) => (
                        <Badge
                          key={a.area!.id}
                          variant={a.is_principal ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {a.is_principal && <span className="mr-1">⭐</span>}
                          {a.area?.name ?? 'Área removida'} {a.is_principal && '(Principal)'}
                        </Badge>
                      ))}
                  </div>
                </TableCell>{' '}
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
                          disabled={!isAdmin || u.id === currentUser?.user.id}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {!isAdmin && <TooltipContent>Apenas administradores</TooltipContent>}
                    {isAdmin && u.id === currentUser?.user.id && (
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
                          disabled={!isAdmin || u.id === currentUser?.user.id}
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
            ))}
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
                disabled={!!editingUser && editingUser.id === currentUser?.user.id}
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
