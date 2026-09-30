import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'

const jsonResponse = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

/**
 * Retired integration placeholder.
 * Keep this stable function slug so a future AI provider can be wired in without
 * changing the frontend integration point. No model provider or secrets are read here.
 */
Deno.serve((req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Método não permitido.' }, 405)
  return jsonResponse(
    { success: false, error: 'A IA de Benchmarks está desativada temporariamente.' },
    410,
  )
})
