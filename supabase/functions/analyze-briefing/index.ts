import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface BriefingAnalysisPayload {
  projectId?: string
  projectName?: string
  clientName?: string
  description?: string
  startDate?: string
  endDate?: string
  areas?: string[]
  briefingData?: Record<string, unknown>
}

interface AnalysisResult {
  resumo?: string
  sentimento_geral?: 'positivo' | 'neutro' | 'atencao' | 'critico'
  pontos_positivos?: string[]
  campos_faltantes?: string[]
  inconsistencias?: string[]
  riscos?: string[]
  sugestoes?: string[]
}

const jsonResponse = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const MODEL = 'gemini-3.8-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

function buildPrompt(payload: BriefingAnalysisPayload): string {
  const areas =
    Array.isArray(payload.areas) && payload.areas.length > 0
      ? payload.areas.join(', ')
      : 'Não informadas'

  const briefing =
    payload.briefingData && typeof payload.briefingData === 'object'
      ? Object.entries(payload.briefingData)
          .map(([key, value]) => `- ${key}: ${String(value ?? '').trim() || '[EM BRANCO]'}`)
          .join('\n')
      : 'Nenhum campo de briefing detalhado fornecido.'

  return `Você é um diretor sênior de operações e planejamento de uma agência especializada em trade marketing, ativações, ponto de venda e execução em campo (Sistema Side3). Analise o briefing abaixo e produza um diagnóstico claro, fundamentado e acionável.

DADOS DO PROJETO
- Nome: ${payload.projectName || 'Não informado'}
- Cliente: ${payload.clientName || 'Não informado'}
- Período: ${payload.startDate || 'Não informado'} até ${payload.endDate || 'Não informado'}
- Áreas envolvidas: ${areas}
- Descrição/escopo: ${payload.description || 'Não informado'}

BRIEFING
${briefing}

AVALIE
- Prontidão, clareza e coerência do briefing.
- Informações faltantes relevantes para as áreas envolvidas.
- Conflitos de escopo, datas, entregáveis ou responsabilidades.
- Riscos operacionais, de prazo/SLA, orçamento ou retrabalho.
- Melhorias práticas para completar o briefing e reduzir riscos.

Não invente informações. Diferencie fato informado de inferência. Use sentimento_geral como classificação da prontidão do briefing: positivo, neutro, atencao ou critico.

Responda exclusivamente com JSON válido, sem Markdown, no formato:
{
  "resumo": "Uma ou duas frases",
  "sentimento_geral": "neutro",
  "pontos_positivos": ["..."],
  "campos_faltantes": ["..."],
  "inconsistencias": ["..."],
  "riscos": ["..."],
  "sugestoes": ["..."]
}`
}

function parseCandidateText(raw: string): AnalysisResult {
  let text = raw.trim()
  if (text.startsWith('```')) {
    text = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim()
  }

  const parsed = JSON.parse(text) as AnalysisResult
  const allowedSentiments = new Set(['positivo', 'neutro', 'atencao', 'critico'])
  if (parsed.sentimento_geral && !allowedSentiments.has(parsed.sentimento_geral)) {
    parsed.sentimento_geral = 'neutro'
  }

  for (const key of [
    'pontos_positivos',
    'campos_faltantes',
    'inconsistencias',
    'riscos',
    'sugestoes',
  ] as const) {
    if (parsed[key] !== undefined && !Array.isArray(parsed[key])) {
      throw new Error(`Formato de resposta inválido: ${key} precisa ser uma lista.`)
    }
  }

  return parsed
}

function getGoogleErrorDetails(error: any): { code?: string; reason?: string; message?: string } {
  const details = Array.isArray(error?.details) ? error.details : []
  const errorInfo = details.find((item: any) => item?.reason || item?.metadata?.service)
  const status = typeof error?.status === 'string' ? error.status : undefined
  return {
    code: status,
    reason: typeof errorInfo?.reason === 'string' ? errorInfo.reason : undefined,
    message: typeof error?.message === 'string' ? error.message : undefined,
  }
}

