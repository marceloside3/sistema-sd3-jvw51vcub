import { Outlet } from 'react-router-dom'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from './AppSidebar'
import { AppHeader } from './AppHeader'

export function AppShell() {
  return (
    <SidebarProvider>
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
