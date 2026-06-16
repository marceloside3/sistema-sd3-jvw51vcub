import { useState } from 'react'
import { Bot, Sparkles, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function AiAgentSection({ projectId }: { projectId: string }) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [response, setResponse] = useState<string | null>(null)

  const handleProcess = () => {
    setIsProcessing(true)
    setResponse(null)

    // Simulate API Call delay
    setTimeout(() => {
      setIsProcessing(false)
      setResponse(
        JSON.stringify(
          {
            agent: 'Análise de Briefing',
            status: 'success',
            data: {
              sentiment: 'positive',
              missing_fields: ['brand_guidelines_link'],
              risk_assessment: 'low',
              suggested_budget_adjustment: '+15%',
            },
          },
          null,
          2,
        ),
      )
    }, 2000)
  }

  return (
    <Card className="border border-primary/20 bg-primary/5">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2 text-primary">
          <Bot className="h-5 w-5" />
          Agente de IA (Fase 1 Mock)
        </CardTitle>
        <Button
          size="sm"
          onClick={handleProcess}
          disabled={isProcessing}
          className="bg-primary/90 hover:bg-primary"
        >
          {isProcessing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {isProcessing ? 'Processando...' : 'Analisar Briefing'}
        </Button>
      </CardHeader>
      <CardContent>
        {response ? (
          <div className="bg-black/90 text-green-400 p-4 rounded-md font-mono text-sm overflow-x-auto shadow-inner animate-fade-in-up">
            <pre>{response}</pre>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground bg-background/50 p-4 rounded-md border border-dashed flex items-center justify-center h-32">
            Clique em "Analisar Briefing" para acionar o endpoint mock do Agente de IA.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
