import { useEffect, useState } from 'react'
import {
  listAttachments,
  deleteAttachment,
  downloadAttachment,
  AttachmentType,
  Attachment,
} from '@/services/attachments'
import { File, Download, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'

interface AttachmentListProps {
  type: AttachmentType
  entityId: string
  refreshTrigger: number
}

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export function AttachmentList({ type, entityId, refreshTrigger }: AttachmentListProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState<string | null>(null)
  const { toast } = useToast()

  const loadAttachments = async () => {
    try {
      setIsLoading(true)
      const data = await listAttachments(type, entityId)
      setAttachments(data)
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar anexos',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAttachments()
  }, [type, entityId, refreshTrigger])

  const handleDownload = async (attachment: Attachment) => {
    try {
      setIsDownloading(attachment.id)
      const url = await downloadAttachment(type, attachment.storage_path)
      const a = document.createElement('a')
      a.href = url
      a.download = attachment.file_name
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao baixar o anexo',
        variant: 'destructive',
      })
    } finally {
      setIsDownloading(null)
    }
  }

  const handleDelete = async (attachment: Attachment) => {
    if (!window.confirm(`Tem certeza que deseja excluir ${attachment.file_name}?`)) return

    try {
      setIsDeleting(attachment.id)
      await deleteAttachment(type, attachment.id, attachment.storage_path)
      toast({
        title: 'Sucesso',
        description: 'Anexo removido',
      })
      loadAttachments()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir o anexo',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
      </div>
    )
  }

  if (attachments.length === 0) {
    return <p className="text-sm text-gray-500 py-4 text-center">Nenhum anexo encontrado.</p>
  }

  return (
    <ul className="space-y-2">
      {attachments.map((attachment) => (
        <li
          key={attachment.id}
          className="flex items-center justify-between p-3 bg-gray-50 border rounded-md"
        >
          <div className="flex items-center space-x-3 overflow-hidden">
            <File className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div className="min-w-0">
              <p
                className="text-sm font-medium text-gray-900 truncate"
                title={attachment.file_name}
              >
                {attachment.file_name}
              </p>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <span>{formatBytes(attachment.file_size)}</span>
                <span>•</span>
                <span>{format(new Date(attachment.created_at), 'dd/MM/yyyy HH:mm')}</span>
                {attachment.uploader_name && (
                  <>
                    <span>•</span>
                    <span>{attachment.uploader_name}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex space-x-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              onClick={() => handleDownload(attachment)}
              disabled={isDownloading === attachment.id}
              title="Baixar"
            >
              {isDownloading === attachment.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => handleDelete(attachment)}
              disabled={isDeleting === attachment.id}
              title="Excluir"
            >
              {isDeleting === attachment.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}
