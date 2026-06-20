import { useEffect, useState } from 'react'
import { getProjectAuditLog } from '@/services/projects'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ProjectHistoryTabProps {
  projectId: string
}

export function ProjectHistoryTab({ projectId }: ProjectHistoryTabProps) {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [eventType, setEventType] = useState('all')
  const [period, setPeriod] = useState('all')

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true)
      try {
        let eventTypes: string[] | null = null
        if (eventType === 'status') {
          eventTypes = [
            'project_status_changed',
            'project_completed',
            'project_reopened',
            'project_overdue_auto',
            'project_overdue_resolved_auto',
          ]
        } else if (eventType === 'dates') {
          eventTypes = ['project_end_date_changed', 'project_start_date_changed']
        } else if (eventType === 'areas') {
          eventTypes = ['project_area_added', 'project_area_removed', 'project_area_lead_changed']
        }

        let since: string | null = null
        if (period !== 'all') {
          const days = parseInt(period, 10)
          since = subDays(new Date(), days).toISOString()
        }

        const data = await getProjectAuditLog(projectId, eventTypes, since)
        setLogs(data || [])
      } catch (err) {
        console.error('Failed to load audit logs', err)
      } finally {
        setLoading(false)
      }
    }

    if (projectId) {
      fetchLogs()
    }
  }, [projectId, eventType, period])

  const formatDescription = (log: any) => {
    const t = log.event_type
    const oldV = log.old_value || ''
    const newV = log.new_value || ''

    switch (t) {
      case 'project_created':
        return `Projeto criado: ${newV}`
      case 'project_status_changed':
        return `Status alterado de "${oldV}" para "${newV}"`
      case 'project_completed':
        return `Projeto concluído`
      case 'project_reopened':
        return `Projeto reaberto (status: ${newV})`
      case 'project_overdue_auto':
        return `Marcado como atrasado automaticamente`
      case 'project_overdue_resolved_auto':
        return `Saiu de atraso automaticamente (status: ${newV})`
      case 'project_end_date_changed':
        return `Prazo final alterado de ${oldV} para ${newV}`
      case 'project_start_date_changed':
        return `Data de início alterada de ${oldV} para ${newV}`
      case 'project_name_changed':
        return `Nome alterado de "${oldV}" para "${newV}"`
      case 'project_client_changed':
        return `Cliente alterado`
      case 'project_area_added':
        return `Área adicionada: ${newV}`
      case 'project_area_removed':
        return `Área removida: ${oldV}`
      case 'project_area_lead_changed':
        return `Líder de área definido: ${newV}`
      default:
        return `Evento: ${t}`
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="space-y-2 flex-1">
            <label className="text-sm font-medium">Tipo de evento</label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os eventos</SelectItem>
                <SelectItem value="status">Mudanças de status</SelectItem>
                <SelectItem value="dates">Mudanças de datas</SelectItem>
                <SelectItem value="areas">Mudanças de áreas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 flex-1">
            <label className="text-sm font-medium">Período</label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo o histórico</SelectItem>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4 relative border-l-2 border-gray-100 ml-3 pl-5 py-2">
          {loading ? (
            <p className="text-sm text-gray-500 py-4">Carregando histórico...</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">
              Nenhum evento registrado para este período.
            </p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="relative">
                <div className="absolute w-2 h-2 bg-gray-300 rounded-full -left-[25px] top-2 border border-white"></div>
                <div className="bg-gray-50 rounded p-3 text-sm border shadow-sm">
                  <p className="font-medium text-gray-900 mb-1">{formatDescription(log)}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{log.actor_name || 'Sistema'}</span>
                    <span>•</span>
                    <span>
                      {format(new Date(log.created_at), 'dd/MM/yyyy, HH:mm', { locale: ptBR })}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
