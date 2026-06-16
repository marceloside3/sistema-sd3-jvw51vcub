import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

export default function AuditReport() {
  const dummyAudits = [
    {
      id: '1',
      action: 'Override Gate 2: Estratégia Aprovada',
      user: 'Marcelo (Admin)',
      project: 'Campanha de Verão 2027',
      date: new Date().toISOString(),
      status: 'Warning',
    },
    {
      id: '2',
      action: 'Aprovação Gate 1: Briefing Validado',
      user: 'João (Planejamento)',
      project: 'Lançamento Produto X',
      date: new Date(Date.now() - 86400000).toISOString(),
      status: 'OK',
    },
    {
      id: '3',
      action: 'Alerta SLA: Atraso na Criação',
      user: 'Sistema',
      project: 'Rebranding Corp',
      date: new Date(Date.now() - 172800000).toISOString(),
      status: 'Late',
    },
  ]

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Relatório de Auditoria</h1>
        <p className="text-muted-foreground mt-2">
          Acompanhe todas as ações, exceções e histórico de mudanças nos portões de governança.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico Recente</CardTitle>
          <CardDescription>Últimas atividades e exceções registradas no sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ação</TableHead>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dummyAudits.map((audit) => (
                  <TableRow key={audit.id}>
                    <TableCell className="font-medium">{audit.action}</TableCell>
                    <TableCell>{audit.project}</TableCell>
                    <TableCell>{audit.user}</TableCell>
                    <TableCell>{format(new Date(audit.date), 'dd/MM/yyyy HH:mm')}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          audit.status === 'Warning'
                            ? 'secondary'
                            : audit.status === 'Late'
                              ? 'destructive'
                              : 'default'
                        }
                      >
                        {audit.status === 'Warning'
                          ? 'Atenção'
                          : audit.status === 'Late'
                            ? 'Atrasado'
                            : 'OK'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
