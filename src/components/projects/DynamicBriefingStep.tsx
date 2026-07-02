import { useRef, type ChangeEvent } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Paperclip, X, FileText } from 'lucide-react'
import { getBriefingFieldsForAreas } from '@/lib/briefing-fields'
import { AttachmentsSection } from '@/components/attachments/AttachmentsSection'

interface DynamicBriefingStepProps {
  areaCodes: string[]
  briefingData: Record<string, string>
  onBriefingChange: (key: string, value: string) => void
  isEditMode: boolean
  projectId?: string
  pendingFiles: File[]
  onFilesChange: (files: File[]) => void
}

export function DynamicBriefingStep({
  areaCodes,
  briefingData,
  onBriefingChange,
  isEditMode,
  projectId,
  pendingFiles,
  onFilesChange,
}: DynamicBriefingStepProps) {
  const fields = getBriefingFieldsForAreas(areaCodes)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    onFilesChange([...pendingFiles, ...files])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removePendingFile = (index: number) => {
    onFilesChange(pendingFiles.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-6">
      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Selecione áreas na etapa anterior para visualizar os campos de briefing.
        </p>
      ) : (
        fields.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide">
              {field.label} <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={briefingData[field.key] || ''}
              onChange={(e) => onBriefingChange(field.key, e.target.value)}
              placeholder={`Informe: ${field.label}`}
              className="min-h-[80px]"
            />
          </div>
        ))
      )}

      <div className="pt-4 border-t">
        <h4 className="text-sm font-semibold mb-3">Documentos de Apoio</h4>
        {isEditMode && projectId ? (
          <AttachmentsSection kind="project" entityId={projectId} />
        ) : (
          <div className="space-y-3">
            <input
              type="file"
              multiple
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileSelect}
            />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Paperclip className="w-4 h-4 mr-2" />
              Anexar arquivo
            </Button>
            {pendingFiles.length > 0 && (
              <div className="space-y-2">
                {pendingFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between px-3 py-2 bg-muted rounded-md"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm truncate">{file.name}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removePendingFile(index)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
