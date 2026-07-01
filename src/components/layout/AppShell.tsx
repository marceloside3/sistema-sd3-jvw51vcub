import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  LogOut,
  Menu,
  X,
  Users,
  Map,
  Shield,
  Briefcase,
  FolderKanban,
  CheckSquare,
  Bell,
  Inbox,
  ShieldCheck,
} from 'lucide-react'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { useAuth } from '@/hooks/use-auth'
import { useCurrentUser } from '@/hooks/use-current-user'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import logoUrl from '@/assets/logoside3-0c37e.png'

const navLinkClass = (isActive: boolean) =>
  cn(
    'flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ease-smooth',
    isActive
      ? 'bg-orange-500/15 text-orange-400 border-l-[3px] border-orange-500'
      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 border-l-[3px] border-transparent',
  )

function AppSidebar({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (val: boolean) => void }) {
  const location = useLocation()
  const { data } = useCurrentUser()
  const canSeeAdmin = data?.profile?.is_admin || data?.profile?.is_director
  const canSeeHub =
    data?.profile && ['super_admin', 'atendimento', 'planejamento'].includes(data.profile.code)
  const canSeeAudit =
    data?.profile?.is_admin || (data?.profile?.is_director && data?.areas?.some((a) => a.is_hub))

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-zinc-900 border-r border-zinc-800 transform transition-transform duration-300 ease-smooth md:relative md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-zinc-800">
          <img src={logoUrl} alt="SD3" className="h-9 object-contain" />
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all duration-300 ease-smooth"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="p-3 overflow-y-auto h-[calc(100vh-4rem)]">
          <nav className="space-y-0.5">
            <Link
              to="/"
              onClick={() => setIsOpen(false)}
              className={navLinkClass(
                location.pathname === '/' || location.pathname === '/dashboard',
              )}
            >
              <Home fill="currentColor" className="w-4 h-4 mr-3 shrink-0" />
              Início
            </Link>
            <Link
              to="/projetos"
              onClick={() => setIsOpen(false)}
              className={navLinkClass(location.pathname.startsWith('/projetos'))}
            >
              <FolderKanban fill="currentColor" className="w-4 h-4 mr-3 shrink-0" />
              Projetos
            </Link>
            <Link
              to="/minhas-demandas"
              onClick={() => setIsOpen(false)}
              className={navLinkClass(location.pathname.startsWith('/minhas-demandas'))}
            >
              <CheckSquare fill="currentColor" className="w-4 h-4 mr-3 shrink-0" />
              Minhas Demandas
            </Link>
            <Link
              to="/notificacoes"
              onClick={() => setIsOpen(false)}
              className={navLinkClass(location.pathname.startsWith('/notificacoes'))}
            >
              <Bell fill="currentColor" className="w-4 h-4 mr-3 shrink-0" />
              Notificações
            </Link>
            {canSeeHub && (
              <Link
                to="/hub"
                onClick={() => setIsOpen(false)}
                className={navLinkClass(location.pathname.startsWith('/hub'))}
              >
                <Inbox fill="currentColor" className="w-4 h-4 mr-3 shrink-0" />
                HUB Atendimento
              </Link>
            )}
            {canSeeAdmin && (
              <div className="pt-5">
                <div className="px-3 mb-2">
                  <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                    Administração
                  </span>
                </div>
                <div className="space-y-0.5">
                  <Link
                    to="/admin/usuarios"
                    onClick={() => setIsOpen(false)}
                    className={navLinkClass(location.pathname.startsWith('/admin/usuarios'))}
                  >
                    <Users fill="currentColor" className="w-4 h-4 mr-3 shrink-0" />
                    Usuários
                  </Link>
                  <Link
                    to="/admin/areas"
                    onClick={() => setIsOpen(false)}
                    className={navLinkClass(location.pathname.startsWith('/admin/areas'))}
                  >
                    <Map fill="currentColor" className="w-4 h-4 mr-3 shrink-0" />
                    Áreas
                  </Link>
                  <Link
                    to="/admin/perfis"
                    onClick={() => setIsOpen(false)}
                    className={navLinkClass(location.pathname.startsWith('/admin/perfis'))}
                  >
                    <Shield fill="currentColor" className="w-4 h-4 mr-3 shrink-0" />
                    Perfis
                  </Link>
                  <Link
                    to="/admin/clientes"
                    onClick={() => setIsOpen(false)}
                    className={navLinkClass(location.pathname.startsWith('/admin/clientes'))}
                  >
                    <Briefcase fill="currentColor" className="w-4 h-4 mr-3 shrink-0" />
                    Clientes
                  </Link>
                  {canSeeAudit && (
                    <Link
                      to="/auditoria"
                      onClick={() => setIsOpen(false)}
                      className={navLinkClass(location.pathname.startsWith('/auditoria'))}
                    >
                      <ShieldCheck fill="currentColor" className="w-4 h-4 mr-3 shrink-0" />
                      Auditoria
                    </Link>
                  )}
                </div>
              </div>
            )}
          </nav>
        </div>
      </aside>
    </>
  )
}

function AppHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const { signOut } = useAuth()
  const { data, clearCache } = useCurrentUser() as any
  const navigate = useNavigate()

  const handleLogout = async () => {
    if (typeof clearCache === 'function') clearCache()
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <header className="h-16 shrink-0 flex items-center justify-between px-4 md:px-6 bg-white/90 backdrop-blur-md border-b border-zinc-200 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-all duration-300 ease-smooth"
          onClick={onMenuClick}
        >
          <Menu className="w-5 h-5" />
        </Button>
        <img src={logoUrl} alt="SD3" className="h-8 object-contain md:hidden" />
      </div>

      <div className="flex items-center gap-4 ml-auto">
        <NotificationBell />
        {data && (
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium text-zinc-900 leading-none">{data.full_name}</span>
            <span className="text-xs text-zinc-500 mt-1">{data.profile?.name || 'Sem perfil'}</span>
          </div>
        )}
        <div className="w-px h-8 bg-zinc-200" />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-zinc-500 hover:text-red-600 hover:bg-red-50 transition-all duration-300 ease-smooth"
        >
          <LogOut className="w-4 h-4 md:mr-2" />
          <span className="hidden md:inline">Sair</span>
        </Button>
      </div>
    </header>
  )
}

export function AppShell() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      <AppSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <AppHeader onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
