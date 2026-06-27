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

export async function submitPaperToG3(paperId: string) {
  const { error } = await supabase.rpc('submit_paper_to_g3', { p_paper_id: paperId })
  if (error) throw error
}

export async function reviewPaperG3(
  paperId: string,
  decision: 'approved' | 'rejected',
  comment?: string,
) {
  const { error } = await supabase.rpc('review_paper_g3', {
    p_paper_id: paperId,
    p_decision: decision,
    p_comment: comment ?? null,
  })
  if (error) throw error
}

export async function overridePaperG3(paperId: string, justification: string) {
  const { error } = await supabase.rpc('override_paper_g3', {
    p_paper_id: paperId,
    p_justification: justification,
  })
  if (error) throw error
}

export async function getPaperG3Reviews(paperId: string) {
  const { data, error } = await supabase
    .from('paper_g3_reviews')
    .select(`
      *,
      reviewer:users(full_name, email)
    `)
    .eq('paper_id', paperId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}
