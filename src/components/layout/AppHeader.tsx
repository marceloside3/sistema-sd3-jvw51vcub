import { Bell, Search, UserCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/stores/use-app-store'
import { MACRO_AREAS } from '@/lib/types'
import { SidebarTrigger } from '@/components/ui/sidebar'

export function AppHeader() {
  const { current_user, alerts } = useAppStore()
  const areaName = MACRO_AREAS.find((a) => a.id === current_user.area_id)?.name

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <div className="hidden md:flex relative w-64 lg:w-96">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar projetos ou clientes..."
            className="pl-8 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-foreground/80" />
          {alerts.length > 0 && (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive animate-pulse" />
          )}
        </Button>

        <div className="hidden md:flex items-center gap-3 border-l pl-4">
          <div className="flex flex-col items-end">
            <span className="text-sm font-semibold leading-none">{current_user.name}</span>
            <span className="text-xs text-muted-foreground mt-1">
              {current_user.profile_id === 1 ? 'Diretor' : 'Analista'} • {areaName}
            </span>
          </div>
          <UserCircle className="h-8 w-8 text-muted-foreground" />
        </div>
      </div>
    </header>
  )
}
