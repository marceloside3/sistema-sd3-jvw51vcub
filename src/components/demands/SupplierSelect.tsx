import { useState, useEffect } from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { searchSuppliers } from '@/services/suppliers'

interface SupplierSelectProps {
  value?: string | null
  initialName?: string | null
  onSelect: (supplier: { id: string; name: string } | null) => void
}

export function SupplierSelect({ value, initialName, onSelect }: SupplierSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [displayName, setDisplayName] = useState(initialName || '')

  useEffect(() => {
    setDisplayName(initialName || '')
  }, [initialName])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const data = await searchSuppliers(search)
        setResults(data)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [search, open])

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDisplayName('')
    onSelect(null)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
          <span className={cn(!displayName && 'text-muted-foreground')}>
            {displayName || 'Selecionar fornecedor...'}
          </span>
          <span className="flex items-center gap-1">
            {displayName && (
              <X className="h-3.5 w-3.5 opacity-50 hover:opacity-100" onClick={handleClear} />
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar por nome ou documento..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {loading && <CommandEmpty>Buscando...</CommandEmpty>}
            {!loading && results.length === 0 && (
              <CommandEmpty>Nenhum fornecedor encontrado.</CommandEmpty>
            )}
            <CommandGroup>
              {results.map((s) => (
                <CommandItem
                  key={s.id}
                  onSelect={() => {
                    onSelect({ id: s.id, name: s.name })
                    setDisplayName(s.name)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn('mr-2 h-4 w-4', value === s.id ? 'opacity-100' : 'opacity-0')}
                  />
                  <span className="font-medium">{s.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {s.type === 'PF' ? 'CPF' : 'CNPJ'}: {s.document}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
