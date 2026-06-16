import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session: contextSession, loading: contextLoading } = useAuth()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!contextLoading) {
      setIsAuthenticated(!!contextSession)
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setIsAuthenticated(!!newSession)
      if (!newSession) {
        navigate('/login', { replace: true })
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [contextSession, contextLoading, navigate])

  if (contextLoading || isAuthenticated === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-500 font-medium">Carregando...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
