import { Link, useLocation } from 'react-router-dom'
import { Home, FolderKanban } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar'

export function AppSidebar() {
  const location = useLocation()

  return (
    <Sidebar className="w-[240px]">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === '/'}>
                  <Link to="/">
                    <Home />
                    <span>Início</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === '/auditoria'}>
                  <Link to="/auditoria">
                    <FolderKanban />
                    <span>Auditoria</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