async function callGemini(apiKey: string, prompt: string): Promise<AnalysisResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            { text: 'Analise briefings de trade marketing e responda no formato JSON solicitado.' },
          ],
        },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      }),
      signal: controller.signal,
    })

    const responseText = await response.text()
    let responseJson: any
    try {
      responseJson = JSON.parse(responseText)
    } catch {
      responseJson = null
    }

    if (!response.ok) {
      const details = getGoogleErrorDetails(responseJson?.error)
      // Log only metadata. Never log the API key, prompt, or briefing content.
      console.error('[analyze-briefing] Gemini request failed', {
        httpStatus: response.status,
        code: details.code,
        reason: details.reason,
      })

      const diagnostic = [
        `Google Gemini respondeu HTTP ${response.status}.`,
        details.code ? `Código: ${details.code}.` : '',
        details.reason ? `Motivo: ${details.reason}.` : '',
        details.message ? `Detalhe: ${details.message}` : '',
      ]
        .filter(Boolean)
        .join(' ')
      throw new Error(diagnostic || 'Falha na autenticação com o Google Gemini.')
    }

    const candidateText = responseJson?.candidates?.[0]?.content?.parts
      ?.map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
      .filter(Boolean)
      .join('\n')

    if (!candidateText) {
      throw new Error('O Gemini retornou uma resposta vazia. Tente novamente.')
    }

    return parseCandidateText(candidateText)
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('A solicitação ao Google Gemini excedeu o tempo limite. Tente novamente.')
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Método não permitido.' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Configuração do Supabase incompleta na Edge Function.' }, 500)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Cabeçalho de autorização ausente.' }, 401)

    const token = authHeader.replace(/^Bearer\s+/i, '')
    const admin = createClient(supabaseUrl, serviceRoleKey)
    const {
      data: { user },
      error: authError,
    } = await admin.auth.getUser(token)
    if (authError || !user) {
      return jsonResponse({ error: 'Sessão inválida ou expirada. Faça login novamente.' }, 401)
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')?.trim() || ''
    if (!apiKey) {
      return jsonResponse(
        { error: 'Secret GEMINI_API_KEY ausente nos secrets de produção do Supabase.' },
        500,
      )
    }
    const body: BriefingAnalysisPayload = await req.json().catch(() => ({}))
    if (!body.projectId) {
      return jsonResponse({ error: 'ID do projeto é obrigatório para analisar o briefing.' }, 400)
    }

    // The user token is used for the project read so the project's RLS remains enforced.
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: projectData, error: projectError } = await userClient
      .from('projects')
      .select(
        'id, name, description, start_date, end_date, briefing_data, client:clients(name), areas:project_areas(area:areas(name))',
      )
      .eq('id', body.projectId)
      .maybeSingle()

    if (projectError) {
      console.error('[analyze-briefing] Project read failed', { code: projectError.code })
      return jsonResponse(
        {
          error:
            'Não foi possível ler o projeto para análise. Verifique seu acesso e tente novamente.',
        },
        403,
      )
    }
    if (!projectData)
      return jsonResponse({ error: 'Projeto não encontrado ou sem permissão de acesso.' }, 404)

    const areaNames = Array.isArray((projectData as any).areas)
      ? (projectData as any).areas.map((item: any) => item?.area?.name).filter(Boolean)
      : []
    const enrichedPayload: BriefingAnalysisPayload = {
      projectId: projectData.id,
      projectName: projectData.name || body.projectName,
      clientName: (projectData as any)?.client?.name || body.clientName,
      description: projectData.description || body.description,
      startDate: projectData.start_date || body.startDate,
      endDate: projectData.end_date || body.endDate,
      areas: areaNames.length ? areaNames : body.areas,
      briefingData: (projectData.briefing_data as Record<string, unknown>) || body.briefingData,
    }

    const analysis = await callGemini(apiKey, buildPrompt(enrichedPayload))

    return jsonResponse({
      success: true,
      data: {
        resumo: analysis.resumo || '',
        sentimento_geral: analysis.sentimento_geral || 'neutro',
        pontos_positivos: Array.isArray(analysis.pontos_positivos) ? analysis.pontos_positivos : [],
        campos_faltantes: Array.isArray(analysis.campos_faltantes) ? analysis.campos_faltantes : [],
        inconsistencias: Array.isArray(analysis.inconsistencias) ? analysis.inconsistencias : [],
        riscos: Array.isArray(analysis.riscos) ? analysis.riscos : [],
        sugestoes: Array.isArray(analysis.sugestoes) ? analysis.sugestoes : [],
      },
      analyzedAt: new Date().toISOString(),
      model: MODEL,
    })
  } catch (error: any) {
    console.error('[analyze-briefing] Request failed', {
      message: typeof error?.message === 'string' ? error.message : 'Unknown error',
    })
    return jsonResponse(
      {
        error:
          typeof error?.message === 'string'
            ? error.message
            : 'Erro inesperado ao processar a análise do briefing.',
      },
      502,
    )
  }
})
