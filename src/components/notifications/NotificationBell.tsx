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

    async function loadNotifications() {
      const data = await getNotifications(userId, 10)
      if (isMounted) {
        setNotifications(data || [])
        setUnreadCount((data || []).filter((n: any) => !n.is_read).length)
      }
    }

    loadNotifications()

    const channel = supabase
      .channel(`notifications_bell_component:${userId}`)
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
  }, [userCtx?.user?.id])

  const handleRead = async (n: any) => {
    if (!n.is_read) {
      await markAsRead(n.id)
      setUnreadCount((prev) => Math.max(0, prev - 1))
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)))
    }
    if (n.link) navigate(n.link)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5 text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Notificações</h3>
          <Link to="/notificacoes" className="text-xs text-blue-600 hover:underline">
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
                className={`p-3 border-b last:border-0 cursor-pointer hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-blue-50/50' : ''}`}
                onClick={() => handleRead(n)}
              >
                <div className="flex justify-between items-start mb-1 gap-2">
                  <span className="font-medium text-sm text-gray-900 leading-tight">{n.title}</span>
                  {!n.is_read && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600 mt-1" />
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
