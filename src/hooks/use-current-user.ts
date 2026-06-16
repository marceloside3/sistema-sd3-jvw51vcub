import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from './use-auth'

type Area = {
  id: string
  code: string
  name: string
  is_hub: boolean
  is_principal: boolean
}

type Profile = {
  id: string
  code: string
  name: string
  is_director: boolean
  is_admin: boolean
  is_system: boolean
}

type UserData = {
  id: string
  email: string
  full_name: string
  is_active: boolean
  last_login_at: string | null
}

interface CurrentUserContextType {
  data: {
    user: UserData
    profile: Profile | null
    areas: Area[]
  } | null
  loading: boolean
  clearCache: () => void
}

const CurrentUserContext = createContext<CurrentUserContextType | undefined>(undefined)

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth()
  const [data, setData] = useState<CurrentUserContextType['data']>(null)
  const [loading, setLoading] = useState(true)

  const clearCache = useCallback(() => {
    setData(null)
  }, [])

  useEffect(() => {
    let isMounted = true

    async function fetchUser() {
      setLoading(true)
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser()
        if (authError || !authData?.user) {
          if (isMounted) {
            setData(null)
            setLoading(false)
          }
          return
        }

        const userId = authData.user.id

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select(`
            id, email, full_name, is_active, last_login_at,
            profile:profiles(id, code, name, is_director, is_admin, is_system)
          `)
          .eq('id', userId)
          .single()

        if (userError) throw userError

        const { data: areasData, error: areasError } = await supabase
          .from('area_responsibles')
          .select(`
            area_id,
            is_principal,
            areas(id, code, name, is_hub)
          `)
          .eq('user_id', userId)

        if (areasError) throw areasError

        if (isMounted) {
          const profileData = userData.profile
            ? Array.isArray(userData.profile)
              ? userData.profile[0]
              : userData.profile
            : null

          setData({
            user: {
              id: userData.id,
              email: userData.email,
              full_name: userData.full_name,
              is_active: userData.is_active,
              last_login_at: userData.last_login_at,
            },
            profile: profileData as Profile | null,
            areas: (areasData || []).map((a: any) => ({
              id: a.areas?.id,
              code: a.areas?.code,
              name: a.areas?.name,
              is_hub: a.areas?.is_hub,
              is_principal: a.is_principal,
            })),
          })
        }
      } catch (err) {
        console.error('Error fetching current user:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    if (session) {
      fetchUser()
    } else {
      if (isMounted) {
        setData(null)
        setLoading(false)
      }
    }

    return () => {
      isMounted = false
    }
  }, [session])

  return React.createElement(
    CurrentUserContext.Provider,
    { value: { data, loading, clearCache } },
    children,
  )
}

export function useCurrentUser() {
  const context = useContext(CurrentUserContext)
  if (context === undefined) {
    throw new Error('useCurrentUser must be used within a CurrentUserProvider')
  }
  return context
}
