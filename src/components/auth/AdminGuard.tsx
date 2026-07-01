import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useCurrentUser } from '@/hooks/use-current-user'
import { toast } from '@/components/ui/use-toast'

export function AdminGuard({ children }: { children: ReactNode }) {
  const { data, isLoading } = useCurrentUser()

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Verificando permissões...</div>
  }

  const hasAccess =
    data?.profile?.is_admin || data?.profile?.is_director || data?.profile?.is_system

  if (!hasAccess) {
    setTimeout(() => {
      toast({
        title: 'Acesso negado',
        description: 'Você não tem permissão para acessar essa área.',
        variant: 'destructive',
      })
    }, 0)
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
