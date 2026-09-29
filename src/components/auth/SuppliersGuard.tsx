import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useCurrentUser } from '@/hooks/use-current-user'
import { toast } from '@/components/ui/use-toast'
import { canAccessSuppliers } from '@/lib/suppliers-permissions'

export function SuppliersGuard({ children }: { children: ReactNode }) {
  const { data, loading } = useCurrentUser()

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Verificando permissões...</div>
  }

  const hasAccess = canAccessSuppliers(data)

  if (!hasAccess) {
    setTimeout(() => {
      toast({
        title: 'Acesso negado',
        description: 'Você não tem permissão para acessar a área de Fornecedores.',
        variant: 'destructive',
      })
    }, 0)
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
