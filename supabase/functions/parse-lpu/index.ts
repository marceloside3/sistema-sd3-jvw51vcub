import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import * as XLSX from 'npm:xlsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

function parseNumericValue(raw: unknown): number {
  if (typeof raw === 'number' && isFinite(raw)) {
    return raw
  }

  let str = String(raw ?? '0').trim()
  if (!str) return 0

  str = str.replace(/[^\d.,-]/g, '')

  const hasComma = str.includes(',')
  const hasDot = str.includes('.')

  if (hasComma && hasDot) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      str = str.replace(/\./g, '').replace(',', '.')
    } else {
      str = str.replace(/,/g, '')
    }
  } else if (hasComma) {
    str = str.replace(',', '.')
  }

  const parsed = parseFloat(str)
  return isFinite(parsed) ? parsed : 0
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const clientId = formData.get('clientId') as string | null

    if (!file || !clientId) {
      return new Response(JSON.stringify({ error: 'Arquivo ou clientId ausente' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    if (!file.name.endsWith('.xlsx')) {
      return new Response(JSON.stringify({ error: 'Apenas arquivos .xlsx são aceitos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet)

    const items = rows
      .map((row) => {
        const itemName = String(row['ITEM'] ?? row['Item'] ?? '').trim()
        const range = String(row['RANGE'] ?? row['Range'] ?? '').trim()
        const description = String(
          row['DESCRITIVO DO ITEM'] ?? row['Descritivo do Item'] ?? row['DESCRITIVO'] ?? '',
        ).trim()
        const rawValue = row['VALOR'] ?? row['Valor'] ?? 0
        const unitValue = parseNumericValue(rawValue)

        return {
          client_id: clientId,
          item_name: itemName,
          range: range || null,
          description: description || null,
          unit_value: unitValue,
        }
      })
      .filter((item) => item.item_name)

    if (items.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum item válido encontrado no arquivo' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    await supabase.from('client_lpu_items').delete().eq('client_id', clientId)

    const { error: insertError } = await supabase.from('client_lpu_items').insert(items)
    if (insertError) throw insertError

    const { error: updateError } = await supabase
      .from('clients')
      .update({ has_lpu: true })
      .eq('id', clientId)
    if (updateError) throw updateError

    return new Response(JSON.stringify({ success: true, count: items.length }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'Erro interno do servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
