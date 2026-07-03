import type { Dispatch, SetStateAction } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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

export interface UserFormData {
  full_name: string
  email: string
  profile_id: string
  areas: { area_id: string; is_principal: boolean }[]
}

interface UserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingUser: any | null
  profiles: any[]
  allAreas: any[]
  formData: UserFormData
  setFormData: Dispatch<SetStateAction<UserFormData>>
  onSave: () => void
  currentUserId: string | null
}

export function UserFormDialog({
  open,
  onOpenChange,
  editingUser,
  profiles,
  allAreas,
  formData,
  setFormData,
  onSave,
  currentUserId,
}: UserFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                const isPrincipal = formData.areas.find((a) => a.area_id === area.id)?.is_principal
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
