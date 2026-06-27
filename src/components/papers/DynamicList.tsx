import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2 } from 'lucide-react'

interface Column {
  key: string
  label: string
}

interface DynamicListProps {
  items: any[]
  columns: Column[]
  readOnly?: boolean
  onChange: (items: any[]) => void
}

export function DynamicList({ items, columns, readOnly, onChange }: DynamicListProps) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-start">
          {columns.map((col) => (
            <Input
              key={col.key}
              placeholder={col.label}
              value={item[col.key] || ''}
              onChange={(e) => {
                const newItems = [...items]
                newItems[i] = { ...newItems[i], [col.key]: e.target.value }
                onChange(newItems)
              }}
              disabled={readOnly}
              className="flex-1"
            />
          ))}
          {!readOnly && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          )}
        </div>
      ))}
      {!readOnly && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const newItem = columns.reduce((acc, col) => ({ ...acc, [col.key]: '' }), {})
            onChange([...items, newItem])
          }}
        >
          <Plus className="w-4 h-4 mr-2" /> Adicionar
        </Button>
      )}
    </div>
  )
}
