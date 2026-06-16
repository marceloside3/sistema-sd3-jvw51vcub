import { useParams } from 'react-router-dom'
import { Construction } from 'lucide-react'
import { MACRO_AREAS } from '@/lib/types'

export default function AreaPage() {
  const { area_slug } = useParams()
  const area = MACRO_AREAS.find((a) => a.slug === area_slug)

  if (!area) {
    return <div className="p-8 text-center text-muted-foreground">Área não encontrada.</div>
  }

  return (
    <div className="flex flex-col items-center justify-center h-[70vh] max-w-md mx-auto text-center space-y-4 animate-fade-in-up">
      <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
        <Construction className="w-10 h-10 text-muted-foreground" />
      </div>
      <h1 className="text-3xl font-bold">Módulo: {area.name}</h1>
      <p className="text-muted-foreground">
        Esta visão específica da área será implementada nas próximas fases. O acesso é restrito via
        combinação de <code>profile_id</code> e <code>area_id</code>.
      </p>
      <div className="text-xs bg-muted/50 text-muted-foreground p-3 rounded border font-mono">
        Routing: /area/{area_slug} <br />
        Auth Required: area_id === {area.id}
      </div>
    </div>
  )
}
