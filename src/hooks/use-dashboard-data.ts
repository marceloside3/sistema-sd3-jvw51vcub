import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'

export interface DashboardDemand {
  id: string
  title: string
  status: string
  priority: string
  due_date: string | null
  created_at: string
  project_name: string | null
  from_user_name: string | null
}

interface DashboardData {
  pendingDemands: number
  activeProjects: number
  completedDemands: number
  totalDemands: number
  recentDemands: DashboardDemand[]
  loading: boolean
}

export function useDashboardData(): DashboardData {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData>({
    pendingDemands: 0,
    activeProjects: 0,
    completedDemands: 0,
    totalDemands: 0,
    recentDemands: [],
    loading: true,
  })

  useEffect(() => {
    if (!user) {
      setData({
        pendingDemands: 0,
        activeProjects: 0,
        completedDemands: 0,
        totalDemands: 0,
        recentDemands: [],
        loading: false,
      })
      return
    }

    let cancelled = false

    async function loadData() {
      try {
        const [demandsRes, projectsRes] = await Promise.all([
          supabase
            .from('demands')
            .select(
              `id, title, status, priority, due_date, created_at,
              project:projects(name),
              from_user:users!demands_from_user_id_fkey(full_name)`,
            )
            .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
            .order('created_at', { ascending: false })
            .limit(50),
          supabase
            .from('projects')
            .select('id, status', { count: 'exact', head: true })
            .eq('status', 'active'),
        ])

        if (cancelled) return

        const demands = demandsRes.data || []
        const recentDemands: DashboardDemand[] = demands.slice(0, 5).map((d: any) => ({
          id: d.id,
          title: d.title,
          status: d.status,
          priority: d.priority,
          due_date: d.due_date,
          created_at: d.created_at,
          project_name: d.project?.name ?? null,
          from_user_name: d.from_user?.full_name ?? null,
        }))

        setData({
          pendingDemands: demands.filter((d: any) => d.status === 'pending').length,
          activeProjects: projectsRes.count ?? 0,
          completedDemands: demands.filter((d: any) => d.status === 'completed').length,
          totalDemands: demands.length,
          recentDemands,
          loading: false,
        })
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
        if (!cancelled) {
          setData((prev) => ({ ...prev, loading: false }))
        }
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [user])

  return data
}
