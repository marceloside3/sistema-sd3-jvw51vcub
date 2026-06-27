import { useCurrentUser } from '@/hooks/use-current-user'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LayoutDashboard, User, MapPin } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

export default function Home() {
  const { data, loading } = useCurrentUser()

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    )
  }

  const { full_name, profile, areas } = data

  const sortedAreas = [...areas].sort((a, b) => {
    if (a.is_principal) return -1
    if (b.is_principal) return 1
    return 0
  })

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Bem-vindo, {full_name}</h1>
        <p className="text-gray-500 mt-2">
          Aqui está o resumo do seu perfil no Sistema Operacional SD3.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="shadow-sm border-gray-100">
          <CardHeader className="pb-3 flex flex-row items-center space-y-0 gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <User className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Seu Perfil</CardTitle>
              <CardDescription>Informações de acesso</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Nível de Acesso</p>
                <p className="font-semibold text-gray-900">{profile?.name || 'Não atribuído'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile?.is_admin && (
                  <Badge variant="default" className="bg-blue-600">
                    🛡️ Admin
                  </Badge>
                )}
                {profile?.is_director && (
                  <Badge
                    variant="secondary"
                    className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-none"
                  >
                    👔 Diretor
                  </Badge>
                )}
                {!profile?.is_admin && !profile?.is_director && (
                  <Badge variant="outline" className="text-gray-500">
                    Padrão
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-100">
          <CardHeader className="pb-3 flex flex-row items-center space-y-0 gap-3">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Suas Áreas</CardTitle>
              <CardDescription>Departamentos vinculados</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {areas.length > 0 ? (
              <ul className="space-y-3">
                {sortedAreas.map((area) => (
                  <li
                    key={area.id}
                    className="flex items-center justify-between border-b border-gray-50 last:border-0 pb-2 last:pb-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{area.is_principal ? '⭐' : '•'}</span>
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{area.name}</span>
                        {area.is_hub && (
                          <span className="text-xs text-green-600 font-medium">HUB</span>
                        )}
                      </div>
                    </div>
                    {area.is_principal && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                        Principal
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="h-full flex items-center justify-center py-6 text-gray-500 text-sm italic">
                Nenhuma área vinculada.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-100 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
          <CardHeader className="pb-3 flex flex-row items-center space-y-0 gap-3">
            <div className="p-2 bg-white/10 text-white rounded-lg">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg text-white">Próximos passos</CardTitle>
              <CardDescription className="text-gray-300">O que vem por aí</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mt-2 text-gray-200">
              <p className="leading-relaxed">
                Em breve: gestão de usuários, áreas, briefings e gates.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
