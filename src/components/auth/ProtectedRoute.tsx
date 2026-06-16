import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Loader2 } from 'lucide-react'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-500 font-medium">Verificando sessão...</p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
