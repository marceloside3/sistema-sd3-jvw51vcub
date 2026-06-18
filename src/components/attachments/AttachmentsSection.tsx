import { useState } from 'react'
import { AttachmentKind } from '@/services/attachments'
import { FileUploader } from './FileUploader'
import { AttachmentList } from './AttachmentList'

interface AttachmentsSectionProps {
  type?: AttachmentKind // for backwards compatibility
  kind?: AttachmentKind
  entityId: string
}

export function AttachmentsSection({ type, kind, entityId }: AttachmentsSectionProps) {
  const [refreshKey, setRefreshKey] = useState(0)
  const effectiveKind = (kind || type || 'project') as AttachmentKind

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Anexos</h3>
        <FileUploader
          kind={effectiveKind}
          entityId={entityId}
          onUploaded={() => setRefreshKey((k) => k + 1)}
        />
      </div>
      <AttachmentList kind={effectiveKind} entityId={entityId} refreshKey={refreshKey} />
    </div>
  )
}
