import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useCurrentUser } from '@/hooks/use-current-user'
import { toast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

export function HubGuard({ children }: { children: ReactNode }) {
  const { data, loading } = useCurrentUser()

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Verificando permissões...</div>
  }

  const allowedProfiles = ['admin', 'diretor', 'super_admin', 'atendimento', 'planejamento']
  const hasAccess =
    (data?.profile && allowedProfiles.includes(data.profile.code)) ||
    data?.profile?.is_admin ||
    data?.profile?.is_director

  if (!hasAccess) {
    setTimeout(() => {
      toast({
        title: 'Acesso negado',
        description: 'Você não tem permissão para acessar o HUB Atendimento.',
        variant: 'destructive',
      })
    }, 0)
    return <Navigate to="/" replace />
  }

  return <div className={cn('contents')}>{children}</div>
}
