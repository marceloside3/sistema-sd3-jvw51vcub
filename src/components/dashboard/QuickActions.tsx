import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, FileText, Bell, LayoutDashboard } from 'lucide-react'

export function QuickActions() {
  const actions = [
    {
      label: 'Novo Projeto',
      description: 'Criar um novo projeto',
      icon: Plus,
      href: '/projetos/novo',
      color: 'text-orange-500',
      bg: 'bg-orange-50',
    },

    {
      label: 'Meus Projetos',
      description: 'Ver projetos ativos',
      icon: LayoutDashboard,
      href: '/projetos',
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Notificações',
      description: 'Ver avisos e alertas',
      icon: Bell,
      href: '/notificacoes',
      color: 'text-zinc-700',
      bg: 'bg-zinc-100',
    },
  ]

  return (
    <Card className="shadow-premium border-zinc-100">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4 text-orange-500" />
          Ações Rápidas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3">
          {actions.map((action) => (
            <Button
              key={action.label}
              asChild
              variant="outline"
              className="h-auto p-3 justify-start border-zinc-200 hover:border-orange-300 hover:bg-orange-50/50 transition-all duration-200 group"
            >
              <Link to={action.href}>
                <div className={`p-2 rounded-lg ${action.bg} transition-colors`}>
                  <action.icon className={action.color} />
                </div>
                <div className="ml-2 text-left">
                  <p className="text-sm font-medium text-zinc-900">{action.label}</p>
                  <p className="text-xs text-zinc-400">{action.description}</p>
                </div>
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
