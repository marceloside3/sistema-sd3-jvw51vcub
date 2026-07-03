import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/hooks/use-current-user'
import { supabase } from '@/lib/supabase/client'
import { getNotifications, markAsRead } from '@/services/notifications'
import { Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'

export function NotificationBell() {
  const { data: userCtx } = useCurrentUser()
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    const userId = userCtx?.user?.id
    if (!userId) return

    let isMounted = true

    const fetchNotifications = async () => {
      const data = await getNotifications(userId, 10)
      if (isMounted) {
        setNotifications(data || [])
        setUnreadCount((data || []).filter((n: any) => !n.is_read).length)
      }
    }

    fetchNotifications()

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          if (isMounted) fetchNotifications()
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          if (isMounted) fetchNotifications()
        },
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [userCtx?.user?.id])

  const handleRead = async (n: any) => {
    if (!n.is_read) {
      await markAsRead(n.id)
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
    if (n.link_to) navigate(n.link_to)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-orange-50 transition-colors"
        >
          <Bell className="w-5 h-5 text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white animate-fade-in">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Notificações</h3>
          <Link
            to="/notificacoes"
            className="text-xs text-orange-500 hover:text-orange-600 hover:underline transition-colors"
          >
            Ver todas
          </Link>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">Nenhuma notificação</div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3 border-b last:border-0 cursor-pointer hover:bg-orange-50/50 transition-colors ${!n.is_read ? 'bg-orange-50/30' : ''}`}
                onClick={() => handleRead(n)}
              >
                <div className="flex justify-between items-start mb-1 gap-2">
                  <span className="font-medium text-sm text-gray-900 leading-tight">{n.title}</span>
                  {!n.is_read && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-orange-500 mt-1" />
                  )}
                </div>
                <p className="text-xs text-gray-600 line-clamp-2 mt-1">{n.message}</p>
                <span className="text-[10px] text-gray-400 mt-2 block">
                  {format(new Date(n.created_at), "dd/MM 'às' HH:mm")}
                </span>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
