import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user: caller },
      error: authError,
    } = await supabaseClient.auth.getUser(token)

    if (authError || !caller) {
      throw new Error('Unauthorized')
    }

    const { data: callerProfile } = await supabaseClient
      .from('users')
      .select('profiles(is_admin)')
      .eq('id', caller.id)
      .single()

    const isAdmin = (callerProfile as any)?.profiles?.is_admin
    if (!isAdmin) {
      throw new Error('Forbidden: Only admins can invite users')
    }

    const { email, full_name, profile_id, areas } = await req.json()

    // 1. Invite user
    const siteUrl =
      Deno.env.get('SITE_URL') ?? 'https://sistema-operacional-sd3-99b62--preview.goskip.app'
    const { data: inviteData, error: inviteError } =
      await supabaseClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${siteUrl}/auth/set-password`,
        data: { full_name, profile_id },
      })

    if (inviteError) throw inviteError

    const userId = inviteData.user.id

    // 2. Insert into public.users
    const { error: userError } = await supabaseClient.from('users').upsert({
      id: userId,
      email,
      full_name,
      profile_id,
      is_active: true,
    })

    if (userError) throw userError

    // 3. Insert areas
    if (areas && areas.length > 0) {
      const { error: areasError } = await supabaseClient.from('area_responsibles').insert(
        areas.map((a: any) => ({
          user_id: userId,
          area_id: a.area_id,
          is_principal: a.is_principal,
        })),
      )

      if (areasError) throw areasError
    }

    return new Response(JSON.stringify({ user: inviteData.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
