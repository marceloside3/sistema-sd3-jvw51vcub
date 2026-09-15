import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const jsonResponse = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ message: 'Método não permitido.' }, 405)

  try {
    const authorization = req.headers.get('Authorization') || ''
    const tokenMatch = authorization.match(/^Bearer\s+(\S+)$/i)
    if (!tokenMatch) return jsonResponse({ message: 'Autenticação obrigatória.' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const dashboardUrl = (Deno.env.get('DASHBOARD_FINANCE_BACKEND_URL') || '').replace(/\/$/, '')
    const integrationKey = Deno.env.get('DASHBOARD_FINANCE_INTEGRATION_KEY') || ''
    if (!supabaseUrl || !serviceRoleKey || !dashboardUrl || !integrationKey) {
      return jsonResponse({ message: 'Integração financeira não configurada no backend.' }, 500)
    }

    const admin = createClient(supabaseUrl, serviceRoleKey)
    const {
      data: { user: caller },
      error: authError,
    } = await admin.auth.getUser(tokenMatch[1])
    if (authError || !caller) return jsonResponse({ message: 'Sessão inválida ou expirada.' }, 401)

    const { data: callerData, error: callerError } = await admin
      .from('users')
      .select(
        `id, full_name,
         profile:profiles(code, name, is_admin),
         areas:area_responsibles(area:areas(code, name))`,
      )
      .eq('id', caller.id)
      .maybeSingle()
    if (callerError || !callerData) {
      return jsonResponse({ message: 'Não foi possível validar o usuário do Sistema Side3.' }, 403)
    }

    const profile = Array.isArray((callerData as any).profile)
      ? (callerData as any).profile[0]
      : (callerData as any).profile
    const areaRows = Array.isArray((callerData as any).areas) ? (callerData as any).areas : []
    const isProductionProfile =
      profile &&
      (profile.code === 'producao' || String(profile.name || '').toLowerCase() === 'produção')
    const hasProductionArea = areaRows.some((row: any) => {
      const area = Array.isArray(row?.area) ? row.area[0] : row?.area
      return (
        area && (area.code === 'producao' || String(area.name || '').toLowerCase() === 'produção')
      )
    })
    if (!(profile?.is_admin === true || isProductionProfile || hasProductionArea)) {
      return jsonResponse(
        {
          message:
            'Apenas usuários com perfil ou área de Produção podem enviar itens ao Financeiro.',
        },
        403,
      )
    }

    const body = await req.json().catch(() => ({}))
    const response = await fetch(`${dashboardUrl}/backend/v1/side3/finance-requests`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: authorization,
        'X-Side3-Integration-Key': integrationKey,
      },
      body: JSON.stringify(body),
    })

    const result = await response.json().catch(() => ({
      message: 'Resposta inválida do Dashboard Financeiro.',
    }))
    return jsonResponse(result, response.status)
  } catch (error) {
    console.error('dashboard-finance bridge error', error)
    return jsonResponse({ message: 'Falha de comunicação com o Dashboard Financeiro.' }, 502)
  }
})
