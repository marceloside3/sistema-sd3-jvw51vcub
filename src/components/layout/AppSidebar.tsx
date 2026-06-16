import { Link, useLocation } from 'react-router-dom'
import {
  Briefcase,
  Headset,
  BookOpen,
  PenTool,
  Share2,
  MonitorPlay,
  Users,
  Video,
  DollarSign,
  FileText,
  Scale,
  UserPlus,
  Zap,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from '@/components/ui/sidebar'
import { MACRO_AREAS } from '@/lib/types'

const iconMap: Record<number, any> = {
  1: Briefcase,
  2: Headset,
  3: BookOpen,
  4: PenTool,
  5: Share2,
  6: MonitorPlay,
  7: Users,
  8: Video,
  9: DollarSign,
  10: FileText,
  11: Scale,
  12: UserPlus,
}

export function AppSidebar() {
  const location = useLocation()

  return (
    <Sidebar variant="sidebar" collapsible="icon" className="border-r-0">
      <SidebarHeader className="flex h-16 items-center justify-center border-b border-sidebar-border px-4 py-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <Zap className="h-6 w-6 text-primary flex-shrink-0" />
          <span className="text-xl font-bold tracking-tight text-sidebar-foreground truncate group-data-[collapsible=icon]:hidden">
            SD3 OS
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-sidebar-foreground/50 mb-2">
            Macro Áreas
          </SidebarGroupLabel>
          <SidebarMenu>
            {MACRO_AREAS.map((area) => {
              const Icon = iconMap[area.id]
              const path = area.slug === 'hub' ? '/' : `/area/${area.slug}`
              const isActive = location.pathname === path

              return (
                <SidebarMenuItem key={area.id}>
                  <SidebarMenuButton asChild isActive={isActive} tooltip={area.name}>
                    <Link to={path} className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      <span>{area.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4 group-data-[collapsible=icon]:hidden">
        <div className="flex flex-col gap-2">
          <Link to="/auditoria" className="text-xs text-primary hover:underline text-center">
            Relatório de Auditoria
          </Link>
          <div className="text-xs text-sidebar-foreground/50 text-center">
            Manual de Processos v2.0
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
