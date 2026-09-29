import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  Loader2,
  RefreshCw,
  HelpCircle,
  ShieldAlert,
} from 'lucide-react'
import { analyzeProjectBriefing, BriefingAnalysisData, SentimentType } from '@/services/ai-briefing'

interface AiAnalysisModalProps {
  children: React.ReactNode
  projectId?: string
  projectName?: string
  clientName?: string
  description?: string
  startDate?: string
  endDate?: string
  areas?: string[]
  briefingData?: Record<string, unknown>
}

const SENTIMENT_CONFIG: Record<
  SentimentType,
  { label: string; badgeClass: string; bgClass: string; borderClass: string; textClass: string }
> = {
  positivo: {
    label: 'Pronto / Positivo',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    bgClass: 'bg-emerald-50/70',
    borderClass: 'border-emerald-200',
    textClass: 'text-emerald-900',
  },
  neutro: {
    label: 'Adequado / Neutro',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    bgClass: 'bg-blue-50/70',
    borderClass: 'border-blue-200',
    textClass: 'text-blue-900',
  },
  atencao: {
    label: 'Requer Atenção',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    bgClass: 'bg-amber-50/70',
    borderClass: 'border-amber-200',
    textClass: 'text-amber-900',
  },
  critico: {
    label: 'Crítico / Bloqueante',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    bgClass: 'bg-rose-50/70',
    borderClass: 'border-rose-200',
    textClass: 'text-rose-900',
  },
}

export function AiAnalysisModal({
  children,
  projectId,
  projectName,
  clientName,
  description,
  startDate,
  endDate,
  areas,
  briefingData,
}: AiAnalysisModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<BriefingAnalysisData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<Date | null>(null)

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open && !analysis && !loading) {
      runAnalysis()
    }
  }

  const runAnalysis = async () => {
    if (!projectId) {
      setError('ID do projeto não fornecido para análise.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await analyzeProjectBriefing({
        projectId,
        projectName,
        clientName,
        description,
        startDate,
        endDate,
        areas,
        briefingData,
      })
      setAnalysis(result)
      setLastAnalyzedAt(new Date())
    } catch (err: any) {
      console.error('Falha ao analisar briefing:', err)
      const rawMessage = err?.message || ''
      if (
        rawMessage.includes('não configurada no backend') ||
        rawMessage.includes('GEMINI_API_KEY')
      ) {
        setError(
          'A chave de integração com o Google Gemini não foi encontrada no servidor. Solicite ao administrador a configuração da GEMINI_API_KEY no painel de segredos.',
        )
      } else {
        setError(
          rawMessage ||
            'Não foi possível concluir a análise com o Google Gemini. Tente novamente mais tarde.',
        )
      }
    } finally {
      setLoading(false)
    }
  }

  const sentimentInfo = analysis?.sentimento_geral
    ? SENTIMENT_CONFIG[analysis.sentimento_geral] || SENTIMENT_CONFIG.neutro
    : null

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-4">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Análise de Briefing por IA
              <Badge
                variant="outline"
                className="ml-2 bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 border-purple-300 font-semibold text-[11px]"
              >
                Google Gemini
              </Badge>
            </DialogTitle>
            {analysis && !loading && (
              <Button
                variant="ghost"
                size="sm"
                onClick={runAnalysis}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
                title="Executar nova análise"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Reanalisar
              </Button>
            )}
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {projectName
              ? `Avaliação inteligente do briefing do projeto ${projectName}`
              : 'Avaliação inteligente das informações e consistência do briefing'}
            {lastAnalyzedAt && (
              <span className="block mt-0.5 text-[11px] text-gray-400">
                Última análise em{' '}
                {lastAnalyzedAt.toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="py-16 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center animate-pulse">
                <Sparkles className="w-7 h-7 text-purple-600 animate-spin" />
              </div>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Consultando o Google Gemini...</p>
              <p className="text-xs text-gray-500 mt-1 max-w-sm">
                Avaliando prontidão, identificando campos ausentes, riscos de SLA e gerando
                recomendações para as áreas.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-purple-700 font-medium">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processando análise detalhada...
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="py-8 space-y-4">
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-rose-600" />
              <div className="space-y-1">
                <p className="font-semibold">Não foi possível concluir a análise do briefing</p>
                <p className="text-xs text-rose-700">{error}</p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={runAnalysis} className="bg-purple-600 hover:bg-purple-700">
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar Novamente
              </Button>
            </div>
          </div>
        )}

        {analysis && !loading && (
          <div className="space-y-4 mt-2">
            {/* Resumo e Sentimento */}
            {sentimentInfo && (
              <div
                className={`p-4 rounded-xl border ${sentimentInfo.borderClass} ${sentimentInfo.bgClass} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                      Diagnóstico do Briefing:
                    </span>
                    <Badge
                      variant="outline"
                      className={`font-semibold ${sentimentInfo.badgeClass}`}
                    >
                      {sentimentInfo.label}
                    </Badge>
                  </div>
                  {analysis.resumo && (
                    <p className={`text-sm ${sentimentInfo.textClass} leading-relaxed`}>
                      {analysis.resumo}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Pontos Positivos */}
            {analysis.pontos_positivos && analysis.pontos_positivos.length > 0 && (
              <div className="bg-emerald-50/60 border border-emerald-100 p-4 rounded-xl">
                <h4 className="flex items-center gap-2 font-semibold text-emerald-900 text-sm mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Pontos Positivos do Briefing
                </h4>
                <ul className="text-xs text-emerald-800 list-disc list-inside space-y-1 pl-1">
                  {analysis.pontos_positivos.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Campos Faltantes */}
            {analysis.campos_faltantes && analysis.campos_faltantes.length > 0 && (
              <div className="bg-amber-50/70 border border-amber-200/80 p-4 rounded-xl">
                <h4 className="flex items-center gap-2 font-semibold text-amber-900 text-sm mb-2">
                  <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  Campos e Informações Ausentes
                </h4>
                <ul className="text-xs text-amber-800 list-disc list-inside space-y-1 pl-1">
                  {analysis.campos_faltantes.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Inconsistências */}
            {analysis.inconsistencias && analysis.inconsistencias.length > 0 && (
              <div className="bg-orange-50/70 border border-orange-200/80 p-4 rounded-xl">
                <h4 className="flex items-center gap-2 font-semibold text-orange-900 text-sm mb-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
                  Inconsistências Identificadas
                </h4>
                <ul className="text-xs text-orange-800 list-disc list-inside space-y-1 pl-1">
                  {analysis.inconsistencias.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Riscos */}
            {analysis.riscos && analysis.riscos.length > 0 && (
              <div className="bg-rose-50/60 border border-rose-200/70 p-4 rounded-xl">
                <h4 className="flex items-center gap-2 font-semibold text-rose-900 text-sm mb-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  Riscos de Execução & SLA
                </h4>
                <ul className="text-xs text-rose-800 list-disc list-inside space-y-1 pl-1">
                  {analysis.riscos.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sugestões da IA */}
            {analysis.sugestoes && analysis.sugestoes.length > 0 && (
              <div className="bg-indigo-50/60 border border-indigo-100 p-4 rounded-xl">
                <h4 className="flex items-center gap-2 font-semibold text-indigo-900 text-sm mb-2">
                  <Lightbulb className="w-4 h-4 text-indigo-600 shrink-0" />
                  Sugestões de Melhoria (Gemini)
                </h4>
                <ul className="text-xs text-indigo-800 list-disc list-inside space-y-1 pl-1">
                  {analysis.sugestoes.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
