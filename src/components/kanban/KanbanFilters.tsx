import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, X, Filter } from 'lucide-react'
import type { CreativeUser } from '@/services/kanban'

interface KanbanFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  selectedCreative: string
  onCreativeChange: (value: string) => void
  selectedProject: string
  onProjectChange: (value: string) => void
  selectedPriority: string
  onPriorityChange: (value: string) => void
  creatives: CreativeUser[]
  projects: { id: string; name: string; project_code: string }[]
  isDirector: boolean
  onReset: () => void
}

export function KanbanFilters({
  search,
  onSearchChange,
  selectedCreative,
  onCreativeChange,
  selectedProject,
  onProjectChange,
  selectedPriority,
  onPriorityChange,
  creatives,
  projects,
  isDirector,
  onReset,
}: KanbanFiltersProps) {
  const hasActiveFilters =
    search !== '' ||
    selectedCreative !== 'all' ||
    selectedProject !== 'all' ||
    selectedPriority !== 'all'

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 md:p-4 shadow-sm backdrop-blur-sm space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por título ou descrição..."
            className="pl-9 bg-zinc-950 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 h-9 text-xs focus:ring-orange-500"
          />
        </div>

        {/* Filter by Creative (Director only) */}
        {isDirector && (
          <div className="w-full sm:w-[180px]">
            <Select value={selectedCreative} onValueChange={onCreativeChange}>
              <SelectTrigger className="bg-zinc-950 border-zinc-700 text-zinc-200 h-9 text-xs">
                <SelectValue placeholder="Criativo" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
                <SelectItem value="all">Todos os Criativos</SelectItem>
                <SelectItem value="unassigned">Não atribuídos</SelectItem>
                {creatives.map((creative) => (
                  <SelectItem key={creative.id} value={creative.id}>
                    {creative.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Filter by Project */}
        <div className="w-full sm:w-[200px]">
          <Select value={selectedProject} onValueChange={onProjectChange}>
            <SelectTrigger className="bg-zinc-950 border-zinc-700 text-zinc-200 h-9 text-xs">
              <SelectValue placeholder="Projeto" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100 max-h-60">
              <SelectItem value="all">Todos os Projetos</SelectItem>
              {projects.map((proj) => (
                <SelectItem key={proj.id} value={proj.id}>
                  <span className="truncate max-w-[180px] inline-block">{proj.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filter by Priority */}
        <div className="w-full sm:w-[140px]">
          <Select value={selectedPriority} onValueChange={onPriorityChange}>
            <SelectTrigger className="bg-zinc-950 border-zinc-700 text-zinc-200 h-9 text-xs">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
              <SelectItem value="all">Prioridades</SelectItem>
              <SelectItem value="urgent">Urgente</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reset button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-9 px-2.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 shrink-0"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Limpar
          </Button>
        )}
      </div>
    </div>
  )
}
