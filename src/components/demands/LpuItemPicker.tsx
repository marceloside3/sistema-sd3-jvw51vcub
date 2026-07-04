import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
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
import type { LpuItem } from '@/services/lpu'

interface LpuItemPickerProps {
  items: LpuItem[]
  onSelect: (item: LpuItem) => void
  value?: string | null
  placeholder?: string
}

export function LpuItemPicker({
  items,
  onSelect,
  value,
  placeholder = 'Selecionar item da LPU...',
}: LpuItemPickerProps) {
  const [open, setOpen] = useState(false)

  const selectedItem = value ? items.find((i) => i.id === value) : null

  const handleSelect = (currentValue: string) => {
    const item = items.find((i) => i.item_name === currentValue || i.id === currentValue)
    if (item) {
      onSelect(item)
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="truncate">{selectedItem ? selectedItem.item_name : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar item..." />
          <CommandList>
            <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem key={item.id} value={item.item_name} onSelect={handleSelect}>
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedItem?.id === item.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{item.item_name}</span>
                    {item.description && (
                      <span className="text-xs text-muted-foreground">{item.description}</span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      R$ {Number(item.unit_value).toFixed(2)}
                      {item.range ? ` · ${item.range}` : ''}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
