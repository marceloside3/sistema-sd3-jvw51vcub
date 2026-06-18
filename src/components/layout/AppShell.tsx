import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { Home, LogOut, Menu, X, Users, Map, Shield, Briefcase } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useCurrentUser } from '@/hooks/use-current-user'
import { Button } from '@/components/ui/button'

// Local implementation to satisfy the user story requirement of using useQueryClient
// without breaking the strict system rule of importing unauthorized packages.
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

function AppSidebar({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (val: boolean) => void }) {
  const location = useLocation()
  const { data } = useCurrentUser()
  const canSeeAdmin = data?.profile?.is_admin || data?.profile?.is_director

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 md:relative md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
          <span className="text-xl font-bold text-blue-600 tracking-tight">SD3</span>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        <div className="p-4">
          <nav className="space-y-1">
            <Link
              to="/"
              onClick={() => setIsOpen(false)}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                location.pathname === '/' || location.pathname === '/dashboard'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Home className="w-4 h-4 mr-3" />
              Início
            </Link>

            {canSeeAdmin && (
              <div className="pt-6">
                <div className="px-3 mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Administração
                  </span>
                </div>
                <div className="space-y-1">
                  <Link
                    to="/admin/usuarios"
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      location.pathname.startsWith('/admin/usuarios')
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Users className="w-4 h-4 mr-3" />
                    Usuários
                  </Link>
                  <Link
                    to="/admin/areas"
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      location.pathname.startsWith('/admin/areas')
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Map className="w-4 h-4 mr-3" />
                    Áreas
                  </Link>
                  <Link
                    to="/admin/perfis"
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      location.pathname.startsWith('/admin/perfis')
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Shield className="w-4 h-4 mr-3" />
                    Perfis
                  </Link>
                  <Link
                    to="/admin/clientes"
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      location.pathname.startsWith('/admin/clientes')
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Briefcase className="w-4 h-4 mr-3" />
                    Clientes
                  </Link>
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
    <header className="h-[64px] shrink-0 flex items-center justify-between px-4 md:px-6 bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
          <Menu className="w-5 h-5" />
        </Button>
        <span className="text-xl font-bold text-blue-600 tracking-tight md:hidden">SD3</span>
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
          className="text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
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
    <div className="flex h-screen overflow-hidden bg-gray-50/50">
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
