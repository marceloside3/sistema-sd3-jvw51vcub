import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DEMAND_AUDIT_FIELD_LABELS } from '@/lib/demand-audit-format'
import type { AuditFilters } from '@/hooks/use-demand-audit-filters'

interface DemandAuditFiltersProps {
  filters: AuditFilters
  users: Array<{ id: string; name: string }>
  fields: string[]
}

export function DemandAuditFilters({ filters, users, fields }: DemandAuditFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-2 pb-3 border-b">
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Usuário</Label>
        <Select
          value={filters.selectedUserId || 'all'}
          onValueChange={(v) => filters.setUserId(v === 'all' ? null : v)}
        >
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os usuários</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Data Inicial</Label>
        <Input
          type="date"
          value={filters.dateFrom || ''}
          onChange={(e) => filters.setDateFrom(e.target.value || null)}
          className="w-[150px] h-9"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Data Final</Label>
        <Input
          type="date"
          value={filters.dateTo || ''}
          onChange={(e) => filters.setDateTo(e.target.value || null)}
          className="w-[150px] h-9"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Campo</Label>
        <Select
          value={filters.selectedField || 'all'}
          onValueChange={(v) => filters.setField(v === 'all' ? null : v)}
        >
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os campos</SelectItem>
            {fields.map((f) => (
              <SelectItem key={f} value={f}>
                {DEMAND_AUDIT_FIELD_LABELS[f] || f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filters.isFiltered && (
        <Button variant="ghost" size="sm" onClick={filters.reset} className="h-9">
          <X className="w-3 h-3 mr-1" />
          Limpar Filtros
        </Button>
      )}
    </div>
  )
}
