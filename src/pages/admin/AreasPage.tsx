import { useState, useEffect } from 'react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { getAreas, createArea, updateArea, countAreaUsers } from '@/services/admin'
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
import { Edit2, Plus } from 'lucide-react'

export default function AreasPage() {
  const { data: currentUser } = useCurrentUser()
  const isAdmin = currentUser?.profile?.is_admin === true

  const [areas, setAreas] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingArea, setEditingArea] = useState<any>(null)

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    display_order: 0,
    is_hub: false,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setAreas(await getAreas())
    } catch (error) {
      toast({ title: 'Erro ao carregar áreas', variant: 'destructive' })
    }
  }

  const openNewArea = () => {
    setEditingArea(null)
    setFormData({ code: '', name: '', display_order: areas.length + 1, is_hub: false })
    setIsModalOpen(true)
  }

  const openEditArea = (a: any) => {
    setEditingArea(a)
    setFormData({ code: a.code, name: a.name, display_order: a.display_order, is_hub: a.is_hub })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!/^[a-z][a-z0-9_]*$/.test(formData.code)) {
      return toast({
        title: 'Código inválido',
        description: 'Apenas letras minúsculas, números e underline. Deve começar com letra.',
        variant: 'destructive',
      })
    }

    if (formData.is_hub) {
      const existingHub = areas.find((a) => a.is_hub && a.id !== editingArea?.id)
      if (existingHub) {
        return toast({
          title: 'Ação não permitida',
          description: 'Já existe uma área Hub no sistema.',
          variant: 'destructive',
        })
      }
    }

    try {
      if (editingArea) {
        await updateArea(editingArea.id, formData)
        toast({ title: 'Área atualizada' })
      } else {
        await createArea(formData)
        toast({ title: 'Área criada' })
      }
      setIsModalOpen(false)
      loadData()
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' })
    }
  }

  const handleToggleStatus = async (a: any) => {
    if (a.is_active) {
      const usersCount = await countAreaUsers(a.id)
      if (usersCount > 0) {
        return toast({
          title: 'Ação bloqueada',
          description: `Não é possível desativar: ${usersCount} usuários vinculados a esta área.`,
          variant: 'destructive',
        })
      }
    }

    try {
      await updateArea(a.id, { is_active: !a.is_active })
      toast({ title: a.is_active ? 'Área desativada' : 'Área reativada' })
      loadData()
    } catch (error) {
      toast({ title: 'Erro ao alterar status', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Áreas Operacionais</h1>
          <p className="text-muted-foreground">Gerencie os departamentos da empresa.</p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Button onClick={openNewArea} disabled={!isAdmin}>
                <Plus className="w-4 h-4 mr-2" /> Nova Área
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
              <TableHead>Ordem</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Status / Hub</TableHead>
              <TableHead>Responsáveis</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {areas.map((a) => (
              <TableRow key={a.id} className={!a.is_active ? 'opacity-60' : ''}>
                <TableCell>{a.display_order}</TableCell>
                <TableCell className="font-mono text-sm">{a.code}</TableCell>
                <TableCell className="font-medium">{a.name}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Badge
                      variant={a.is_active ? 'outline' : 'destructive'}
                      className={a.is_active ? 'bg-green-50 text-green-700 border-green-200' : ''}
                    >
                      {a.is_active ? 'Ativa' : 'Inativa'}
                    </Badge>
                    {a.is_hub && (
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                        Hub
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>{a.responsibles?.[0]?.count || 0}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditArea(a)}
                          disabled={!isAdmin}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {!isAdmin && <TooltipContent>Apenas administradores</TooltipContent>}
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          variant={a.is_active ? 'ghost' : 'default'}
                          size="sm"
                          onClick={() => handleToggleStatus(a)}
                          disabled={!isAdmin}
                          className={a.is_active ? 'text-red-600 hover:text-red-700' : ''}
                        >
                          {a.is_active ? 'Desativar' : 'Reativar'}
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

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingArea ? 'Editar Área' : 'Nova Área'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase() })}
                placeholder="ex: marketing_digital"
                disabled={!!editingArea}
              />
              <p className="text-xs text-gray-500">Apenas letras minúsculas e underline.</p>
            </div>
            <div className="space-y-2">
              <Label>Nome da Área</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Ordem de Exibição</Label>
              <Input
                type="number"
                value={formData.display_order}
                onChange={(e) =>
                  setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="is_hub"
                checked={formData.is_hub}
                onCheckedChange={(c) => setFormData({ ...formData, is_hub: !!c })}
              />
              <Label htmlFor="is_hub">É uma área Hub?</Label>
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
