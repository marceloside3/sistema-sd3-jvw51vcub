import React, { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Paperclip, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { uploadAttachment, AttachmentType } from '@/services/attachments'

interface FileUploaderProps {
  type: AttachmentType
  entityId: string
  onUploaded: () => void
}

export function FileUploader({ type, entityId, onUploaded }: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setIsUploading(true)
    let uploadedCount = 0

    for (const file of files) {
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: 'Erro',
          description: `${file.name}: excede 50MB`,
          variant: 'destructive',
        })
        continue
      }

      try {
        await uploadAttachment(type, entityId, file)
        toast({
          title: 'Sucesso',
          description: `${file.name} enviado`,
        })
        uploadedCount++
      } catch (error: any) {
        toast({
          title: 'Erro no envio',
          description: error.message || `Erro ao enviar ${file.name}`,
          variant: 'destructive',
        })
      }
    }

    setIsUploading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    if (uploadedCount > 0) {
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
        {isUploading ? 'Enviando...' : 'Anexar'}
      </Button>
    </>
  )
}
