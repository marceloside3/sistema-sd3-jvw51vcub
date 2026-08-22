import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { UserCheck, Loader2 } from 'lucide-react'
import type { CreativeUser, KanbanDemand } from '@/services/kanban'

interface AssignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  demand: KanbanDemand | null
  creatives: CreativeUser[]
  onConfirm: (creativeUserId: string) => Promise<void>
}

export function AssignDialog({
  open,
  onOpenChange,
  demand,
  creatives,
  onConfirm,
}: AssignDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  // Filter only non-director creatives or show all available
  const availableCreatives = creatives.filter((c) => !c.is_director)

  const handleConfirm = async () => {
    if (!selectedUserId) return
    try {
      setSubmitting(true)
      await onConfirm(selectedUserId)
      setSelectedUserId('')
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] bg-white border-zinc-200 text-zinc-900 rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-orange-500">
            <UserCheck className="w-5 h-5" />
            <DialogTitle className="text-lg font-semibold text-zinc-900">
              Distribuir Demanda
            </DialogTitle>
          </div>
          <DialogDescription className="text-zinc-500 text-xs">
            Atribua um criativo da equipe para mover a demanda para{' '}
            <strong className="text-blue-500 font-medium">A Fazer</strong>.
          </DialogDescription>
        </DialogHeader>

        {demand && (
          <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-3 my-2 space-y-1">
            <p className="text-xs font-semibold text-zinc-800 line-clamp-1">{demand.title}</p>
            {demand.project && (
              <p className="text-[11px] text-zinc-500">
                Projeto: <span className="text-zinc-700">{demand.project.name}</span>
              </p>
            )}
          </div>
        )}

        <div className="space-y-3 py-2">
          <Label htmlFor="creative-select" className="text-xs font-medium text-zinc-700">
            Selecione o Criativo Responsável <span className="text-rose-500">*</span>
          </Label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger
              id="creative-select"
              className="w-full bg-zinc-50 border-zinc-200 text-zinc-800 placeholder:text-zinc-400 focus:ring-orange-500 rounded-xl"
            >
              <SelectValue placeholder="Escolha um criativo..." />
            </SelectTrigger>
            <SelectContent className="bg-white border-zinc-200 text-zinc-800">
              {availableCreatives.length === 0 ? (
                <div className="p-2 text-xs text-zinc-400 text-center">
                  Nenhum criativo disponível
                </div>
              ) : (
                availableCreatives.map((creative) => (
                  <SelectItem
                    key={creative.id}
                    value={creative.id}
                    className="focus:bg-orange-50 focus:text-orange-600 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-[10px] font-semibold">
                        {creative.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-medium">{creative.full_name}</span>
                        <span className="text-[10px] text-zinc-400">{creative.email}</span>
                      </div>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedUserId || submitting}
            className="bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Distribuindo...
              </>
            ) : (
              'Confirmar Atribuição'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
