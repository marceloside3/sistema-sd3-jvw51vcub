import { useState } from 'react'
import { ShieldAlert, Key } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/stores/use-app-store'
import { Project } from '@/lib/types'

export function OverrideDialog({ project }: { project: Project }) {
  const [open, setOpen] = useState(false)
  const [justification, setJustification] = useState('')
  const { current_user, addOverride } = useAppStore()
  const { toast } = useToast()

  const isDirector = current_user.profile_id === 1

  const handleSubmit = () => {
    if (!justification.trim()) {
      toast({
        title: 'Justificativa obrigatória',
        description: 'O override de um gate exige documentação por motivos de auditoria.',
        variant: 'destructive',
      })
      return
    }

    addOverride({
      project_id: project.project_id,
      gate_id: project.active_gate,
      profile_id: current_user.profile_id,
      justification,
    })

    toast({
      title: 'Override Aplicado com Sucesso',
      description: 'O log imutável foi registrado e o projeto avançou.',
      className: 'bg-green-50 text-green-900 border-green-200',
    })
    setOpen(false)
  }

  if (!isDirector || project.status !== 'waiting_gate') return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="shadow-md">
          <ShieldAlert className="mr-2 h-4 w-4" />
          Solicitar Override (G{project.active_gate})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-amber-500" />
            Governança: Override de Gate
          </DialogTitle>
          <DialogDescription>
            Como Diretor de Área, você pode forçar a aprovação do Gate {project.active_gate}. Esta
            ação criará um log imutável no sistema.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <label className="text-sm font-medium mb-2 block">
            Justificativa Mandatória (Auditoria)
          </label>
          <Textarea
            placeholder="Insira a justificativa técnica ou comercial para ignorar as validações padrão..."
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            className="min-h-[100px] resize-none focus-visible:ring-destructive"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleSubmit}>
            Confirmar Override
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
