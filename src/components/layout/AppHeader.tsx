import { useAuth } from '@/hooks/use-auth'
import { useCurrentUser } from '@/hooks/use-current-user'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

export function AppHeader() {
  const { signOut } = useAuth()
  const { data, clearCache } = useCurrentUser()
  const navigate = useNavigate()

  const handleLogout = async () => {
    clearCache()
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <header className="flex items-center justify-between h-16 px-4 border-b bg-white shrink-0 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="md:hidden" />
        <div className="flex items-center gap-2">
          <img
            src="https://img.usecurling.com/i?q=cube&color=blue&shape=fill"
            alt="SD3 Logo"
            className="w-8 h-8 rounded-md"
          />
          <span className="font-bold text-xl text-blue-900 hidden md:block">SD3 OS</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {data && (
          <div className="flex flex-col items-end hidden sm:flex">
            <span className="text-sm font-semibold text-gray-900">{data.user.full_name}</span>
            <span className="text-xs text-gray-500">{data.profile?.name || 'Sem perfil'}</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          title="Sair"
          className="text-gray-500 hover:text-red-600 hover:bg-red-50"
        >
          <LogOut className="w-5 h-5" />
        </Button>
      </div>
    </header>
  )
}
