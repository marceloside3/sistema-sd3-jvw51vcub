import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getMyDemands } from '@/services/demands'
import { useCurrentUser } from '@/hooks/use-current-user'

export default function MyDemandsPage() {
  const { data: userCtx } = useCurrentUser()
  const [activeTab, setActiveTab] = useState<'received' | 'sent' | 'completed'>('received')
  const [demands, setDemands] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    if (userCtx?.user?.id) fetchDemands()
  }, [activeTab, userCtx?.user?.id, statusFilter])

  async function fetchDemands() {
    setLoading(true)
    try {
      const data = await getMyDemands(userCtx!.user.id, activeTab, { status: statusFilter })
      setDemands(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const renderDemandCard = (d: any) => (
    <Card key={d.id} className="hover:border-blue-300 transition-colors">
      <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Link
              to={`/demandas/${d.id}`}
              className="font-semibold hover:text-blue-600 transition-colors text-lg"
            >
              {d.title}
            </Link>
            <Badge variant="secondary" className="text-[10px]">
              {d.project?.project_code}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mb-2">Projeto: {d.project?.name}</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              De: {d.from_user?.full_name.split(' ')[0]} ({d.from_area?.name})
            </Badge>
            <Badge variant="outline" className="text-xs">
              Para: {d.to_user?.full_name.split(' ')[0] || 'Área'} ({d.to_area?.name})
            </Badge>
            {d.priority === 'urgent' && (
              <Badge variant="destructive" className="text-xs">
                Urgente
              </Badge>
            )}
          </div>
        </div>
        <div className="text-right shrink-0 flex flex-col items-end">
          <Badge className="mb-2 uppercase" variant={d.status === 'done' ? 'default' : 'secondary'}>
            {d.status}
          </Badge>
          <span className="text-xs text-gray-400">
            Prazo: {d.due_date ? format(new Date(d.due_date), 'dd/MM/yyyy') : '-'}
          </span>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Minhas Demandas</h1>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="in_progress">Em Andamento</SelectItem>
            <SelectItem value="review">Em Revisão</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="received">Recebidas</TabsTrigger>
          <TabsTrigger value="sent">Enviadas</TabsTrigger>
          <TabsTrigger value="completed">Concluídas</TabsTrigger>
        </TabsList>

        <div className="space-y-4">
          {loading ? (
            <div className="py-8 text-center text-gray-500">Carregando...</div>
          ) : demands.length === 0 ? (
            <div className="py-12 text-center text-gray-500 bg-white rounded-lg border border-dashed">
              Nenhuma demanda encontrada nesta aba.
            </div>
          ) : (
            demands.map(renderDemandCard)
          )}
        </div>
      </Tabs>
    </div>
  )
}
