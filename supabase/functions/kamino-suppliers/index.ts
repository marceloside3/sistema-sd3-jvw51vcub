import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

const jsonResponse = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const textOrNull = (value: unknown): string | null => {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text || null
}

const digitsOrNull = (value: unknown): string | null => {
  const text = textOrNull(value)
  if (!text) return null
  const digits = text.replace(/\D/g, '')
  return digits || null
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const admin = createClient(supabaseUrl, serviceRoleKey)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Missing Authorization header' }, 401)

    const token = authHeader.replace(/^Bearer\s+/i, '')
    const {
      data: { user: caller },
      error: authError,
    } = await admin.auth.getUser(token)
    if (authError || !caller) return jsonResponse({ error: 'Unauthorized' }, 401)

    const { data: callerData, error: callerDataError } = await admin
      .from('users')
      .select(
        `profile:profiles(code, name, is_admin),
         areas:area_responsibles(area:areas(code, name))`,
      )
      .eq('id', caller.id)
      .maybeSingle()
    if (callerDataError) throw callerDataError

    const profile = (callerData as any)?.profile
    const areas = Array.isArray((callerData as any)?.areas) ? (callerData as any).areas : []
    const hasProductionArea = areas.some(
      (item: any) => item?.area?.code === 'producao' || item?.area?.name === 'Produção',
    )
    const isProductionProfile =
      profile?.code === 'producao' || String(profile?.name || '').toLowerCase() === 'produção'
    const canUseKamino = profile?.is_admin === true || hasProductionArea || isProductionProfile

    if (!canUseKamino) {
      return jsonResponse(
        { error: 'Apenas usuários da Produção podem consultar fornecedores da Kamino.' },
        403,
      )
    }

    const body = await req.json().catch(() => ({}))
    const action = body?.action || 'search'
    const apiUrl = (Deno.env.get('KAMINO_API_URL') || 'https://sandbox.kamino.tech').replace(
      /\/$/,
      '',
    )
    const appKey = Deno.env.get('KAMINO_API_APP') || ''
    const companyKey = Deno.env.get('KAMINO_API_CN') || ''
    const userIdKey = Deno.env.get('KAMINO_API_IDUSR') || ''
    const userKey = Deno.env.get('KAMINO_API_USR') || ''
    const hashKey = Deno.env.get('KAMINO_API_HASH') || ''

    if (!appKey || !companyKey || !userIdKey || !userKey || !hashKey) {
      return jsonResponse({ error: 'Credenciais da Kamino não configuradas no Supabase.' }, 500)
    }

    const kaminoHeaders = {
      accept: 'application/json',
      App: appKey,
      CN: companyKey,
      IDUsr: userIdKey,
      Usr: userKey,
      Hash: hashKey,
    }

    const callKamino = async (path: string, params: Record<string, string>) => {
      const url = new URL(`${apiUrl}${path}`)
      Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))
      const response = await fetch(url, { method: 'GET', headers: kaminoHeaders })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        const message =
          result?.Mensagem || result?.message || `Kamino respondeu HTTP ${response.status}.`
        throw new Error(message)
      }
      if (result?.Sucesso === false) {
        throw new Error(result?.Mensagem || 'A Kamino rejeitou a consulta.')
      }
      return result
    }

    const callKaminoPeople = (params: Record<string, string>) =>
      callKamino('/api/pessoa/lista/paginada', params)

    const rowsFromKamino = (result: any): any[] => {
      if (Array.isArray(result)) return result
      for (const key of ['Dados', 'data', 'items', 'Itens', 'result']) {
        if (Array.isArray(result?.[key])) return result[key]
      }
      if (
        result &&
        typeof result === 'object' &&
        (result.ID !== undefined || result.IDPlanoConta !== undefined)
      ) {
        return [result]
      }
      return []
    }

    const normalizeFinanceOption = (
      row: any,
      type: 'classification' | 'cost-center' | 'business-unit',
    ) => {
      const id = String(
        type === 'classification'
          ? (row?.ID ?? row?.IDPlanoConta ?? row?.NumeroID ?? '')
          : (row?.ID ?? ''),
      ).trim()
      const name = String(
        type === 'cost-center'
          ? row?.NomeExibicao || row?.Nome || ''
          : row?.Nome || row?.NomeExibicao || row?.NomePessoa || '',
      ).trim()
      return { id, name }
    }

    if (action === 'finance-options') {
      const [classificationResult, costCenterResult, businessUnitResult] = await Promise.all([
        callKamino('/api/financeiro/planoconta/lista', {
          ApenasAtivos: 'true',
          IDTipoPlanoConta: '1',
        }),
        callKamino('/api/financeiro/centrocusto/lista', { ApenasAtivos: 'true' }),
        callKamino('/api/financeiro/unidadenegocio/lista', { ApenasAtivos: 'true' }),
      ])

      const uniqueOptions = (
        rows: any[],
        type: 'classification' | 'cost-center' | 'business-unit',
      ) => {
        const seen = new Set<string>()
        return rows
          .map((row) => normalizeFinanceOption(row, type))
          .filter((option) => option.id && option.name)
          .filter((option) => {
            if (seen.has(option.id)) return false
            seen.add(option.id)
            return true
          })
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      }

      return jsonResponse({
        classifications: uniqueOptions(rowsFromKamino(classificationResult), 'classification'),
        costCenters: uniqueOptions(rowsFromKamino(costCenterResult), 'cost-center'),
        businessUnits: uniqueOptions(rowsFromKamino(businessUnitResult), 'business-unit'),
      })
    }

    if (action === 'search') {
      const search = textOrNull(body?.search) || ''
      const page = Math.min(Math.max(Number(body?.page) || 1, 1), 100000)
      const pageSize = Math.min(Math.max(Number(body?.pageSize) || 25, 1), 100)
      const params: Record<string, string> = {
        _pagina: String(page),
        _tamanhoPagina: String(pageSize),
        ApenasAtivos: 'true',
      }
      if (search) {
        if (/^\d+$/.test(search.replace(/\D/g, ''))) {
          params.CPFCNPJ = search.replace(/\D/g, '')
        } else {
          params.NomeContem = search
        }
      }

      const result = await callKaminoPeople(params)
      return jsonResponse({
        data: Array.isArray(result?.Dados) ? result.Dados : [],
        page: result?.PaginaAtual || page,
        pageSize: result?.TamanhoPagina || pageSize,
        totalRows: result?.TotalLinhas || 0,
        totalPages: result?.TotalPaginas || 1,
      })
    }

    if (action === 'import') {
      const kaminoId = Number(body?.kaminoId)
      if (!Number.isInteger(kaminoId) || kaminoId <= 0) {
        return jsonResponse({ error: 'kaminoId inválido.' }, 400)
      }

      const result = await callKaminoPeople({
        ID: String(kaminoId),
        _pagina: '1',
        _tamanhoPagina: '1',
        ApenasAtivos: 'true',
      })
      const person = Array.isArray(result?.Dados) ? result.Dados[0] : null
      if (!person) return jsonResponse({ error: 'Fornecedor não encontrado na Kamino.' }, 404)

      const document = digitsOrNull(person.CPFCNPJ)
      let existing: any = null
      const { data: byKaminoId, error: byKaminoIdError } = await admin
        .from('suppliers')
        .select('*')
        .eq('kamino_id', kaminoId)
        .limit(1)
      if (byKaminoIdError) throw byKaminoIdError
      existing = byKaminoId?.[0] || null

      if (!existing && document) {
        const { data: byDocument, error: byDocumentError } = await admin
          .from('suppliers')
          .select('*')
          .eq('document', document)
          .limit(1)
        if (byDocumentError) throw byDocumentError
        existing = byDocument?.[0] || null
      }

      if (existing) {
        if (!existing.kamino_id) {
          const { data: linked, error: linkError } = await admin
            .from('suppliers')
            .update({ kamino_id: kaminoId })
            .eq('id', existing.id)
            .select('*')
            .single()
          if (linkError) throw linkError
          existing = linked
        }
        return jsonResponse({ data: existing, alreadyImported: true })
      }

      const supplier = {
        kamino_id: kaminoId,
        document,
        supplier_type: Number(person.TipoEmpresa) === 1 ? 'PF' : 'PJ',
        name:
          textOrNull(person.NomeExibicao || person.NomeFantasia || person.Nome) ||
          `Fornecedor ${kaminoId}`,
        phone: textOrNull(person.TelefonePrincipal || person.Telefone || person.Celular),
        email: textOrNull(person.EmailPrincipal || person.Email),
        cep: digitsOrNull(person.CEP),
        street: textOrNull(person.Logradouro),
        number: textOrNull(person.Nro),
        complement: textOrNull(person.Complemento),
        neighborhood: textOrNull(person.Bairro),
        city: textOrNull(person.Cidade),
        uf: textOrNull(person.UF),
        bank: textOrNull(person.NomeBancoPix || person.NomeBanco),
        pix_key: textOrNull(person.ChavePix),
      }

      const { data: inserted, error: insertError } = await admin
        .from('suppliers')
        .insert(supplier)
        .select('*')
        .single()
      if (insertError) throw insertError

      return jsonResponse({ data: inserted, alreadyImported: false }, 201)
    }

    return jsonResponse({ error: 'Ação inválida.' }, 400)
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error ? error.message : 'Erro inesperado na integração com a Kamino.',
      },
      500,
    )
  }
})
