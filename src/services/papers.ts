import { supabase } from '@/lib/supabase/client'

export async function getProjectPapers(projectId: string) {
  const { data, error } = await supabase
    .from('project_papers')
    .select('*')
    .eq('project_id', projectId)
    .order('version', { ascending: false })
  if (error) throw error
  return data
}

export async function createPaperVersion(projectId: string) {
  const { data, error } = await supabase.rpc('create_paper_version', { p_project_id: projectId })
  if (error) throw error
  return data
}

export async function updatePaper(paperId: string, payload: any) {
  const { data, error } = await supabase
    .from('project_papers')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', paperId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getProjectMeetings(projectId: string) {
  const { data, error } = await supabase
    .from('handover_meetings')
    .select(`
      *,
      participants:handover_meeting_participants(
        user_id,
        is_organizer,
        confirmed,
        user:users(full_name, email)
      )
    `)
    .eq('project_id', projectId)
    .order('scheduled_at', { ascending: false })
  if (error) throw error
  return data
}

export async function scheduleMeeting(
  projectId: string,
  scheduledAt: string,
  durationMinutes: number,
  location: string,
  agenda: string,
  participantIds: string[],
) {
  const { data, error } = await supabase.rpc('schedule_handover_meeting', {
    p_project_id: projectId,
    p_scheduled_at: scheduledAt,
    p_duration_minutes: durationMinutes,
    p_location: location,
    p_agenda: agenda,
    p_participant_ids: participantIds,
  })
  if (error) throw error
  return data
}

export async function updateMeeting(meetingId: string, payload: any) {
  const { data, error } = await supabase
    .from('handover_meetings')
    .update(payload)
    .eq('id', meetingId)
  if (error) throw error
  return data
}

export async function downloadMeetingIcs(meetingId: string) {
  const { data, error } = await supabase.functions.invoke('generate-meeting-ics', {
    body: { meetingId },
  })
  if (error) throw error
  return data
}
