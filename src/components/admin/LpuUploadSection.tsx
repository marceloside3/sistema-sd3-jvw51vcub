import { useState, useCallback } from 'react'
import { Upload, Trash2, FileSpreadsheet, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/components/ui/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { supabase } from '@/lib/supabase/client'
import { getLpuItems, deleteAllLpuItems, LpuItem } from '@/services/lpu'
import { updateClient } from '@/services/clients'

interface LpuUploadSectionProps {
  clientId: string
  hasLpu: boolean
  onLpuDeleted?: () => void
  onLpuUploaded?: () => void
}

export function LpuUploadSection({
  clientId,
  hasLpu,
  onLpuDeleted,
  onLpuUploaded,
}: LpuUploadSectionProps) {
  const [items, setItems] = useState<LpuItem[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getLpuItems(clientId)
      setItems(data)
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useState(() => {
    loadItems()
  })

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('clientId', clientId)

      const { data, error } = await supabase.functions.invoke('parse-lpu', {
        body: formData,
      })

      if (error) throw error

      if (data?.items?.length > 0) {
        const payload = data.items.map((item: any) => ({
          client_id: clientId,
          item_name: item.item_name,
          range: item.range || null,
          description: item.description || null,
          unit_value: item.unit_value || 0,
        }))
        const { error: insertError } = await supabase.from('client_lpu_items').insert(payload)
        if (insertError) throw insertError
      }

      await updateClient(clientId, { has_lpu: true })
      onLpuUploaded?.()
      await loadItems()
      toast({ title: 'LPU importada com sucesso' })
    } catch (err: any) {
      toast({
        title: 'Erro ao importar LPU',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDeleteAll = async () => {
    setDeleting(true)
    try {
      await deleteAllLpuItems(clientId)
      await updateClient(clientId, { has_lpu: false })
      onLpuDeleted?.()
      setItems([])
      toast({ title: 'Itens da LPU removidos' })
    } catch (err: any) {
      toast({
        title: 'Erro ao remover LPU',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4 rounded-md border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-primary" />
          <h4 className="text-sm font-semibold">Lista de Preços Unitários (LPU)</h4>
          {items.length > 0 && (
            <Badge variant="outline" className="ml-1">
              {items.length} {items.length === 1 ? 'item' : 'itens'}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" asChild disabled={uploading}>
          <label className="cursor-pointer">
            {uploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Importar LPU
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleUpload}
            />
          </label>
        </Button>

        {items.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700"
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Excluir Todos
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir todos os itens da LPU?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Todos os {items.length} itens serão
                  permanentemente removidos e o flag "Possui LPU" será desativado.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAll}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Sim, excluir tudo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando itens...
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/30 rounded-md p-3">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Nenhum item na LPU. Importe um arquivo Excel/CSV para adicionar itens com faixas de
            preço por quantidade.
          </span>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="max-h-48 overflow-y-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Item</th>
                <th className="text-left px-3 py-2 font-medium">Faixa</th>
                <th className="text-right px-3 py-2 font-medium">Valor Unit.</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-3 py-1.5">{item.item_name}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{item.range || '-'}</td>
                  <td className="px-3 py-1.5 text-right font-mono">
                    R$ {Number(item.unit_value).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
