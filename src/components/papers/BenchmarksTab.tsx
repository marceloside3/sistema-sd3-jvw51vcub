import { useState } from 'react'
import { Lightbulb, Plus, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase/client'

interface BenchmarkCardData {
  title: string
  metric: string
  description: string
}

interface BenchmarksTabProps {
  paper: any
  readOnly?: boolean
  onReload: () => void
}

const MARKET_CASES: BenchmarkCardData[] = [
  {
    title: 'Marca Alpha S.A.',
    metric: 'ROI +180%',
    description: 'Campanha integrada com foco em performance e branded content.',
  },
  {
    title: 'TechCorp Brasil',
    metric: 'CAC -42%',
    description: 'Estratégia de inbound marketing com automação de funil.',
  },
  {
    title: 'Banco Digital X',
    metric: 'NPS +35pts',
    description: 'Programa de fidelização com gamificação e personalização.',
  },
]

const CREATIVE_REFS: BenchmarkCardData[] = [
  {
    title: 'Manifesto Video',
    metric: "Hero's Journey",
    description: 'Narração épica com arco do herói para lançamento de marca.',
  },
  {
    title: 'Short-form UGC',
    metric: '4.8M views',
    description: 'Conteúdo gerado pelo usuário em formato curto vertical.',
  },
  {
    title: 'Interactive Story',
    metric: '2.1M plays',
    description: 'Storytelling interativo com escolhas do espectador.',
  },
]

const CHANNEL_INSIGHTS: BenchmarkCardData[] = [
  {
    title: 'TikTok',
    metric: '3.2% Engagement',
    description: 'Vídeos curtos com trends audio geram alto engajamento orgânico.',
  },
  {
    title: 'LinkedIn Ads',
    metric: 'CPL R$ 12,50',
    description: 'B2B com segmentação por cargo e empresa traz leads qualificados.',
  },
  {
    title: 'YouTube Shorts',
    metric: '1.8M reach',
    description: 'Formato vertical com CTA direto para conversão.',
  },
]

export function BenchmarksTab({ paper, readOnly, onReload }: BenchmarksTabProps) {
  const { toast } = useToast()
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set())

  const handleAddToPaper = async (card: BenchmarkCardData) => {
    if (!paper || readOnly) return

    const key = `${card.title}-${card.metric}`
    const prefix = `[Benchmark Case]: ${card.title} | ${card.metric} — ${card.description}`
    const current = paper.premises_restrictions || ''
    const newValue = current ? `${current}\n${prefix}` : prefix

    try {
      const { error } = await supabase
        .from('project_papers')
        .update({ premises_restrictions: newValue, updated_at: new Date().toISOString() })
        .eq('id', paper.id)

      if (error) throw error

      setAddedItems((prev) => new Set(prev).add(key))
      toast({
        title: 'Adicionado ao Paper',
        description: `${card.title} foi incluído nas Premissas e Restrições.`,
      })
      onReload()
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Não foi possível adicionar o benchmark.',
        variant: 'destructive',
      })
    }
  }

  const renderCard = (card: BenchmarkCardData) => {
    const key = `${card.title}-${card.metric}`
    const isAdded = addedItems.has(key)
    return (
      <Card key={key} className="flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            {card.title}
            <Badge variant="secondary" className="text-xs">
              {card.metric}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between gap-3">
          <p className="text-sm text-muted-foreground">{card.description}</p>
          <Button
            size="sm"
            variant={isAdded ? 'outline' : 'default'}
            disabled={readOnly || isAdded}
            onClick={() => handleAddToPaper(card)}
          >
            {isAdded ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1" /> Adicionado
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar ao Paper
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 mt-6">
      <div className="flex items-center gap-2 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3">
        <Lightbulb className="w-5 h-5 text-yellow-600 flex-shrink-0" />
        <span className="text-sm font-medium text-yellow-800">
          Sugestões mockadas (V2 terá IA real)
        </span>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Cases de Mercado</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{MARKET_CASES.map(renderCard)}</div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Referências Criativas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{CREATIVE_REFS.map(renderCard)}</div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Insights de Canais</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CHANNEL_INSIGHTS.map(renderCard)}
        </div>
      </div>
    </div>
  )
}
