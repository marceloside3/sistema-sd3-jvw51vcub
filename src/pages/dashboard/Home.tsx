import { useState } from 'react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useDashboardData } from '@/hooks/use-dashboard-data'
import { HomeKpiCards } from '@/components/dashboard/HomeKpiCards'
import { RecentDemands } from '@/components/dashboard/RecentDemands'
import { IntranetEmbed } from '@/components/dashboard/IntranetEmbed'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { User, MapPin } from 'lucide-react'

export default function Home() {
  const { data, loading: userLoading } = useCurrentUser()
  const dashboard = useDashboardData()

  if (userLoading || !data) {
    return (
      <div className="space-y-6 animate-page-enter">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 w-full lg:col-span-2" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  const sortedAreas = [...data.areas].sort((a, b) => {
    if (a.is_principal) return -1
    if (b.is_principal) return 1
    return 0
  })

  return (
    <div className="space-y-6 animate-page-enter">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">
          Olá, <span className="text-orange-500">{data.full_name.split(' ')[0]}</span>
        </h1>
        <p className="text-zinc-500 mt-1 text-sm sm:text-base">
          Aqui está o resumo das suas atividades no Sistema Operacional SD3.
        </p>
      </div>

      <HomeKpiCards
        pendingDemands={dashboard.pendingDemands}
        activeProjects={dashboard.activeProjects}
        completedDemands={dashboard.completedDemands}
        totalDemands={dashboard.totalDemands}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <RecentDemands demands={dashboard.recentDemands} loading={dashboard.loading} />
          <Tabs defaultValue="intranet">
            <TabsList>
              <TabsTrigger value="intranet">Intranet</TabsTrigger>
              <TabsTrigger value="perfil">Meu Perfil</TabsTrigger>
            </TabsList>
            <TabsContent value="intranet">
              <IntranetEmbed />
            </TabsContent>
            <TabsContent value="perfil">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="shadow-premium border-zinc-100">
                  <CardHeader className="pb-3 flex flex-row items-center space-y-0 gap-3">
                    <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl">
                      <User fill="currentColor" className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Perfil de Acesso</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="font-semibold text-zinc-900">
                      {data.profile?.name || 'Não atribuído'}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {data.profile?.is_admin && (
                        <Badge className="bg-orange-500 hover:bg-orange-600">Admin</Badge>
                      )}
                      {data.profile?.is_director && (
                        <Badge
                          variant="secondary"
                          className="bg-zinc-700 text-white hover:bg-zinc-700 border-none"
                        >
                          Diretor
                        </Badge>
                      )}
                      {!data.profile?.is_admin && !data.profile?.is_director && (
                        <Badge variant="outline" className="text-zinc-500">
                          Padrão
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-premium border-zinc-100">
                  <CardHeader className="pb-3 flex flex-row items-center space-y-0 gap-3">
                    <div className="p-2.5 bg-zinc-100 text-zinc-700 rounded-xl">
                      <MapPin fill="currentColor" className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Suas Áreas</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {sortedAreas.length > 0 ? (
                      <ul className="space-y-2">
                        {sortedAreas.map((area) => (
                          <li key={area.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className={area.is_principal ? 'text-orange-500' : 'text-zinc-300'}
                              >
                                {area.is_principal ? '★' : '•'}
                              </span>
                              <span className="text-sm font-medium text-zinc-900">{area.name}</span>
                            </div>
                            {area.is_hub && (
                              <Badge
                                variant="outline"
                                className="text-xs text-orange-600 border-orange-300"
                              >
                                HUB
                              </Badge>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-zinc-400 italic">Nenhuma área vinculada.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:col-span-1">
          <QuickActions />
        </div>
      </div>
    </div>
  )
}
