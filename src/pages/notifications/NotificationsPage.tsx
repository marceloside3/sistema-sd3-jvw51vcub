import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentUser } from '@/hooks/use-current-user'
import { getNotifications, markAsRead, markAllAsRead } from '@/services/notifications'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { format } from 'date-fns'

const RedirectLink = ({ url }: { url: string }) => {
  const navigate = useNavigate()
  return (
    <Button
      variant="outline"
      size="sm"
      className="ml-4 shrink-0"
      onClick={(e) => {
        e.stopPropagation()
        navigate(url)
      }}
    >
      Acessar
    </Button>
  )
}

export default function NotificationsPage() {
  const { data: userCtx, loading: userLoading } = useCurrentUser()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const userId = userCtx?.id
    if (!userId) return

    let isMounted = true

    async function loadNotifications() {
      try {
        const data = await getNotifications(userId, 50)
        if (isMounted) {
          setNotifications(data || [])
          setLoading(false)
        }
      } catch (err) {
        if (isMounted) setLoading(false)
      }
    }

    loadNotifications()

    const intervalId = setInterval(loadNotifications, 30000)

    const onFocus = () => {
      loadNotifications()
    }
    window.addEventListener('focus', onFocus)

    return () => {
      isMounted = false
      clearInterval(intervalId)
      window.removeEventListener('focus', onFocus)
    }
  }, [userCtx?.id])

  const handleRead = async (n: any) => {
    if (!n.is_read) {
      await markAsRead(n.id)
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)))
    }
    if (n.link_to) navigate(n.link_to)
  }

  const handleMarkAll = async () => {
    const userId = userCtx?.id
    if (!userId) return
    await markAllAsRead(userId)
    setNotifications((prev) => prev.map((x) => ({ ...x, is_read: true })))
  }

  if (userLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Notificações</h1>
        <Button onClick={handleMarkAll} variant="outline" size="sm">
          Marcar todas como lidas
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Carregando notificações...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Nenhuma notificação no momento</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleRead(n)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors flex justify-between items-start ${
                    !n.is_read ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div>
                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                      {n.title}
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-600" />}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">{n.message}</p>
                    <span className="text-xs text-gray-400 mt-2 block">
                      {format(new Date(n.created_at), "dd/MM/yyyy 'às' HH:mm")}
                    </span>
                  </div>
                  {n.link_to && <RedirectLink url={n.link_to} />}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
