import React, { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Paperclip, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { uploadAttachment, AttachmentKind } from '@/services/attachments'
import { useCurrentUser } from '@/hooks/use-current-user'

interface FileUploaderProps {
  kind: AttachmentKind
  entityId: string
  onUploaded?: () => void
}

export function FileUploader({ kind, entityId, onUploaded }: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { data: currentUser } = useCurrentUser()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    if (!currentUser?.id) {
      toast.error('Usuário não autenticado.')
      return
    }

    setIsUploading(true)
    let uploadedCount = 0

    for (const file of files) {
      if (file.size > 52428800) {
        toast.error(`${file.name}: excede o limite de 50MB`)
        continue
      }

      try {
        await uploadAttachment(kind, entityId, file, currentUser.id)
        toast.success(`${file.name} enviado com sucesso`)
        uploadedCount++
      } catch (error: any) {
        toast.error(error.message || `Erro ao enviar ${file.name}`)
      }
    }

    setIsUploading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    if (uploadedCount > 0 && onUploaded) {
      onUploaded()
    }
  }

  return (
    <>
      <input
        type="file"
        multiple
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      <Button
        variant="ghost"
        size="sm"
        disabled={isUploading}
        onClick={() => fileInputRef.current?.click()}
      >
        {isUploading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Paperclip className="w-4 h-4 mr-2" />
        )}
        {isUploading ? 'Enviando...' : 'Anexar arquivo'}
      </Button>
    </>
  )
}
