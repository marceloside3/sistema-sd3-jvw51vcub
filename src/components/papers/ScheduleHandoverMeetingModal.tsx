import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { scheduleMeeting } from '@/services/papers'
import { getUsers } from '@/services/admin'
import { useToast } from '@/components/ui/use-toast'

export function ScheduleHandoverMeetingModal({
  projectId,
  onClose,
  onSuccess,
}: {
  projectId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const { toast } = useToast()
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [duration, setDuration] = useState('60')
  const [location, setLocation] = useState('')
  const [agenda, setAgenda] = useState('Reunião de Passagem do Projeto')
  const [users, setUsers] = useState<any[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getUsers()
      .then((data) => setUsers(data.filter((u: any) => u.is_active)))
      .catch(console.error)
  }, [])

  const handleSubmit = async () => {
    if (!date || !time)
      return toast({ title: 'Data e hora são obrigatórios', variant: 'destructive' })
    const scheduledAt = new Date(`${date}T${time}`).toISOString()

    setLoading(true)
    try {
      await scheduleMeeting(
        projectId,
        scheduledAt,
        parseInt(duration),
        location,
        agenda,
        selectedUsers,
      )
      toast({ title: 'Reunião agendada com sucesso' })
      onSuccess()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const toggleUser = (id: string) => {
    setSelectedUsers((prev) => (prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]))
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Agendar Reunião de Passagem</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Hora</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Duração (minutos)</Label>
            <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Local ou Link</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex: Google Meet"
            />
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Pauta / Assuntos</Label>
            <Textarea value={agenda} onChange={(e) => setAgenda(e.target.value)} />
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Participantes a Convocar</Label>
            <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2 bg-gray-50">
              {users.map((u) => (
                <label
                  key={u.id}
                  className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(u.id)}
                    onChange={() => toggleUser(u.id)}
                    className="rounded border-gray-300"
                  />
                  {u.full_name} ({u.email})
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Agendando...' : 'Agendar Reunião'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
