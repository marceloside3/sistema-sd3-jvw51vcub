import { useState } from 'react'
import { AttachmentType } from '@/services/attachments'
import { FileUploader } from './FileUploader'
import { AttachmentList } from './AttachmentList'

interface AttachmentsSectionProps {
  type: AttachmentType
  entityId: string
  title?: string
}

export function AttachmentsSection({ type, entityId, title = 'Anexos' }: AttachmentsSectionProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleUploaded = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b pb-2">
        <h3 className="font-semibold">{title}</h3>
        <FileUploader type={type} entityId={entityId} onUploaded={handleUploaded} />
      </div>
      <AttachmentList type={type} entityId={entityId} refreshTrigger={refreshTrigger} />
    </div>
  )
}
