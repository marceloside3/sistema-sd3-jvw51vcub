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

const useQueryClient = () => {
  const { clearCache } = useCurrentUser()
  return {
    clear: () => {
      if (typeof clearCache === 'function') {
        clearCache()
      }
    },
  }
}

function BrandLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: { box: 'w-8 h-8', text: 'text-lg' },
    md: { box: 'w-10 h-10', text: 'text-xl' },
    lg: { box: 'w-14 h-14', text: 'text-2xl' },
  }
  const s = sizes[size]

  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cn(
          s.box,
          'rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-brand shrink-0',
        )}
      >
        <span className="text-white font-extrabold tracking-tighter">SD3</span>
      </div>
      {size !== 'sm' && (
        <span className={cn(s.text, 'font-extrabold tracking-tighter text-gray-900')}>
          Sistema <span className="text-orange-500">Operacional</span>
        </span>
      )}
    </div>
  )
}

function BrandLogoDark({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const sizes = {
    sm: { box: 'w-8 h-8', text: 'text-lg' },
    md: { box: 'w-10 h-10', text: 'text-xl' },
  }
  const s = sizes[size]

  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cn(
          s.box,
          'rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0',
        )}
      >
        <span className="text-white font-extrabold tracking-tighter text-sm">SD3</span>
      </div>
      {size === 'md' && (
        <span className={cn(s.text, 'font-extrabold tracking-tighter text-white')}>SD3</span>
      )}
    </div>
  )
}

const navLinkClass = (isActive: boolean) =>
  cn(
    'flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
    isActive
      ? 'bg-orange-500/15 text-orange-600 border-l-[3px] border-orange-500'
      : 'text-black hover:bg-black/5 hover:text-gray-900 border-l-[3px] border-transparent',
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
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white/80 backdrop-blur-xl border-r border-gray-200/60 transform transition-transform duration-300 md:relative md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-gray-200/60">
          <img src={logoUrl} alt="SD3 Logo" className="h-8 object-contain" />
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-gray-600 hover:text-gray-900 hover:bg-gray-100"
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
                  <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">
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
  const { data } = useCurrentUser()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const handleLogout = async () => {
    queryClient.clear()
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <header className="h-[64px] shrink-0 flex items-center justify-between px-4 md:px-6 bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-gray-600"
          onClick={onMenuClick}
        >
          <Menu className="w-5 h-5" />
        </Button>
        <div className="md:hidden">
          <img src={logoUrl} alt="SD3 Logo" className="h-8 object-contain" />
        </div>
      </div>

      <div className="flex items-center gap-4 ml-auto">
        <NotificationBell />
        {data && (
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium text-gray-900 leading-none">{data.full_name}</span>
            <span className="text-xs text-gray-500 mt-1">{data.profile?.name || 'Sem perfil'}</span>
          </div>
        )}
        <div className="w-px h-8 bg-gray-200" />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors duration-200"
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
    <div className="flex h-screen overflow-hidden bg-gray-50">
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
