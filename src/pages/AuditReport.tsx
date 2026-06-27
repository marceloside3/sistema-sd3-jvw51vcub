import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase/client'
import { formatDateBR } from '@/lib/utils'
import { AlertCircle, Search } from 'lucide-react'

export default function AuditReport() {
  const [overrides, setOverrides] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  useEffect(() => {
    async function loadOverrides() {
      const { data, error } = await supabase
        .from('project_audit_log')
        .select(`
          id, created_at, metadata, 
          projects(id, name, clients(name)), 
          users:actor_user_id(full_name)
        `)
        .eq('event_type', 'g2_override')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setOverrides(data)
      }
    }
    loadOverrides()
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
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                        Exceção G2
                      </Badge>
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
    </div>
  )
}
