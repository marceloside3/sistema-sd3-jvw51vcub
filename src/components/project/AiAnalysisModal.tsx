import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertTriangle, Lightbulb, Sparkles } from 'lucide-react'

export function AiAnalysisModal({ children }: { children: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            IA #1 — Análise de Briefing
            <Badge
              variant="secondary"
              className="ml-2 bg-purple-100 text-purple-700 hover:bg-purple-100"
            >
              MOCK
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-md text-sm flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <p>
              Este é um ambiente de demonstração. A integração real com IA será disponibilizada na
              Fase 13 do projeto.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="bg-green-50 border border-green-100 p-4 rounded-lg">
              <h4 className="flex items-center gap-2 font-medium text-green-800 mb-2">
                <CheckCircle2 className="w-4 h-4" />
                Pontos Positivos
              </h4>
              <ul className="text-sm text-green-700 list-disc list-inside ml-4 space-y-1">
                <li>Público-alvo bem definido e segmentado.</li>
                <li>Objetivos da campanha estão claros e mensuráveis.</li>
                <li>Orçamento compatível com as entregas solicitadas.</li>
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg">
              <h4 className="flex items-center gap-2 font-medium text-amber-800 mb-2">
                <AlertTriangle className="w-4 h-4" />
                Pontos de Atenção
              </h4>
              <ul className="text-sm text-amber-700 list-disc list-inside ml-4 space-y-1">
                <li>Prazo de entrega da criação está muito apertado (SLA em risco).</li>
                <li>Faltam referências visuais (moodboard) para a equipe de arte.</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
              <h4 className="flex items-center gap-2 font-medium text-blue-800 mb-2">
                <Lightbulb className="w-4 h-4" />
                Sugestões da IA
              </h4>
              <ul className="text-sm text-blue-700 list-disc list-inside ml-4 space-y-1">
                <li>Solicitar ao cliente exemplos de campanhas concorrentes que ele admira.</li>
                <li>Considerar incluir a área de "Influs" dado o foco em público jovem.</li>
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
