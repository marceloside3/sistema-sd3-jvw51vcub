import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

interface AuthContextType {
  user: User | null
  session: Session | null
  signUp: (email: string, password: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession)
      setUser(currentSession?.user ?? null)
      setLoading(false)
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/` },
    })
    return { error }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        const errorMsg = error.message || ''
        const isNetworkError =
          errorMsg.toLowerCase().includes('failed to fetch') ||
          errorMsg.toLowerCase().includes('network') ||
          (error as any).status === 0 ||
          ((error as any).status === undefined && errorMsg.includes('fetch'))

        if (isNetworkError) {
          return {
            error: {
              message:
                'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
            },
          }
        }

        return { error: { message: error.message || 'Credenciais inválidas' } }
      }

      if (data.user) {
        // Update last_login_at in public.users on successful sign in
        try {
          await supabase
            .from('users')
            .update({ last_login_at: new Date().toISOString() })
            .eq('id', data.user.id)
        } catch {
          // Non-blocking: sign-in still succeeded even if last_login_at update fails
        }
      }

      return { error: null }
    } catch (err: any) {
      const message = err?.message || ''
      const isNetwork =
        message.toLowerCase().includes('failed to fetch') ||
        message.toLowerCase().includes('network') ||
        err?.name === 'TypeError'

      return {
        error: {
          message: isNetwork
            ? 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
            : message || 'Erro ao realizar login. Tente novamente.',
        },
      }
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  return (
    <AuthContext.Provider value={{ user, session, signUp, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
