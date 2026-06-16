import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { password, email, fullName } = await req.json()
    const errors: string[] = []

    if (!password || password.length < 8) {
      errors.push('A senha deve ter pelo menos 8 caracteres')
    }
    if (password && !/[A-Z]/.test(password)) {
      errors.push('A senha deve conter pelo menos 1 letra maiúscula')
    }
    if (password && !/[a-z]/.test(password)) {
      errors.push('A senha deve conter pelo menos 1 letra minúscula')
    }
    if (password && !/[0-9]/.test(password)) {
      errors.push('A senha deve conter pelo menos 1 número')
    }
    if (password && !/[!@#$%&*]/.test(password)) {
      errors.push('A senha deve conter pelo menos 1 caractere especial (!@#$%&*)')
    }

    if (password && email && password.toLowerCase().includes(email.toLowerCase().split('@')[0])) {
      errors.push('A senha não pode conter o email do usuário')
    }

    if (password && fullName) {
      const names = fullName
        .toLowerCase()
        .split(' ')
        .filter((n: string) => n.length > 2)
      for (const name of names) {
        if (password.toLowerCase().includes(name)) {
          errors.push('A senha não pode conter partes do nome do usuário')
          break
        }
      }
    }

    if (errors.length > 0) {
      return new Response(
        JSON.stringify({
          error: 'validation_failed',
          fields: { password: errors },
        }),
        {
          status: 422,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
