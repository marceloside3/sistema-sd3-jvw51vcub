import {
  createContext,
  useContext,
  useEffect,
  useState,
  createElement,
  type ReactNode,
} from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'

interface Area {
  id: string
  code: string
  name: string
  is_principal: boolean
  is_hub: boolean
}

interface Profile {
  id: string
  code: string
  name: string
  is_admin: boolean
  is_director: boolean
  is_active: boolean
}

interface CurrentUserData {
  id: string
  email: string
  full_name: string
  profile: Profile | null
  areas: Area[]
}

interface CurrentUserContextType {
  data: CurrentUserData | null
  loading: boolean
}

const CurrentUserContext = createContext<CurrentUserContextType | undefined>(undefined)

export function useCurrentUser() {
  const context = useContext(CurrentUserContext)
  if (!context) {
    throw new Error('useCurrentUser must be used within a CurrentUserProvider')
  }
  return context
}

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [data, setData] = useState<CurrentUserData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setData(null)
      setLoading(false)
      return
    }

    let cancelled = false

    async function loadUserData() {
      try {
        const [userRes, areasRes] = await Promise.all([
          supabase
            .from('users')
            .select(
              `id, email, full_name, is_active,
              profile:profiles(id, code, name, is_admin, is_director, is_active)`,
            )
            .eq('id', user.id)
            .maybeSingle(),
          supabase
            .from('area_responsibles')
            .select(`is_principal, area:areas(id, code, name, is_hub)`)
            .eq('user_id', user.id),
        ])

        if (cancelled) return

        if (userRes.data) {
          setData({
            id: userRes.data.id,
            email: userRes.data.email,
            full_name: userRes.data.full_name,
            profile: userRes.data.profile as unknown as Profile,
            areas: (areasRes.data || [])
              .map((item: any) => ({
                ...item.area,
                is_principal: item.is_principal ?? false,
              }))
              .filter((a: any) => a.id) as Area[],
          })
        } else {
          setData({
            id: user.id,
            email: user.email || '',
            full_name: (user.user_metadata?.full_name as string) || user.email || '',
            profile: null,
            areas: [],
          })
        }
      } catch (error) {
        console.error('Failed to load user data:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadUserData()

    return () => {
      cancelled = true
    }
  }, [user])

  return createElement(CurrentUserContext.Provider, { value: { data, loading } }, children)
}
