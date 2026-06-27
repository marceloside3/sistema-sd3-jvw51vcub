import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase/client'
import { formatDateBR } from '@/lib/utils'
import { AlertCircle, Search } from 'lucide-react'

const projectFiles = [
  'supabase/migrations/20260616145500_setup_foundation.sql',
  'supabase/migrations/20260616155500_apply_corrections.sql',
  'supabase/migrations/20260616160100_strict_schema_rls_audit.sql',
  'supabase/functions/_shared/cors.ts',
  'supabase/functions/validate-password/index.ts',
  'supabase/functions/validate-password/deno.json',
  'src/App.tsx',
  'src/main.tsx',
  'src/main.css',
  'index.html',
  'src/components/Layout.tsx',
  'src/components/dashboard/StatCards.tsx',
  'src/components/dashboard/GateAlerts.tsx',
  'src/components/dashboard/ProjectsTable.tsx',
  'src/components/project/GateTimeline.tsx',
  'src/components/project/OverrideDialog.tsx',
  'src/components/project/AiAgentSection.tsx',
  'src/components/layout/AppSidebar.tsx',
  'src/components/layout/AppHeader.tsx',
  'src/pages/NotFound.tsx',
  'src/pages/Index.tsx',
  'src/pages/ProjectDetails.tsx',
  'src/pages/AreaPage.tsx',
  'src/pages/AuditReport.tsx',
  'src/pages/Login.tsx',
  'src/hooks/use-auth.tsx',
  'src/hooks/use-mobile.tsx',
  'src/hooks/use-toast.ts',
  'src/stores/use-app-store.ts',
  'src/services/auth.ts',
  'src/lib/types.ts',
  'src/lib/utils.ts',
  'src/lib/supabase/client.ts',
  'src/lib/supabase/types.ts',
  'package.json',
  'vite.config.ts',
  'tailwind.config.ts',
  'postcss.config.js',
  'components.json',
  '.env',
  '.skip.config.json',
  'README.md',
  '.gitignore',
]

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
          <h1 className="text-3xl font-bold tracking-tight">Relatório de Auditoria</h1>
          <p className="text-muted-foreground mt-2">
            Auditoria de estrutura de projeto e arquivos do repositório.
          </p>
        </div>
        <Badge variant="secondary" className="px-4 py-2 text-sm font-medium">
          {projectFiles.length} Arquivos Analisados
        </Badge>
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

      <Card>
        <CardHeader>
          <CardTitle>Estrutura do Projeto</CardTitle>
          <CardDescription>
            Lista completa de arquivos monitorados e controlados pelo repositório baseada nos
            requisitos do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {projectFiles.map((file, i) => (
              <li
                key={i}
                className="text-sm font-mono text-muted-foreground bg-muted/40 p-3 rounded-lg border border-border/50 hover:bg-muted/80 transition-colors"
              >
                {file}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
