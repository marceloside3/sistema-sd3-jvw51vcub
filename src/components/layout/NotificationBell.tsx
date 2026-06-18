import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { useCurrentUser } from '@/hooks/use-current-user'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export function NotificationBell() {
  const { data } = useCurrentUser()
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    const userId = data?.user?.id
    if (!userId) return

    let isMounted = true

    const fetchNotifications = async () => {
      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (notifs && isMounted) {
        setNotifications(notifs)
        setUnreadCount(notifs.filter((n) => !n.is_read).length)
      }
    }

    fetchNotifications()

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (isMounted) {
            setNotifications((prev) => [payload.new, ...prev].slice(0, 10))
            setUnreadCount((prev) => prev + 1)
          }
        },
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [data?.user?.id])

  const handleRead = async (notif: any) => {
    if (!notif.is_read) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id)
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
    if (notif.link) {
      navigate(notif.link)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-red-600"></span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
          <span className="text-sm font-semibold">Notificações</span>
          <Link to="/notificacoes" className="text-xs text-blue-600 hover:underline">
            Ver todas
          </Link>
        </div>
        <div className="max-h-[300px] overflow-y-auto bg-white">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">Nenhuma notificação</div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleRead(n)}
                className={`p-3 border-b last:border-0 cursor-pointer hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-blue-50/50' : ''}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-medium">{n.title}</span>
                  {!n.is_read && <span className="h-2 w-2 rounded-full bg-blue-600 mt-1"></span>}
                </div>
                <p className="text-xs text-gray-600 line-clamp-2">{n.message}</p>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
