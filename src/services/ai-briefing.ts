import { supabase } from '@/lib/supabase/client'

export interface BriefingAnalysisRequest {
  projectId: string
  projectName?: string
  clientName?: string
  description?: string
  startDate?: string
  endDate?: string
  areas?: string[]
  briefingData?: Record<string, unknown>
}

export type SentimentType = 'positivo' | 'neutro' | 'atencao' | 'critico'

export interface BriefingAnalysisData {
  resumo?: string
  sentimento_geral: SentimentType
  pontos_positivos: string[]
  campos_faltantes: string[]
  inconsistencias: string[]
  riscos: string[]
  sugestoes: string[]
}

export interface BriefingAnalysisResponse {
  success: boolean
  data?: BriefingAnalysisData
  analyzedAt?: string
  model?: string
  error?: string
}

export async function analyzeProjectBriefing(
  payload: BriefingAnalysisRequest,
): Promise<BriefingAnalysisData> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token

  if (!token) {
    throw new Error('Sessão de usuário não encontrada. Faça login para continuar.')
  }

  const { data, error } = await supabase.functions.invoke<BriefingAnalysisResponse>(
    'analyze-briefing',
    {
      body: payload,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  if (error) {
    // supabase.functions.invoke encapsula erros HTTP no campo error
    let message = error.message || 'Falha na comunicação com a IA de briefing.'
    try {
      if (typeof (error as any)?.context?.json === 'function') {
        const bodyJson = await (error as any).context.json()
        if (bodyJson?.error) {
          message = bodyJson.error
        }
      } else if (typeof (error as any)?.context?.text === 'function') {
        const bodyText = await (error as any).context.text()
        try {
          const parsed = JSON.parse(bodyText)
          if (parsed?.error) message = parsed.error
        } catch {
          if (bodyText) message = bodyText
        }
      }
    } catch {
      // fallback para message original
    }
    throw new Error(message)
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  if (!data?.data) {
    throw new Error('Resposta inválida do serviço de IA do Gemini.')
  }

  return data.data
}
