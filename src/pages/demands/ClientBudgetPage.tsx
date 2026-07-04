import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { supabase } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/financial'
import { formatDateBR } from '@/lib/utils'
import logoUrl from '@/assets/logoside3-0c37e.png'

interface BudgetItem {
  id: string
  item_name: string
  description: string | null
  quantity: number
  unit_price: number | null
  honorarios_percentage: number
}

export default function ClientBudgetPage() {
  const { id } = useParams()
  const [demand, setDemand] = useState<any>(null)
  const [items, setItems] = useState<BudgetItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) loadData()
  }, [id])

  async function loadData() {
    setLoading(true)
    try {
      const [demandRes, itemsRes] = await Promise.all([
        supabase
          .from('demands')
          .select(`
            *,
            project:projects(id, name, project_code, client:clients(id, name))
          `)
          .eq('id', id!)
          .single(),
        supabase
          .from('demand_items')
          .select('id, item_name, description, quantity, unit_price, honorarios_percentage')
          .eq('demand_id', id!)
          .order('created_at', { ascending: true }),
      ])
      if (demandRes.error) throw demandRes.error
      if (itemsRes.error) throw itemsRes.error
      setDemand(demandRes.data)
      setItems(itemsRes.data as BudgetItem[])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8 text-center">Carregando...</div>
  if (!demand) return <div className="p-8 text-center">Demanda não encontrada</div>

  const subtotal = items.reduce((sum, item) => sum + item.quantity * (item.unit_price ?? 0), 0)
  const totalHonorarios = items.reduce((sum, item) => {
    const itemTotal = item.quantity * (item.unit_price ?? 0)
    return sum + itemTotal * ((item.honorarios_percentage ?? 0) / 100)
  }, 0)
  const grandTotal = subtotal + totalHonorarios

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Button asChild variant="ghost" size="icon">
          <Link to={`/demandas/${demand.id}`}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <Button onClick={() => window.print()} variant="outline">
          <Printer className="w-4 h-4 mr-2" />
          Imprimir / PDF
        </Button>
      </div>

      <Card className="print:shadow-none print:border-0">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logoUrl} alt="Side3 Comunicação" className="h-16 w-auto object-contain" />
          </div>
          <CardTitle className="text-2xl">Orçamento</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Emitido em {formatDateBR(new Date().toISOString())}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Cliente:</span>
              <p className="font-semibold">{demand.project?.client?.name || '—'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Projeto:</span>
              <p className="font-semibold">
                {demand.project?.project_code} — {demand.project?.name}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Demanda:</span>
              <p className="font-semibold">{demand.title}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Prazo:</span>
              <p className="font-semibold">{formatDateBR(demand.due_date)}</p>
            </div>
          </div>

          {demand.description && (
            <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
              {demand.description}
            </div>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="hidden md:table-cell">Descrição</TableHead>
                  <TableHead className="text-center">Qtd.</TableHead>
                  <TableHead className="text-right">Valor Unit.</TableHead>
                  <TableHead className="text-right">Honorários</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const itemTotal = item.quantity * (item.unit_price ?? 0)
                  const honorarios = itemTotal * ((item.honorarios_percentage ?? 0) / 100)
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.item_name}</TableCell>
                      <TableCell className="hidden md:table-cell max-w-xs text-sm text-muted-foreground">
                        {item.description || '—'}
                      </TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(item.unit_price)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(honorarios)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">
                        {formatCurrency(itemTotal + honorarios)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <div className="ml-auto max-w-xs space-y-2 pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Honorários</span>
              <span className="font-mono font-medium">{formatCurrency(totalHonorarios)}</span>
            </div>
            <div className="flex items-center justify-between border-t-2 pt-2 font-bold text-base">
              <span>Total Geral</span>
              <span className="font-mono">{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          <div className="border-t pt-6 mt-8 text-center text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-sm text-foreground">Side3 Comunicação Eireli</p>
            <p>CNPJ 18.231.317/0001-02</p>
            <p>Rua Baluarte, 361 - Vila Olímpia - São Paulo - SP - CEP 04549-011</p>
            <p>Tel. 11 2365-5195</p>
          </div>

          <p className="text-xs text-muted-foreground text-center pt-4">
            Orçamento válido por 30 dias a partir da data de emissão.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
