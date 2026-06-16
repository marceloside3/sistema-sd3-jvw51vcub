import { Outlet } from 'react-router-dom'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from './layout/AppSidebar'
import { AppHeader } from './layout/AppHeader'

export default function Layout() {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background overflow-hidden">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1 w-full min-w-0">
          <AppHeader />
          <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 animate-fade-in-up">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
