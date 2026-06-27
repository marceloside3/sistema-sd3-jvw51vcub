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
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

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
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [openCombobox, setOpenCombobox] = useState(false)
  const [dateTimeError, setDateTimeError] = useState('')

  useEffect(() => {
    supabase
      .from('users')
      .select('id, full_name, email')
      .eq('is_active', true)
      .then(({ data, error }) => {
        if (!error && data) {
          setUsers(data)
        }
        setLoadingUsers(false)
      })
  }, [])

  const handleSubmit = async () => {
    setDateTimeError('')
    if (!date || !time) {
      return toast({ title: 'Data e hora são obrigatórios', variant: 'destructive' })
    }
    if (selectedUsers.length === 0) {
      return toast({ title: 'Selecione pelo menos um participante', variant: 'destructive' })
    }

    const [year, month, day] = date.split('-').map(Number)
    const [hours, minutes] = time.split(':').map(Number)
    const selectedDate = new Date(year, month - 1, day, hours, minutes)

    if (selectedDate <= new Date()) {
      setDateTimeError('Data e hora devem ser futuras.')
      return
    }

    // Create an ISO8601 string with the explicit local timezone offset
    const offset = new Date().getTimezoneOffset()
    const sign = offset > 0 ? '-' : '+'
    const absOffset = Math.abs(offset)
    const hours = String(Math.floor(absOffset / 60)).padStart(2, '0')
    const minutes = String(absOffset % 60).padStart(2, '0')
    const timeWithSeconds = time.length === 5 ? `${time}:00` : time
    const scheduledAt = `${date}T${timeWithSeconds}${sign}${hours}:${minutes}`

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

  const selectedUserDetails = users.filter((u) => selectedUsers.includes(u.id))

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
          {dateTimeError && (
            <div className="col-span-2 text-sm text-red-500 mt-[-8px]">{dateTimeError}</div>
          )}
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
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openCombobox}
                  className="w-full justify-between h-auto min-h-[2.5rem] py-2"
                >
                  <div className="flex flex-wrap gap-1">
                    {selectedUserDetails.length > 0 ? (
                      selectedUserDetails.map((u) => (
                        <Badge
                          key={u.id}
                          variant="secondary"
                          className="mr-1 mb-1"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            toggleUser(u.id)
                          }}
                        >
                          {u.full_name}
                          <div
                            role="button"
                            className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          >
                            <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                          </div>
                        </Badge>
                      ))
                    ) : loadingUsers ? (
                      <span className="text-muted-foreground font-normal">Carregando...</span>
                    ) : (
                      <span className="text-muted-foreground font-normal">
                        Selecionar participantes...
                      </span>
                    )}
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[480px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar por nome ou email..." />
                  <CommandList>
                    <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
                    <CommandGroup>
                      {users.map((user) => (
                        <CommandItem
                          key={user.id}
                          value={`${user.full_name} ${user.email}`}
                          onSelect={() => toggleUser(user.id)}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              selectedUsers.includes(user.id) ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{user.full_name}</span>
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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
