import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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
