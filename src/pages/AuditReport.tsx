import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase/client'
import { formatDateBR } from '@/lib/utils'
import { AlertCircle, Search, CheckCircle2 } from 'lucide-react'

const G3_EVENT_TYPES = ['g3_submitted', 'g3_approved', 'g3_rejected', 'g3_override'] as const

export default function AuditReport() {
  const [overrides, setOverrides] = useState<any[]>([])
  const [auditEvents, setAuditEvents] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  useEffect(() => {
    async function loadData() {
      const { data: overrideData, error: overrideError } = await supabase
        .from('project_audit_log')
        .select(`
          id, created_at, metadata, 
          projects(id, name, clients(name)), 
          users:actor_user_id(full_name)
        `)
        .eq('event_type', 'g2_override')
        .order('created_at', { ascending: false })

      if (!overrideError && overrideData) {
        setOverrides(overrideData)
      }

      const g3EventTypes = [...G3_EVENT_TYPES]
      const { data: g3Data, error: g3Error } = await supabase
        .from('project_audit_log')
        .select(`
          id, created_at, event_type, field_name, new_value, old_value, metadata,
          projects(id, name, clients(name)),
          users:actor_user_id(full_name)
        `)
        .in('event_type', g3EventTypes as any[])
        .order('created_at', { ascending: false })

      if (!g3Error && g3Data) {
        setAuditEvents(g3Data)
      }
    }
    loadData()
  }, [])

  const filteredOverrides = overrides.filter((ov) => {
    const userMatch = ov.users?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false
    const dateMatch = dateFilter ? ov.created_at.startsWith(dateFilter) : true
    return userMatch && dateMatch
  })

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Auditoria</h1>
          <p className="text-muted-foreground mt-2">
            Histórico de eventos críticos de governança do sistema.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            Overrides do Gate G2
          </CardTitle>
          <CardDescription>
            Histórico de aprovações excepcionais (override) durante a distribuição de projetos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por usuário..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Input
              type="date"
              className="max-w-[180px]"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>

          {filteredOverrides.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum override encontrado com os filtros atuais.
            </p>
          ) : (
            <div className="space-y-4">
              {filteredOverrides.map((ov) => {
                const proj = ov.projects
                const metadata = (ov.metadata as any) || {}
                const issues = metadata.issues || []
                return (
                  <div key={ov.id} className="border rounded-md p-4 space-y-3 bg-muted/20">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-sm">
                          {proj?.name}{' '}
                          <span className="text-muted-foreground font-normal">
                            ({proj?.clients?.name})
                          </span>
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Autorizado por{' '}
                          <span className="font-medium text-foreground">
                            {ov.users?.full_name || 'Desconhecido'}
                          </span>{' '}
                          em {formatDateBR(ov.created_at)} às{' '}
                          {new Date(ov.created_at).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <StatusBadge category="g2" status="g2_override" label="Exceção G2" showIcon />
                    </div>

                    <div className="bg-background border rounded p-3 text-sm">
                      <p className="font-medium mb-1">Justificativa:</p>
                      <p className="text-muted-foreground italic">
                        &quot;{metadata.reason?.substring(0, 80)}
                        {metadata.reason?.length > 80 ? '...' : ''}&quot;
                      </p>
                    </div>

                    {issues.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-2">Pendências Ignoradas:</p>
                        <div className="flex flex-wrap gap-2">
                          {issues.map((iss: any, idx: number) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-[10px] bg-red-50 text-red-700 border-red-200"
                            >
                              {iss.rule}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-500" />
            Eventos de Aprovação da Diretoria (G3)
          </CardTitle>
          <CardDescription>
            Histórico de submissões, aprovações, recusas e overrides do Gate G3 (Aprovação
            Diretoria).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {auditEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum evento de Aprovação da Diretoria (G3) encontrado.
            </p>
          ) : (
            <div className="space-y-4">
              {auditEvents.map((ev) => {
                const metadata = (ev.metadata as any) || {}
                const proj = ev.projects
                return (
                  <div key={ev.id} className="border rounded-md p-4 space-y-3 bg-muted/20">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-sm">
                          {proj?.name}{' '}
                          <span className="text-muted-foreground font-normal">
                            ({proj?.clients?.name})
                          </span>
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Por{' '}
                          <span className="font-medium text-foreground">
                            {ev.users?.full_name || 'Desconhecido'}
                          </span>{' '}
                          em {formatDateBR(ev.created_at)} às{' '}
                          {new Date(ev.created_at).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <StatusBadge category="g3" status={ev.event_type} showIcon />
                    </div>

                    {metadata.version && (
                      <p className="text-xs text-muted-foreground">
                        Versão do Paper: <span className="font-medium">{metadata.version}</span>
                      </p>
                    )}

                    {metadata.comment && (
                      <div className="bg-background border rounded p-3 text-sm">
                        <p className="font-medium mb-1">Comentário:</p>
                        <p className="text-muted-foreground italic">
                          &quot;{metadata.comment}&quot;
                        </p>
                      </div>
                    )}

                    {metadata.reason && (
                      <div className="bg-background border rounded p-3 text-sm">
                        <p className="font-medium mb-1">Justificativa:</p>
                        <p className="text-muted-foreground italic">
                          &quot;{metadata.reason}&quot;
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
