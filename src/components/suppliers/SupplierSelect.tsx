import { useState, useEffect, useCallback } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { getAllSuppliers, type Supplier } from '@/services/suppliers'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SupplierSelectProps {
  value: string | null
  supplierName: string | null
  onChange: (supplier: Supplier | null) => void
  disabled?: boolean
}

export function SupplierSelect({
  value,
  supplierName,
  onChange,
  disabled = false,
}: SupplierSelectProps) {
  const [open, setOpen] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)

  const loadSuppliers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAllSuppliers()
      setSuppliers(data)
    } catch {
      setSuppliers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSuppliers()
  }, [loadSuppliers])

  const selected = suppliers.find((s) => s.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          {selected ? selected.name : supplierName || 'Selecione um fornecedor...'}
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar fornecedor..." />
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            )}
            <CommandEmpty>Nenhum fornecedor encontrado.</CommandEmpty>
            {!loading && (
              <CommandGroup>
                {suppliers.map((s) => (
                  <CommandItem
                    key={s.id}
                    value={`${s.name} ${s.document || ''}`}
                    onSelect={() => {
                      onChange(s.id === value ? null : s)
                      setOpen(false)
                    }}
                  >
                    <div className="flex flex-col">
                      <span>{s.name}</span>
                      {s.document && (
                        <span className="text-xs text-muted-foreground">{s.document}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
