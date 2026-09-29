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

// Modelos ordenados com foco em estabilidade e suporte atual
// Prioriza gemini-2.5-flash (confirmado funcionando com chaves AQ.) e variantes atuais;
// gemini-2.0-flash fica APENAS como última opção fallback.
const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
  'gemini-1.5-flash',
  'gemini-2.0-flash',
]

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

interface AttemptLog {
  model: string
  endpoint: string
  authMethod: string
  status: number | string
  details?: string
}

async function callGemini(
  apiKey: string,
  prompt: string,
): Promise<{ analysis: AnalysisResult; modelUsed: string }> {
  const attempts: AttemptLog[] = []
  const sanitizedKeySnippet = apiKey ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : '[vazio]'
  const isAqKey = apiKey.startsWith('AQ.')

  console.log(
    `[analyze-briefing] Iniciando análise de briefing com chave Gemini (formato ${isAqKey ? 'AQ.' : 'padrão'}, prefixo/sufixo: ${sanitizedKeySnippet})`,
  )

  // Prepara o corpo padrão da API nativa / express mode
  const nativeRequestBody = {
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

  // Prepara o corpo para o endpoint OpenAI-compatible caso seja testado
  const openaiRequestBody = {
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.2,
    response_format: { type: 'json_object' },
  }

  for (const model of CANDIDATE_MODELS) {
    // Definimos os planos de requisição para cada modelo:
    // 1. generativelanguage v1beta nativo com header x-goog-api-key (recomendado oficial Google)
    // 2. generativelanguage v1beta nativo com query param ?key=
    // 3. generativelanguage v1beta nativo com Authorization: Bearer
    // 4. generativelanguage v1 (não v1beta) com x-goog-api-key
    // 5. aiplatform express mode (Vertex AI Express Mode, padrão de chaves AQ.) com ?key=
    // 6. aiplatform express mode com x-goog-api-key
    // 7. generativelanguage v1beta OpenAI-compatible endpoint (/openai/chat/completions) com Authorization: Bearer
    interface Strategy {
      name: string
      url: string
      headers: Record<string, string>
      body: unknown
      isOpenAiShape?: boolean
    }

    const strategies: Strategy[] = [
      {
        name: 'generativelanguage v1beta (x-goog-api-key)',
        url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: nativeRequestBody,
      },
      {
        name: 'generativelanguage v1beta (query ?key=)',
        url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        headers: {
          'Content-Type': 'application/json',
        },
        body: nativeRequestBody,
      },
      {
        name: 'generativelanguage v1beta (Authorization Bearer)',
        url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: nativeRequestBody,
      },
      {
        name: 'generativelanguage v1 (x-goog-api-key)',
        url: `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`,
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: nativeRequestBody,
      },
      {
        name: 'aiplatform express mode (query ?key=)',
        url: `https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        headers: {
          'Content-Type': 'application/json',
        },
        body: nativeRequestBody,
      },
      {
        name: 'aiplatform express mode (x-goog-api-key)',
        url: `https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:generateContent`,
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: nativeRequestBody,
      },
      {
        name: 'generativelanguage openai-compatible (Bearer)',
        url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: {
          ...openaiRequestBody,
          model,
        },
        isOpenAiShape: true,
      },
    ]

    for (const strategy of strategies) {
      const attemptEntry: AttemptLog = {
        model,
        endpoint: strategy.url.split('?')[0],
        authMethod: strategy.name,
        status: 'pendente',
      }

      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 12000)

        const response = await fetch(strategy.url, {
          method: 'POST',
          headers: strategy.headers,
          body: JSON.stringify(strategy.body),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        attemptEntry.status = response.status

        const resText = await response.text()
        let resJson: any = null
        try {
          resJson = JSON.parse(resText)
        } catch {
          resJson = null
        }

        if (response.ok) {
          console.log(
            `[analyze-briefing] SUCESSO! Modelo: ${model} | Estratégia: ${strategy.name} | Status: ${response.status}`,
          )

          let candidateText = ''
          if (strategy.isOpenAiShape) {
            candidateText = resJson?.choices?.[0]?.message?.content || ''
          } else {
            candidateText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text || ''
          }

          if (!candidateText) {
            console.warn(`[analyze-briefing] Resposta vazia da API do Gemini no modelo ${model}.`)
            attemptEntry.details = 'Resposta sem texto de candidato'
            attempts.push(attemptEntry)
            continue
          }

          const parsed: AnalysisResult = JSON.parse(cleanJsonText(candidateText))
          return { analysis: parsed, modelUsed: model }
        }

        // Falha HTTP (ex: 401, 403, 404, 429)
        const errorMsg =
          resJson?.error?.message ||
          resJson?.message ||
          `HTTP ${response.status} (${resText.slice(0, 160)})`

        attemptEntry.details = errorMsg
        attempts.push(attemptEntry)

        console.warn(
          `[analyze-briefing] Tentativa falhou -> Modelo: ${model} | Auth/Endpoint: ${strategy.name} | Status: ${response.status} | Detalhes: ${errorMsg}`,
        )

        // Se for 429 (quota excedida), podemos continuar tentando outro endpoint/modelo ou registrar
      } catch (err: any) {
        const isTimeout = err?.name === 'AbortError'
        attemptEntry.status = isTimeout ? 'timeout' : 'network_error'
        attemptEntry.details = isTimeout ? 'Timeout de 12s excedido' : err?.message || String(err)
        attempts.push(attemptEntry)

        console.warn(
          `[analyze-briefing] Erro de rede/timeout -> Modelo: ${model} | Estratégia: ${strategy.name} | Erro: ${attemptEntry.details}`,
        )
      }
    }
  }

  // Se todas as tentativas falharem, monta relatório honesto e amigável em português
  const summaryLines = attempts
    .map(
      (a) =>
        `• [${a.model}] ${a.authMethod} → status ${a.status} (${a.details?.slice(0, 80) || 'sem detalhes'})`,
    )
    .slice(0, 10)
    .join('\n')

  const lastAttempt = attempts[attempts.length - 1]
  const lastStatus = lastAttempt ? `${lastAttempt.status}` : 'desconhecido'

  console.error(
    '[analyze-briefing] Todas as tentativas de conexão com a API do Google Gemini falharam:',
    attempts,
  )

  const detailedMessage =
    `Não foi possível concluir a análise com o Google Gemini após testar múltiplos modelos e métodos de autenticação.\n\n` +
    `Último status retornado pelo Google: ${lastStatus}.\n` +
    `Modelos testados: ${CANDIDATE_MODELS.join(', ')}.\n` +
    `Resumo das tentativas:\n${summaryLines}\n\n` +
    (isAqKey
      ? `Observação sobre chaves "AQ.": Se sua chave for da Agent Platform / Vertex AI Express Mode, certifique-se de que a API Generative Language / Vertex AI está habilitada no console do Google Cloud e sem restrições impeditivas de IP ou serviço.`
      : `Dica: Verifique se a chave de API em aistudio.google.com está ativa e com cotas disponíveis.`)

  throw new Error(detailedMessage)
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
    if (token === serviceRoleKey && serviceRoleKey.length > 0) {
      // Caller autorizado via service_role
    } else {
      const {
        data: { user },
        error: authError,
      } = await admin.auth.getUser(token)

      if (authError || !user) {
        return jsonResponse({ error: 'Sessão inválida ou expirada. Faça login novamente.' }, 401)
      }
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
    const { analysis, modelUsed } = await callGemini(geminiApiKey, prompt)

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
      model: modelUsed,
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
