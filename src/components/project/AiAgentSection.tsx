import { useState } from 'react'
import { Bot, Sparkles, Loader2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { analyzeProjectBriefing } from '@/services/ai-briefing'

export function AiAgentSection({ projectId }: { projectId: string }) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [response, setResponse] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleProcess = async () => {
    setIsProcessing(true)
    setResponse(null)
    setError(null)

    try {
      const data = await analyzeProjectBriefing({ projectId })
      setResponse(
        JSON.stringify(
          {
            agent: 'Análise de Briefing (Google Gemini)',
            status: 'success',
            data,
          },
          null,
          2,
        ),
      )
    } catch (err: any) {
      console.error('Erro na análise do agente:', err)
      setError(err?.message || 'Falha ao processar análise do briefing.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card className="border border-purple-200 bg-purple-50/20">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2 text-purple-900">
          <Bot className="h-5 w-5 text-purple-600" />
          Agente de IA — Análise de Briefing (Google Gemini)
        </CardTitle>
        <Button
          size="sm"
          onClick={handleProcess}
          disabled={isProcessing}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          {isProcessing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {isProcessing ? 'Processando com Gemini...' : 'Analisar Briefing'}
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="p-3 mb-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {response ? (
          <div className="bg-zinc-950 text-emerald-400 p-4 rounded-xl font-mono text-xs overflow-x-auto shadow-inner">
            <pre>{response}</pre>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground bg-background/50 p-4 rounded-xl border border-dashed border-zinc-300 flex items-center justify-center h-28 text-center">
            Clique em "Analisar Briefing" para acionar o Google Gemini e inspecionar a resposta
            estruturada.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
