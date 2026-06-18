import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { CheckCheck, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getNotifications, markAllAsRead, markAsRead } from '@/services/notifications'
import { useCurrentUser } from '@/hooks/use-current-user'

export default function NotificationsPage() {
  const { data: userCtx } = useCurrentUser()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userCtx?.user?.id) fetchNotifications()
  }, [userCtx?.user?.id])

  async function fetchNotifications() {
    try {
      const data = await getNotifications(userCtx!.user.id, 100)
      setNotifications(data)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAll = async () => {
    await markAllAsRead(userCtx!.user.id)
    setNotifications(notifications.map((n) => ({ ...n, is_read: true })))
  }

  const handleRead = async (id: string, isRead: boolean) => {
    if (!isRead) {
      await markAsRead(id)
      setNotifications(notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-gray-400" />
          <h1 className="text-2xl font-bold">Todas as Notificações</h1>
        </div>
        <Button variant="outline" size="sm" onClick={handleMarkAll}>
          <CheckCheck className="w-4 h-4 mr-2" /> Marcar todas como lidas
        </Button>
      </div>

      <div className="bg-white rounded-lg border shadow-sm divide-y">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Nenhuma notificação encontrada.</div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className={`p-4 transition-colors ${n.is_read ? '' : 'bg-blue-50/30'}`}>
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {!n.is_read && <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />}
                    <h4 className="font-medium text-gray-900">{n.title}</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{n.message}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>{format(new Date(n.created_at), "dd/MM/yyyy 'às' HH:mm")}</span>
                  </div>
                </div>
                {n.link && (
                  <Button
                    variant="secondary"
                    size="sm"
                    asChild
                    onClick={() => handleRead(n.id, n.is_read)}
                  >
                    <Link to={n.link}>Acessar</Link>
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
