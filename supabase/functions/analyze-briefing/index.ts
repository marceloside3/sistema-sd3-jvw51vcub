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

const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash']

function buildSystemAndUserPrompt(payload: BriefingAnalysisPayload) {
  const areasList =
    Array.isArray(payload.areas) && payload.areas.length > 0
      ? payload.areas.join(', ')
      : 'Não informadas'

  const briefingEntries =
    payload.briefingData && typeof payload.briefingData === 'object'
      ? Object.entries(payload.briefingData)
          .map(([k, v]) => `- ${k}: ${String(v ?? '').trim() || '[EM BRANCO]'}`)
          .join('\n')
      : 'Nenhum campo de briefing detalhado fornecido.'

  const prompt = `Você é um diretor sênior de operações e planejamento de uma grande agência de publicidade e produção criativa (Sistema Side3).
Sua missão é analisar criteriosamente o briefing de um projeto publicitário enviado pelas equipes e identificar forças, lacunas, inconsistências e riscos operacionais/criativos.

DADOS DO PROJETO:
- Nome do Projeto: ${payload.projectName || 'Não informado'}
- Cliente: ${payload.clientName || 'Não informado'}
- Período: ${payload.startDate || 'Não informado'} até ${payload.endDate || 'Não informado'}
- Áreas envolvidas: ${areasList}
- Descrição / Escopo geral: ${payload.description || 'Não informada'}

CAMPOS ESPECÍFICOS DO BRIEFING:
${briefingEntries}

DIRETRIZES DE AVALIAÇÃO:
1. Resumo executivo (1 a 2 frases avaliando a prontidão do briefing).
2. Sentimento geral: "positivo" (briefing completo e claro), "neutro" (adequado com pequenos ajustes), "atencao" (faltam dados importantes ou prazos apertados) ou "critico" (inviável iniciar sem novas informações).
3. Pontos positivos: itens bem explicados, metas claras, referências sólidas, etc.
4. Campos faltantes: informações cruciais ausentes para as áreas envolvidas (ex: diretrizes de marca, links de referências, especificações de formato, target detalhado, aprovações, orçamentos).
5. Inconsistências: prazos incompatíveis com escopo, canais sem assets definidos, objetivos conflitantes.
6. Riscos: riscos de SLA, estouro de orçamento, refações criativas ou gargalos de produção.
7. Sugestões de melhoria: recomendações práticas e acionáveis para complementar o briefing e garantir o sucesso do projeto.

FORMATO OBRIGATÓRIO DE RESPOSTA:
Responda EXCLUSIVAMENTE em formato JSON válido com as seguintes chaves em português (sem markdown extra fora do JSON):
{
  "resumo": "Texto resumido em português",
  "sentimento_geral": "positivo" | "neutro" | "atencao" | "critico",
  "pontos_positivos": ["item 1", "item 2"],
  "campos_faltantes": ["item 1", "item 2"],
  "inconsistencias": ["item 1", "item 2"],
  "riscos": ["item 1", "item 2"],
  "sugestoes": ["item 1", "item 2"]
}`

  return prompt
}

function cleanJsonText(raw: string): string {
  let cleaned = raw.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim()
  }
  return cleaned
}

