import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, X } from 'lucide-react'
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
    <div className="bg-white border border-zinc-100 rounded-2xl p-3 md:p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-3 dark:bg-slate-800 dark:border-slate-700">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-slate-500" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por título, descrição ou projeto..."
            className="pl-9 bg-zinc-50 border-zinc-200 text-zinc-800 placeholder:text-zinc-400 h-9 text-xs focus:ring-orange-500 focus:border-orange-400 rounded-xl dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>

        {/* Filter by Creative (Director only) */}
        {isDirector && (
          <div className="w-full sm:w-[180px]">
            <Select value={selectedCreative} onValueChange={onCreativeChange}>
              <SelectTrigger className="bg-zinc-50 border-zinc-200 text-zinc-700 h-9 text-xs rounded-xl dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
                <SelectValue placeholder="Criativo" />
              </SelectTrigger>
              <SelectContent className="bg-white border-zinc-200 text-zinc-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
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
            <SelectTrigger className="bg-zinc-50 border-zinc-200 text-zinc-700 h-9 text-xs rounded-xl dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
              <SelectValue placeholder="Projeto" />
            </SelectTrigger>
            <SelectContent className="bg-white border-zinc-200 text-zinc-800 max-h-60 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
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
            <SelectTrigger className="bg-zinc-50 border-zinc-200 text-zinc-700 h-9 text-xs rounded-xl dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent className="bg-white border-zinc-200 text-zinc-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
              <SelectItem value="all">Prioridades</SelectItem>
              <SelectItem value="urgent">Urgente</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="normal">Média</SelectItem>
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
            className="h-9 px-2.5 text-xs text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 shrink-0 rounded-xl dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-700"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Limpar
          </Button>
        )}
      </div>
    </div>
  )
}
