import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  SidebarProvider,
  SidebarInset,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Home, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useCurrentUser } from '@/hooks/use-current-user'
import { Button } from '@/components/ui/button'

function AppSidebar() {
  const location = useLocation()

  return (
    <Sidebar className="border-r border-gray-200 bg-white">
      <SidebarHeader className="h-16 flex items-center px-4 border-b border-gray-100">
        <span className="text-xl font-bold text-blue-600 tracking-tight">SD3</span>
      </SidebarHeader>
      <SidebarContent className="px-2 py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={location.pathname === '/' || location.pathname === '/dashboard'}
            >
              <Link to="/">
                <Home className="w-4 h-4 mr-2" />
                <span>Início</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  )
}

function AppHeader() {
  const { signOut } = useAuth()
  const { data, clearCache } = useCurrentUser()
  const navigate = useNavigate()

  const handleLogout = async () => {
    clearCache()
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <header className="h-[64px] shrink-0 flex items-center justify-between px-4 md:px-6 bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <span className="text-xl font-bold text-blue-600 tracking-tight">SD3</span>
      </div>

      <div className="flex items-center gap-4 ml-auto">
        {data && (
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium text-gray-900 leading-none">
              {data.user.full_name}
            </span>
            <span className="text-xs text-gray-500 mt-1">{data.profile?.name || 'Sem perfil'}</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-gray-600 hover:text-red-600 hover:bg-red-50"
        >
          <LogOut className="w-4 h-4 md:mr-2" />
          <span className="hidden md:inline">Sair</span>
        </Button>
      </div>
    </header>
  )
}

export function AppShell() {
  return (
    <SidebarProvider style={{ '--sidebar-width': '240px' } as React.CSSProperties}>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen w-full bg-gray-50/50">
        <AppHeader />
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
