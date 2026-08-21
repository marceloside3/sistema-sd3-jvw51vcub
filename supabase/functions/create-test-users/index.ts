import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface TestUser {
  email: string
  fullName: string
  profileId: string
  areaId: string
}

const TEST_USERS: TestUser[] = [
  {
    email: 'atendimento@side3.com.br',
    fullName: 'Atendimento',
    profileId: '9759c95f-3f4c-4143-8d96-315204eb65cf',
    areaId: '08bfa822-dd1d-48d9-956d-8d7840018e34',
  },
  {
    email: 'planejamento@side3.com.br',
    fullName: 'Planejamento',
    profileId: 'd8d419fb-f34e-455f-8db6-84a5956c44ca',
    areaId: 'a7f48b48-f9b6-40c3-88fc-b75bf626d1e5',
  },
  {
    email: 'criacao@side3.com.br',
    fullName: 'Criação',
    profileId: '798e6c10-f13d-4c8d-8435-57260ce98ea1',
    areaId: '88da6728-20b4-429b-8e34-498211507004',
  },
  {
    email: 'social@side3.com.br',
    fullName: 'Social',
    profileId: '6c5f454f-9762-4a6d-8086-7be658a69fb0',
    areaId: '5832b56b-6d3b-4dcb-8e5d-1fc21915f6ab',
  },
  {
    email: 'midia@side3.com.br',
    fullName: 'Mídia',
    profileId: '53597c85-f15e-4cb2-a6a2-6b4ee035d559',
    areaId: 'afe9afb8-337c-4318-a673-4d0abcc92b6b',
  },
  {
    email: 'influs@side3.com.br',
    fullName: 'Influs',
    profileId: '8f109f9d-ac13-453a-a5a5-1c93a663e2b0',
    areaId: 'e20df998-7dcb-4e80-ab62-051e161c1e1e',
  },
  {
    email: 'financeiro@side3.com.br',
    fullName: 'Financeiro',
    profileId: '1b36195a-0847-464a-8a08-52628b8ff07c',
    areaId: 'e5ef0d75-d712-471a-8a5a-3f68e2429b68',
  },
  {
    email: 'comercial@side3.com.br',
    fullName: 'Comercial',
    profileId: 'a2d49204-c482-4cd3-ab8f-8f8429c308c1',
    areaId: '36a3a24e-8daa-46f7-a319-41dfe3b93cd1',
  },
  {
    email: 'juridico@side3.com.br',
    fullName: 'Jurídico',
    profileId: '33279a72-45d3-476f-ab7a-f98a313487b8',
    areaId: 'b3251240-9bf4-40a8-9d27-6457ae5ca426',
  },
  {
    email: 'admrh@side3.com.br',
    fullName: 'Adm e RH',
    profileId: '734ae0ce-a74e-4e87-a78c-3b63c26709df',
    areaId: 'be6519bc-0929-4abe-bb5c-0e8761b53b73',
  },
  {
    email: 'cs@side3.com.br',
    fullName: 'Customer Success',
    profileId: '54973b25-d22a-45dc-9c70-e61379971762',
    areaId: '08bfa822-dd1d-48d9-956d-8d7840018e34',
  },
  {
    email: 'contabilidade@side3.com.br',
    fullName: 'Contabilidade',
    profileId: '15613582-ca76-47fc-aa3c-a7ff9a5e6704',
    areaId: '7b2116f7-0234-4572-927d-a617bebab07d',
  },
]

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://mbodfobpfvbqaomxnzfn.supabase.co'
  const serviceRoleKey =
    Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

  if (!serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'SERVICE_ROLE_KEY is missing' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const results = []

  for (const user of TEST_USERS) {
    const userLog: Record<string, unknown> = {
      email: user.email,
      fullName: user.fullName,
      status: 'started',
    }

    try {
      // 1. Check if user already exists in auth.users
      const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers()
      if (listError) {
        throw new Error(`Error listing auth users: ${listError.message}`)
      }

      let existingAuthUser = listData.users.find(
        (u) => u.email?.toLowerCase() === user.email.toLowerCase(),
      )
      let userId = existingAuthUser?.id

      // If user does not exist, create directly via auth.admin.createUser
      if (!existingAuthUser) {
        const { data: createdAuth, error: createAuthErr } =
          await supabaseAdmin.auth.admin.createUser({
            email: user.email,
            password: 'teste123',
            email_confirm: true,
            user_metadata: { full_name: user.fullName },
          })

        if (createAuthErr) {
          throw new Error(`admin.createUser failed: ${createAuthErr.message}`)
        }
        userId = createdAuth.user.id
        userLog.authCreated = true
      } else {
        userLog.calledInviteFunction = false
        userLog.message = 'User already existed in auth.users'
      }

      if (!userId) {
        throw new Error(`Could not find or create user_id for ${user.email}`)
      }

      userLog.userId = userId

      // 2. Ensure password is set to 'teste123' and email is confirmed
      const { error: updateAuthErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: 'teste123',
        email_confirm: true,
      })

      if (updateAuthErr) {
        throw new Error(`admin.updateUserById failed: ${updateAuthErr.message}`)
      }

      // 3. If finance profile, ensure is_finance = true on profiles table
      if (user.email === 'financeiro@side3.com.br') {
        const { error: profileErr } = await supabaseAdmin
          .from('profiles')
          .update({ is_finance: true, updated_at: new Date().toISOString() })
          .eq('id', user.profileId)

        if (profileErr) {
          console.warn('Error setting is_finance on profile:', profileErr.message)
        } else {
          userLog.profileFinanceUpdated = true
        }
      }

      // 4. Upsert public.users with profile_id
      const { error: upsertUserErr } = await supabaseAdmin.from('users').upsert(
        {
          id: userId,
          email: user.email,
          full_name: user.fullName,
          profile_id: user.profileId,
          is_active: true,
        },
        { onConflict: 'id' },
      )

      if (upsertUserErr) {
        throw new Error(`Error upserting public.users: ${upsertUserErr.message}`)
      }
      userLog.publicUserUpserted = true

      // 4. Before making this user principal for the area, demote any other user who is currently principal for this area
      const { error: demoteErr } = await supabaseAdmin
        .from('area_responsibles')
        .update({ is_principal: false, updated_at: new Date().toISOString() })
        .eq('area_id', user.areaId)
        .neq('user_id', userId)
        .eq('is_principal', true)

      if (demoteErr) {
        console.warn(
          `Demote existing principal warning for area ${user.areaId}:`,
          demoteErr.message,
        )
      }

      // Upsert area_responsibles (user_id, area_id, is_principal=true)
      const { data: existingResp, error: checkRespErr } = await supabaseAdmin
        .from('area_responsibles')
        .select('id, is_principal')
        .eq('user_id', userId)
        .eq('area_id', user.areaId)
        .maybeSingle()

      if (checkRespErr) {
        throw new Error(`Error checking area_responsibles: ${checkRespErr.message}`)
      }

      if (existingResp) {
        const { error: updateRespErr } = await supabaseAdmin
          .from('area_responsibles')
          .update({
            is_principal: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingResp.id)

        if (updateRespErr) {
          throw new Error(`Error updating area_responsibles: ${updateRespErr.message}`)
        }
        userLog.areaResponsibleUpdated = true
      } else {
        const { error: insertRespErr } = await supabaseAdmin.from('area_responsibles').insert({
          user_id: userId,
          area_id: user.areaId,
          is_principal: true,
        })

        if (insertRespErr) {
          throw new Error(`Error inserting area_responsibles: ${insertRespErr.message}`)
        }
        userLog.areaResponsibleInserted = true
      }

      userLog.status = 'success'
    } catch (err: any) {
      userLog.status = 'error'
      userLog.error = err.message || String(err)
    }

    results.push(userLog)
  }

  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
