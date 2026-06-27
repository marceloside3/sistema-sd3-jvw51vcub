import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { meetingId } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } },
    )

    const { data: meeting, error } = await supabase
      .from('handover_meetings')
      .select(`
        *,
        project:projects(name, project_code),
        participants:handover_meeting_participants(user:users(email, full_name))
      `)
      .eq('id', meetingId)
      .single()

    if (error || !meeting) {
      return new Response(JSON.stringify({ error: 'Meeting not found' }), {
        status: 404,
        headers: corsHeaders,
      })
    }

    const startDate = new Date(meeting.scheduled_at)
    const endDate = new Date(startDate.getTime() + meeting.duration_minutes * 60000)

    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }

    const escapeText = (text: string) => {
      return (text || '')
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n')
    }

    const attendees = meeting.participants
      .map((p: any) => `ATTENDEE;RSVP=TRUE;CN=${p.user.full_name}:mailto:${p.user.email}`)
      .join('\n')

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Skip//SD3 OS//PT-BR
BEGIN:VEVENT
UID:${meeting.id}@sd3.com.br
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:Reunião de Passagem: ${escapeText(meeting.project?.name)}
DESCRIPTION:${escapeText(meeting.agenda)}
LOCATION:${escapeText(meeting.location_or_link)}
${attendees}
END:VEVENT
END:VCALENDAR`

    return new Response(icsContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="reuniao-passagem-${meeting.project?.project_code || 'projeto'}.ics"`,
      },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
