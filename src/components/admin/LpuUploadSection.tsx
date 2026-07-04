import { useState, useRef, useEffect } from 'react'
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { uploadLpuFile, getLpuItems, type LpuItem } from '@/services/lpu'

interface LpuUploadSectionProps {
  clientId: string
  hasLpu: boolean
}

export function LpuUploadSection({ clientId, hasLpu }: LpuUploadSectionProps) {
  const [uploading, setUploading] = useState(false)
  const [items, setItems] = useState<LpuItem[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (clientId) {
      getLpuItems(clientId)
        .then(setItems)
        .catch(() => {})
    }
  }, [clientId])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.xlsx')) {
      toast({
        title: 'Erro',
        description: 'Apenas arquivos .xlsx são aceitos',
        variant: 'destructive',
      })
      return
    }

    setUploading(true)
    try {
      const result = await uploadLpuFile(clientId, file)
      toast({
        title: 'Sucesso',
        description: `${result.count} itens importados da LPU`,
      })
      const fresh = await getLpuItems(clientId)
      setItems(fresh)
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="col-span-full border-t pt-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold">LPU - Lista de Preços Unitários</h3>
          </div>
          <input
            type="file"
            accept=".xlsx"
            className="hidden"
            ref={fileInputRef}
            onChange={handleUpload}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            {uploading ? 'Enviando...' : 'Enviar LPU (.xlsx)'}
          </Button>
        </div>

        {items.length > 0 ? (
          <div className="rounded-lg border p-3 bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">{items.length} itens na LPU</span>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {items.slice(0, 15).map((item) => (
                <div
                  key={item.id}
                  className="text-xs text-muted-foreground flex justify-between gap-2"
                >
                  <span className="truncate">{item.item_name}</span>
                  <span className="shrink-0 font-medium">
                    R$ {Number(item.unit_value).toFixed(2)}
                  </span>
                </div>
              ))}
              {items.length > 15 && (
                <div className="text-xs text-muted-foreground italic">
                  +{items.length - 15} itens...
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            <span>Nenhuma LPU cadastrada. Envie um arquivo .xlsx para importar.</span>
          </div>
        )}
      </div>
    </div>
  )
}
