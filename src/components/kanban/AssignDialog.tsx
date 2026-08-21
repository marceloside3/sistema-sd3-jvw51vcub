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
      <DialogContent className="sm:max-w-[440px] bg-zinc-950 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <div className="flex items-center gap-2 text-orange-400">
            <UserCheck className="w-5 h-5" />
            <DialogTitle className="text-lg font-semibold text-zinc-100">
              Distribuir Demanda
            </DialogTitle>
          </div>
          <DialogDescription className="text-zinc-400 text-xs">
            Atribua um criativo da equipe para mover a demanda para{' '}
            <strong className="text-blue-400 font-medium">A Fazer</strong>.
          </DialogDescription>
        </DialogHeader>

        {demand && (
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3 my-2 space-y-1">
            <p className="text-xs font-semibold text-zinc-200 line-clamp-1">{demand.title}</p>
            {demand.project && (
              <p className="text-[11px] text-zinc-400">
                Projeto: <span className="text-zinc-300">{demand.project.name}</span>
              </p>
            )}
          </div>
        )}

        <div className="space-y-3 py-2">
          <Label htmlFor="creative-select" className="text-xs font-medium text-zinc-300">
            Selecione o Criativo Responsável <span className="text-red-400">*</span>
          </Label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger
              id="creative-select"
              className="w-full bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus:ring-orange-500"
            >
              <SelectValue placeholder="Escolha um criativo..." />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
              {availableCreatives.length === 0 ? (
                <div className="p-2 text-xs text-zinc-400 text-center">
                  Nenhum criativo disponível
                </div>
              ) : (
                availableCreatives.map((creative) => (
                  <SelectItem
                    key={creative.id}
                    value={creative.id}
                    className="focus:bg-zinc-800 focus:text-orange-400 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-[10px] font-semibold">
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
            className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedUserId || submitting}
            className="bg-orange-500 hover:bg-orange-600 text-white font-medium"
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
