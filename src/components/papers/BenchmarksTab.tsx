import { Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface BenchmarksTabProps {
  project: any
  paper: any
  readOnly?: boolean
  canEdit?: boolean
  onReload: () => void
}

/**
 * Placeholder for the Benchmarks AI integration.
 * Keep this component as the stable integration point when Side3 selects a replacement AI.
 * Existing Paper content is stored separately and is intentionally not modified here.
 */
export function BenchmarksTab(_props: BenchmarksTabProps) {
  return (
    <div className="mt-6 space-y-6">
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 via-white to-indigo-50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white p-2 text-purple-700 shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Benchmarks</CardTitle>
              <CardDescription>
                Espaço reservado para a próxima solução de inteligência artificial.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-zinc-700">
          <p>
            A integração de IA e as buscas externas desta aba foram retiradas temporariamente.
            Nenhuma chamada ao Gemini ou a outro provedor é feita por este ambiente.
          </p>
          <p>
            Quando a nova IA for definida, esta aba será o ponto de integração. Conteúdos que já
            foram salvos dentro dos Papers permanecem intactos.
          </p>
          <Badge variant="outline" className="border-purple-300 text-purple-800">
            Preparado para nova integração
          </Badge>
        </CardContent>
      </Card>
    </div>
  )
}
