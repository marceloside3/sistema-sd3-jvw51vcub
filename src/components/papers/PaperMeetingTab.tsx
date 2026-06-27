import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Download, Users, FileText, CheckCircle } from 'lucide-react'
import { ScheduleHandoverMeetingModal } from './ScheduleHandoverMeetingModal'
import { updateMeeting, downloadMeetingIcs } from '@/services/papers'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'

export function PaperMeetingTab({
  projectId,
  meetings,
  onReload,
}: {
  projectId: string
  meetings: any[]
  onReload: () => void
}) {
  const { toast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [savingNotes, setSavingNotes] = useState<string | null>(null)

  const handleComplete = async (meeting: any) => {
    try {
      await updateMeeting(meeting.id, { status: 'completed' })
      toast({ title: 'Reunião marcada como concluída' })
      onReload()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    }
  }

  const handleNotesChange = async (meeting: any, notes: string) => {
    setSavingNotes(meeting.id)
    try {
      await updateMeeting(meeting.id, { notes })
      toast({ title: 'Ata salva automaticamente' })
    } catch (e: any) {
      toast({ title: 'Erro ao salvar ata', description: e.message, variant: 'destructive' })
    } finally {
      setSavingNotes(null)
    }
  }

  const handleDownloadIcs = async (meetingId: string) => {
    try {
      const data = await downloadMeetingIcs(meetingId)
      const blob = new Blob([data], { type: 'text/calendar;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reuniao-passagem-${meetingId.substring(0, 8)}.ics`
      a.click()
    } catch (e: any) {
      toast({ title: 'Erro', description: 'Falha ao baixar .ics', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Reuniões de Passagem</h3>
        <Button onClick={() => setModalOpen(true)}>
          <Calendar className="w-4 h-4 mr-2" /> Agendar Reunião
        </Button>
      </div>

      {meetings.length === 0 ? (
        <div className="p-12 text-center text-gray-500 border border-dashed rounded-lg bg-gray-50 flex flex-col items-center justify-center">
          <Calendar className="w-12 h-12 text-gray-300 mb-4" />
          <p className="text-lg mb-2">Nenhuma reunião agendada ainda.</p>
          <Button variant="link" onClick={() => setModalOpen(true)}>
            Agendar Reunião de Passagem
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {meetings.map((m) => (
            <Card key={m.id} className={m.status === 'completed' ? 'opacity-80' : ''}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-lg">
                        {new Date(m.scheduled_at).toLocaleString('pt-BR')}
                      </h4>
                      <Badge variant={m.status === 'completed' ? 'default' : 'secondary'}>
                        {m.status === 'completed' ? 'Concluída' : 'Agendada'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      <strong>Duração:</strong> {m.duration_minutes} min
                    </p>
                    <p className="text-sm text-gray-600 mb-1">
                      <strong>Local/Link:</strong> {m.location_or_link || '-'}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Pauta:</strong> {m.agenda || '-'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleDownloadIcs(m.id)}>
                      <Download className="w-4 h-4 mr-2" /> Baixar .ics
                    </Button>
                    {m.status !== 'completed' && (
                      <Button variant="default" size="sm" onClick={() => handleComplete(m)}>
                        <CheckCircle className="w-4 h-4 mr-2" /> Marcar como Concluída
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
                    <Users className="w-4 h-4" /> Participantes
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(m.participants || []).map((p: any) => (
                      <Badge key={p.user_id} variant="outline" className="bg-gray-50">
                        {p.user?.full_name || p.user?.email} {p.is_organizer && '(Org)'}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t">
                  <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
                    <FileText className="w-4 h-4" /> Ata da Reunião
                  </div>
                  <div className="relative">
                    <Textarea
                      defaultValue={m.notes || ''}
                      onBlur={(e) => handleNotesChange(m, e.target.value)}
                      placeholder="Registre os pontos discutidos na reunião..."
                      className="min-h-[100px]"
                    />
                    {savingNotes === m.id && (
                      <span className="absolute bottom-2 right-2 text-xs text-blue-500">
                        Salvando...
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {modalOpen && (
        <ScheduleHandoverMeetingModal
          projectId={projectId}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false)
            onReload()
          }}
        />
      )}
    </div>
  )
}
