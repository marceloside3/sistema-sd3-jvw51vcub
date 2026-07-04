import { useState } from 'react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { getUniqueItemNames, LpuItem } from '@/services/lpu'

interface LpuItemPickerProps {
  items: LpuItem[]
  value: string | null
  onSelect: (itemName: string) => void
}

export function LpuItemPicker({ items, value, onSelect }: LpuItemPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const uniqueNames = getUniqueItemNames(items)
  const filteredNames = uniqueNames.filter((name) =>
    name.toLowerCase().includes(search.toLowerCase()),
  )

  const canCreateCustom =
    search.trim().length > 0 &&
    !uniqueNames.some((name) => name.toLowerCase() === search.trim().toLowerCase())

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={cn(value ? 'text-foreground' : 'text-muted-foreground')}>
            {value || search || 'Selecione ou digite um item...'}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Buscar ou digitar item..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{canCreateCustom ? null : 'Nenhum item encontrado.'}</CommandEmpty>
            {filteredNames.length > 0 && (
              <CommandGroup heading="Itens da LPU">
                {filteredNames.map((name) => (
                  <CommandItem
                    key={name}
                    value={name}
                    onSelect={() => {
                      onSelect(name)
                      setSearch('')
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value?.toLowerCase() === name.toLowerCase() ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {canCreateCustom && (
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    onSelect(search.trim())
                    setSearch('')
                    setOpen(false)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Criar item: "{search.trim()}"
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
