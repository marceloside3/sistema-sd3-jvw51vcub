import { supabase } from '@/lib/supabase/client'

export type AttachmentType = 'project' | 'demand'

export interface Attachment {
  id: string
  file_name: string
  file_size: number
  mime_type: string | null
  storage_path: string
  created_at: string
  uploader_name?: string
  uploaded_by?: string
}

const MAX_FILE_SIZE = 52428800 // 50MB

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9.\-_]/g, '')
}

function getBucketName(type: AttachmentType): string {
  return type === 'project' ? 'project-files' : 'demand-files'
}

function getTableName(type: AttachmentType): string {
  return type === 'project' ? 'project_attachments' : 'demand_attachments'
}

function getEntityColumnName(type: AttachmentType): string {
  return type === 'project' ? 'project_id' : 'demand_id'
}

export async function uploadAttachment(
  type: AttachmentType,
  entityId: string,
  file: File,
  userId: string,
): Promise<Attachment> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size exceeds the 50MB limit.')
  }

  if (!userId) {
    throw new Error('User not authenticated.')
  }

  const sanitizedFileName = sanitizeFileName(file.name)
  const timestamp = Date.now()
  const storagePath = `${entityId}/${timestamp}_${sanitizedFileName}`
  const bucketName = getBucketName(type)
  const tableName = getTableName(type)
  const entityColumnName = getEntityColumnName(type)

  // Upload to storage
  const { error: storageError } = await supabase.storage
    .from(bucketName)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (storageError) {
    throw storageError
  }

  // Insert to DB
  const dbPayload = {
    [entityColumnName]: entityId,
    uploaded_by: userId,
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type || null,
    storage_path: storagePath,
  }

  const { data: dbData, error: dbError } = await supabase
    .from(tableName)
    .insert([dbPayload])
    .select(`
      *,
      profiles(name)
    `)
    .single()

  if (dbError) {
    // Rollback storage upload if DB insertion fails
    await supabase.storage.from(bucketName).remove([storagePath])
    throw dbError
  }

  const dbDataAny = dbData as any

  return {
    id: dbDataAny.id,
    file_name: dbDataAny.file_name,
    file_size: dbDataAny.file_size,
    mime_type: dbDataAny.mime_type,
    storage_path: dbDataAny.storage_path,
    created_at: dbDataAny.created_at,
    uploader_name: dbDataAny.profiles?.name,
    uploaded_by: dbDataAny.uploaded_by,
  }
}

export async function listAttachments(
  type: AttachmentType,
  entityId: string,
): Promise<Attachment[]> {
  const tableName = getTableName(type)
  const entityColumnName = getEntityColumnName(type)

  const { data, error } = await supabase
    .from(tableName)
    .select(`
      *,
      profiles(name)
    `)
    .eq(entityColumnName, entityId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data as any[]).map((item) => ({
    id: item.id,
    file_name: item.file_name,
    file_size: item.file_size,
    mime_type: item.mime_type,
    storage_path: item.storage_path,
    created_at: item.created_at,
    uploader_name: item.profiles?.name,
    uploaded_by: item.uploaded_by,
  }))
}

export async function deleteAttachment(
  type: AttachmentType,
  attachmentId: string,
  storagePath: string,
): Promise<void> {
  const tableName = getTableName(type)
  const bucketName = getBucketName(type)

  // Remove DB record first
  const { error: dbError } = await supabase.from(tableName).delete().eq('id', attachmentId)

  if (dbError) {
    throw dbError
  }

  // Remove from storage
  const { error: storageError } = await supabase.storage.from(bucketName).remove([storagePath])

  if (storageError) {
    throw storageError
  }
}

export async function downloadAttachment(
  type: AttachmentType,
  storagePath: string,
): Promise<string> {
  const bucketName = getBucketName(type)

  const { data, error } = await supabase.storage.from(bucketName).createSignedUrl(storagePath, 300) // 300 seconds = 5 minutes

  if (error) {
    throw error
  }

  return data.signedUrl
}