async function callGemini(apiKey: string, prompt: string): Promise<AnalysisResult> {
  let lastError: Error | null = null

  for (const model of GEMINI_MODELS) {
    // Para chaves AQ. ou AIza, generativelanguage aceita x-goog-api-key e ?key= na URL
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    }

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 25000)

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const resJson = await response.json().catch(() => ({}))

      if (!response.ok) {
        const errorObj = resJson?.error || {}
        const code = errorObj?.code || response.status
        const message = errorObj?.message || `Erro ${response.status} na API do Gemini.`
        const status = errorObj?.status || ''

        // Se a chave for inválida ou permissão negada, não adianta tentar outros modelos
        if (code === 400 && /API_KEY_INVALID|key not valid/i.test(message)) {
          throw new Error(
            'Chave de API do Google Gemini inválida ou expirada. Verifique as credenciais.',
          )
        }
        if (code === 403 || status === 'PERMISSION_DENIED') {
          throw new Error(
            'Acesso negado pela API do Google Gemini. Verifique a chave e permissões de cota.',
          )
        }
        if (code === 429 || status === 'RESOURCE_EXHAUSTED') {
          throw new Error(
            'Limite de requisições excedido na API do Google Gemini (quota). Tente novamente em instantes.',
          )
        }

        console.warn(`Tentativa com modelo ${model} falhou: [${code}] ${message}`)
        lastError = new Error(message)
        continue // tenta o próximo modelo
      }

      const candidateText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text || ''

      if (!candidateText) {
        throw new Error('A API do Gemini retornou uma resposta vazia.')
      }

      const parsed: AnalysisResult = JSON.parse(cleanJsonText(candidateText))
      return parsed
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        lastError = new Error('Tempo limite esgotado ao consultar a IA do Gemini (timeout de 25s).')
      } else {
        lastError = err instanceof Error ? err : new Error(String(err))
      }
      // Se já for erro específico de auth/quota, relança imediatamente
      if (
        lastError.message.includes('inválida') ||
        lastError.message.includes('Acesso negado') ||
        lastError.message.includes('Limite de requisições')
      ) {
        throw lastError
      }
    }
  }

  throw lastError || new Error('Não foi possível obter resposta dos modelos do Google Gemini.')
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Método não permitido.' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const admin = createClient(supabaseUrl, serviceRoleKey)

    let geminiApiKey =
      Deno.env.get('GEMINI_API_KEY')?.trim() ||
      Deno.env.get('GOOGLE_GEMINI_API_KEY')?.trim() ||
      Deno.env.get('GOOGLE_API_KEY')?.trim() ||
      ''

    // Fallback de contingência caso os segredos de ambiente Deno não tenham sincronizado:
    // busca a chave na tabela system_config do banco de dados (acessada com service_role)
    if (!geminiApiKey && admin) {
      try {
        const { data: dbSecret } = await admin
          .from('system_config')
          .select('key, value')
          .in('key', ['GEMINI_API_KEY', 'GOOGLE_GEMINI_API_KEY', 'GOOGLE_API_KEY'])
          .order('key')
          .limit(1)
          .maybeSingle()

        if (dbSecret?.value) {
          geminiApiKey = String(dbSecret.value).trim()
        }
      } catch (dbErr) {
        console.warn('Falha ao consultar fallback em system_config:', dbErr)
      }
    }

    if (!geminiApiKey) {
      return jsonResponse(
        {
          error:
            'Chave do Google Gemini (GEMINI_API_KEY) não configurada no backend. Contate o suporte ou configure o segredo GEMINI_API_KEY.',
        },
        500,
      )
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Cabeçalho de autorização ausente.' }, 401)
    }

    const token = authHeader.replace(/^Bearer\s+/i, '')

    // Permite chamada com token de usuário autenticado OU com a própria chave service_role (usada para smoke test/manutenção)
    let caller: any = null
    if (token === serviceRoleKey && serviceRoleKey.length > 0) {
      caller = { id: 'service-role-admin', role: 'service_role' }
    } else {
      const {
        data: { user },
        error: authError,
      } = await admin.auth.getUser(token)

      if (authError || !user) {
        return jsonResponse({ error: 'Sessão inválida ou expirada. Faça login novamente.' }, 401)
      }
      caller = user
    }

    const body: BriefingAnalysisPayload = await req.json().catch(() => ({}))

    // Se veio um projectId mas sem dados completos, busca direto no banco para garantir
    let enrichedPayload = { ...body }
    if (body.projectId) {
      const { data: projectData } = await admin
        .from('projects')
        .select(`
          id,
          name,
          description,
          start_date,
          end_date,
          briefing_data,
          client:clients(name),
          areas:project_areas(area:areas(name))
        `)
        .eq('id', body.projectId)
        .maybeSingle()

      if (projectData) {
        const clientName = (projectData as any)?.client?.name || enrichedPayload.clientName
        const areaNames = Array.isArray((projectData as any)?.areas)
          ? (projectData as any).areas.map((a: any) => a?.area?.name).filter(Boolean)
          : enrichedPayload.areas || []

        enrichedPayload = {
          projectId: projectData.id,
          projectName: projectData.name || enrichedPayload.projectName,
          clientName: clientName || enrichedPayload.clientName,
          description: projectData.description || enrichedPayload.description,
          startDate: projectData.start_date || enrichedPayload.startDate,
          endDate: projectData.end_date || enrichedPayload.endDate,
          areas: areaNames.length > 0 ? areaNames : enrichedPayload.areas,
          briefingData:
            (projectData.briefing_data as Record<string, unknown>) || enrichedPayload.briefingData,
        }
      }
    }

    const prompt = buildSystemAndUserPrompt(enrichedPayload)
    const analysis = await callGemini(geminiApiKey, prompt)

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
      model: 'google-gemini',
    })
  } catch (error) {
    console.error('Erro na análise de briefing via Gemini:', error)
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Erro inesperado ao processar análise com Google Gemini.',
      },
      500,
    )
  }
})
