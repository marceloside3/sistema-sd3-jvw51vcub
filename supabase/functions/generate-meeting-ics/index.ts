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
        participants:handover_meeting_participants(is_organizer, user:users(email, full_name))
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

    const foldLine = (line: string) => {
      if (line.length <= 75) return line
      let folded = line.substring(0, 75)
      let remaining = line.substring(75)
      while (remaining.length > 0) {
        folded += '\r\n ' + remaining.substring(0, 74)
        remaining = remaining.substring(74)
      }
      return folded
    }

    const organizerParticipant = meeting.participants.find((p: any) => p.is_organizer)
    const organizerLine = organizerParticipant
      ? `ORGANIZER;CN="${organizerParticipant.user.full_name}":mailto:${organizerParticipant.user.email}`
      : ''

    const attendeeLines = meeting.participants.map(
      (p: any) => `ATTENDEE;RSVP=TRUE;CN="${p.user.full_name}":mailto:${p.user.email}`,
    )

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'METHOD:REQUEST',
      'PRODID:-//Side3//SD3 OS//PT-BR',
      'BEGIN:VEVENT',
      `UID:${meeting.id}@sd3.com.br`,
      'SEQUENCE:0',
      `DTSTAMP:${formatDate(new Date())}`,
      `DTSTART:${formatDate(startDate)}`,
      `DTEND:${formatDate(endDate)}`,
      'TRANSP:OPAQUE',
      'CLASS:PUBLIC',
      `SUMMARY:Reunião de Passagem: ${escapeText(meeting.project?.name)}`,
      `DESCRIPTION:${escapeText(meeting.agenda)}`,
      `LOCATION:${escapeText(meeting.location_or_link)}`,
      organizerLine,
      ...attendeeLines,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].filter(Boolean)

    const icsContent = lines.map(foldLine).join('\r\n')

    return new Response(icsContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/calendar; charset=utf-8; method=REQUEST',
        'Content-Disposition': 'inline; filename="reuniao-passagem.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
