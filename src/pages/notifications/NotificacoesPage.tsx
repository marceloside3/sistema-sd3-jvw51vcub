import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { useCurrentUser } from '@/hooks/use-current-user'
import { format } from 'date-fns'

export default function NotificacoesPage() {
  const { data: currentUser } = useCurrentUser()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = async () => {
    if (!currentUser?.user?.id) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', currentUser.user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (data) setNotifications(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchNotifications()
  }, [currentUser?.user?.id])

  const markAllAsRead = async () => {
    if (!currentUser?.user?.id) return
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', currentUser.user.id)
      .eq('is_read', false)
    fetchNotifications()
  }

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Notificações</h1>
        <Button variant="outline" size="sm" onClick={markAllAsRead}>
          <CheckCheck className="w-4 h-4 mr-2" /> Marcar todas como lidas
        </Button>
      </div>

      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Você não tem notificações.</div>
        ) : (
          <div className="divide-y">
            {notifications.map((n) => (
              <div key={n.id} className={`p-4 flex gap-4 ${!n.is_read ? 'bg-blue-50/30' : ''}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-600"></span>}
                    <span className="font-medium text-sm">{n.title}</span>
                    <span className="text-xs text-gray-500 ml-auto">
                      {format(new Date(n.created_at), 'dd/MM HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{n.message}</p>
                  {n.link && (
                    <Link
                      to={n.link}
                      className="text-xs text-blue-600 font-medium hover:underline mt-2 inline-block"
                      onClick={() => !n.is_read && markAsRead(n.id)}
                    >
                      Acessar link
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
