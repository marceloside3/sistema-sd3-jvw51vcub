import { useState, useEffect } from 'react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { getProfiles, createProfile, updateProfile, countProfileUsers } from '@/services/admin'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Edit2, Plus, Lock } from 'lucide-react'

export default function ProfilesPage() {
  const { data: currentUser } = useCurrentUser()
  const isAdmin = currentUser?.profile?.is_admin === true

  const [profiles, setProfiles] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<any>(null)

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    is_director: false,
    is_admin: false,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setProfiles(await getProfiles())
    } catch (error) {
      toast({ title: 'Erro ao carregar perfis', variant: 'destructive' })
    }
  }

  const openNewProfile = () => {
    setEditingProfile(null)
    setFormData({ code: '', name: '', is_director: false, is_admin: false })
    setIsModalOpen(true)
  }

  const openEditProfile = (p: any) => {
    if (p.is_system) return
    setEditingProfile(p)
    setFormData({ code: p.code, name: p.name, is_director: p.is_director, is_admin: p.is_admin })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!/^[a-z][a-z0-9_]*$/.test(formData.code)) {
      return toast({
        title: 'Código inválido',
        description: 'Apenas letras minúsculas, números e underline.',
        variant: 'destructive',
      })
    }

    try {
      if (editingProfile) {
        await updateProfile(editingProfile.id, formData)
        toast({ title: 'Perfil atualizado' })
      } else {
        await createProfile({ ...formData, is_system: false })
        toast({ title: 'Perfil criado' })
      }
      setIsModalOpen(false)
      loadData()
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' })
    }
  }

  const handleToggleStatus = async (p: any) => {
    if (p.is_system) return

    if (p.is_active) {
      const usersCount = await countProfileUsers(p.id)
      if (usersCount > 0) {
        return toast({
          title: 'Ação bloqueada',
          description: `Não é possível desativar: ${usersCount} usuários usam esse perfil.`,
          variant: 'destructive',
        })
      }
    }

    try {
      await updateProfile(p.id, { is_active: !p.is_active })
      toast({ title: p.is_active ? 'Perfil desativado' : 'Perfil reativado' })
      loadData()
    } catch (error) {
      toast({ title: 'Erro ao alterar status', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Perfis de Acesso</h1>
          <p className="text-muted-foreground">Gerencie as permissões do sistema.</p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Button onClick={openNewProfile} disabled={!isAdmin}>
                <Plus className="w-4 h-4 mr-2" /> Novo Perfil
              </Button>
            </div>
          </TooltipTrigger>
          {!isAdmin && <TooltipContent>Apenas administradores</TooltipContent>}
        </Tooltip>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Permissões</TableHead>
              <TableHead>Tipo / Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((p) => (
              <TableRow key={p.id} className={!p.is_active ? 'opacity-60' : ''}>
                <TableCell className="font-mono text-sm">{p.code}</TableCell>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {p.is_admin && (
                      <Badge variant="secondary" className="bg-purple-50 text-purple-700">
                        Administrador
                      </Badge>
                    )}
                    {p.is_director && !p.is_admin && (
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                        Diretor
                      </Badge>
                    )}
                    {!p.is_admin && !p.is_director && (
                      <span className="text-sm text-gray-500">Padrão</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Badge
                      variant={p.is_active ? 'outline' : 'destructive'}
                      className={p.is_active ? 'bg-green-50 text-green-700 border-green-200' : ''}
                    >
                      {p.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    {p.is_system && (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                        Sistema
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditProfile(p)}
                          disabled={!isAdmin || p.is_system}
                        >
                          {p.is_system ? (
                            <Lock className="w-4 h-4 text-gray-400" />
                          ) : (
                            <Edit2 className="w-4 h-4" />
                          )}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {!isAdmin ? (
                      <TooltipContent>Apenas administradores</TooltipContent>
                    ) : p.is_system ? (
                      <TooltipContent>Perfil de sistema — não editável</TooltipContent>
                    ) : null}
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          variant={p.is_active ? 'ghost' : 'default'}
                          size="sm"
                          onClick={() => handleToggleStatus(p)}
                          disabled={!isAdmin || p.is_system}
                          className={
                            p.is_active && !p.is_system ? 'text-red-600 hover:text-red-700' : ''
                          }
                        >
                          {p.is_active ? 'Desativar' : 'Reativar'}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {!isAdmin ? (
                      <TooltipContent>Apenas administradores</TooltipContent>
                    ) : p.is_system ? (
                      <TooltipContent>Perfil de sistema — não editável</TooltipContent>
                    ) : null}
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProfile ? 'Editar Perfil' : 'Novo Perfil'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase() })}
                placeholder="ex: gerente_projetos"
                disabled={!!editingProfile}
              />
            </div>
            <div className="space-y-2">
              <Label>Nome do Perfil</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-4 pt-4 border-t">
              <Label>Permissões Especiais</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_director"
                  checked={formData.is_director}
                  onCheckedChange={(c) => setFormData({ ...formData, is_director: !!c })}
                />
                <Label htmlFor="is_director" className="font-normal">
                  Acesso de Diretor (Leitura ampla)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_admin"
                  checked={formData.is_admin}
                  onCheckedChange={(c) => setFormData({ ...formData, is_admin: !!c })}
                />
                <Label htmlFor="is_admin" className="font-normal text-purple-700">
                  Acesso de Administrador (Controle total)
                </Label>
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
