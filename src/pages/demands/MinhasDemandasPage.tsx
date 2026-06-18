import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { getDemands } from '@/services/demands'
import { useCurrentUser } from '@/hooks/use-current-user'
import { format } from 'date-fns'

export default function MinhasDemandasPage() {
  const { data: currentUser } = useCurrentUser()
  const [demands, setDemands] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'received' | 'sent' | 'completed'>('received')

  useEffect(() => {
    if (!currentUser?.user?.id) return
    setLoading(true)
    getDemands({ type: tab, userId: currentUser.user.id })
      .then(setDemands)
      .finally(() => setLoading(false))
  }, [tab, currentUser?.user?.id])

  const renderTable = () => (
    <div className="border rounded-md bg-white shadow-sm overflow-hidden mt-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Projeto</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Prazo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                Carregando...
              </TableCell>
            </TableRow>
          ) : demands.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                Nenhuma demanda encontrada.
              </TableCell>
            </TableRow>
          ) : (
            demands.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  <Link
                    to={`/demandas/${d.id}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {d.title}
                  </Link>
                </TableCell>
                <TableCell className="text-xs text-gray-600 font-medium">
                  {d.project?.project_code}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      d.priority === 'urgent'
                        ? 'border-red-600 text-red-600'
                        : d.priority === 'high'
                          ? 'border-orange-500 text-orange-500'
                          : 'border-gray-300'
                    }
                  >
                    {d.priority}
                  </Badge>
                </TableCell>
                <TableCell>{d.status}</TableCell>
                <TableCell>
                  {d.due_date ? format(new Date(d.due_date), 'dd/MM/yyyy') : '-'}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Minhas Demandas</h1>
          <p className="text-sm text-gray-500">
            Gerencie as tarefas que você pediu ou que pediram para você.
          </p>
        </div>
        <Button asChild>
          <Link to="/demandas/nova">
            <Plus className="w-4 h-4 mr-2" />
            Nova Demanda
          </Link>
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
        <TabsList>
          <TabsTrigger value="received">Recebidas</TabsTrigger>
          <TabsTrigger value="sent">Enviadas</TabsTrigger>
          <TabsTrigger value="completed">Concluídas</TabsTrigger>
        </TabsList>
        <TabsContent value="received">{renderTable()}</TabsContent>
        <TabsContent value="sent">{renderTable()}</TabsContent>
        <TabsContent value="completed">{renderTable()}</TabsContent>
      </Tabs>
    </div>
  )
}
