import React, { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Paperclip, X } from 'lucide-react'
import { toast } from 'sonner'

interface PendingFilesPickerProps {
  files: File[]
  onChange: (files: File[]) => void
  maxSizeMB?: number
}

export function PendingFilesPicker({ files, onChange, maxSizeMB = 50 }: PendingFilesPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length === 0) return

    const validFiles: File[] = []
    const invalidFiles: string[] = []

    const maxSizeBytes = maxSizeMB * 1024 * 1024

    selectedFiles.forEach((file) => {
      if (file.size > maxSizeBytes) {
        invalidFiles.push(file.name)
      } else {
        if (!files.some((f) => f.name === file.name && f.size === file.size)) {
          validFiles.push(file)
        }
      }
    })

    if (invalidFiles.length > 0) {
      toast.error(`Arquivos ignorados (> ${maxSizeMB}MB): ${invalidFiles.join(', ')}`)
    }

    if (validFiles.length > 0) {
      onChange([...files, ...validFiles])
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemove = (index: number) => {
    const newFiles = [...files]
    newFiles.splice(index, 1)
    onChange(newFiles)
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Anexos Pendentes</h3>
        <input
          type="file"
          multiple
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="w-4 h-4 mr-2" />
          Anexar arquivos
        </Button>
      </div>

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, idx) => (
            <li
              key={idx}
              className="flex items-center justify-between p-2 text-sm border rounded-md bg-slate-50"
            >
              <span className="truncate max-w-[80%]">{file.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{formatSize(file.size)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleRemove(idx)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
