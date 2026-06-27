import { Clock, CheckCircle2, XCircle, AlertTriangle, Send } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDateBR } from '@/lib/utils'

interface G3StatusBadgeProps {
  paper: any
  approverName?: string
}

export function G3StatusBadge({ paper, approverName }: G3StatusBadgeProps) {
  if (!paper) return null

  switch (paper.status) {
    case 'draft':
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-600">
          <Send className="w-3 h-3 mr-1" /> Rascunho
        </Badge>
      )

    case 'submitted':
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700">
          <Clock className="w-3 h-3 mr-1" /> Aguardando aprovação do Diretor de Planejamento
        </Badge>
      )

    case 'approved':
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Aprovado em {paper.approved_at ? formatDateBR(paper.approved_at) : '—'}
          {approverName ? ` por ${approverName}` : ''}
        </Badge>
      )

    case 'rejected':
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700">
          <XCircle className="w-3 h-3 mr-1" /> Recusado pelo Diretor
        </Badge>
      )

    case 'override':
      return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700">
          <AlertTriangle className="w-3 h-3 mr-1" /> Override aplicado
          {paper.override_at ? ` em ${formatDateBR(paper.override_at)}` : ''}
        </Badge>
      )

    default:
      return null
  }
}
