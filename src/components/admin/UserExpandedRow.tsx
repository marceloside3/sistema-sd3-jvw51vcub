import { TableCell, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Star, Layers } from 'lucide-react'
import { format } from 'date-fns'

interface UserArea {
  is_principal: boolean
  area: { id: string; name: string } | null
}

interface UserExpandedRowProps {
  user: {
    last_login_at: string | null
    created_at: string
    areas: UserArea[] | null
  }
  colSpan: number
}

function safeAreas(areas: UserArea[] | null | undefined): UserArea[] {
  if (!Array.isArray(areas)) return []
  return areas.filter((a) => a && a.area && a.area.id)
}

export function UserExpandedRow({ user, colSpan }: UserExpandedRowProps) {
  const userAreas = safeAreas(user.areas)

  return (
    <TableRow className="bg-muted/30 hover:bg-muted/30">
      <TableCell colSpan={colSpan} className="py-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 px-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> Último Login
            </div>
            <span className="text-sm text-gray-600">
              {user.last_login_at
                ? format(new Date(user.last_login_at), 'dd/MM/yyyy HH:mm')
                : 'Nunca'}
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" /> Criado em
            </div>
            <span className="text-sm text-gray-600">
              {format(new Date(user.created_at), 'dd/MM/yyyy')}
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Layers className="h-3 w-3" /> Áreas
            </div>
            <div className="flex flex-wrap gap-1">
              {userAreas.length === 0 && <span className="text-gray-400 text-xs">Sem área</span>}
              {userAreas.map((a) => (
                <Badge
                  key={a.area?.id}
                  variant={a.is_principal ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {a.is_principal && <Star className="h-3 w-3 mr-1" />}
                  {a.area?.name ?? 'Área removida'}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </TableCell>
    </TableRow>
  )
}
