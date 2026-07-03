import { useState, useEffect, useCallback, useRef } from 'react'
import { Bell } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/hooks/use-current-user'
import { supabase } from '@/lib/supabase/client'
import { getNotifications, markAsRead, getUnreadCount } from '@/services/notifications'
import { Link, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'

type NotificationRow = {
  id: string
  title: string
  message: string
  is_read: boolean
  link_to: string | null
  created_at: string
}

export function NotificationBell() {
  const { data: userCtx } = useCurrentUser()
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const navigate = useNavigate()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchUnreadCount = useCallback(async (userId: string) => {
    try {
      const count = await getUnreadCount(userId)
      setUnreadCount(count)
    } catch (err) {
      console.error('Failed to fetch unread count:', err)
    }
  }, [])

  const fetchNotifications = useCallback(
    async (userId: string) => {
      try {
        const data = await getNotifications(userId, 10)
        setNotifications((data || []) as NotificationRow[])
        await fetchUnreadCount(userId)
      } catch (err) {
        console.error('Failed to fetch notifications:', err)
      }
    },
    [fetchUnreadCount],
  )

  useEffect(() => {
    const userId = userCtx?.id
    if (!userId) {
      setNotifications([])
      setUnreadCount(0)
      return
    }

    let isMounted = true

    fetchNotifications(userId)

    const setupChannel = () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }

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
            if (isMounted) fetchNotifications(userId)
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
            if (isMounted) fetchNotifications(userId)
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            if (isMounted) fetchNotifications(userId)
          },
        )
        .subscribe((status) => {
          if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && isMounted) {
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
            reconnectTimeoutRef.current = setTimeout(() => {
              if (isMounted) setupChannel()
            }, 5000)
          }
        })

      channelRef.current = channel
    }

    setupChannel()

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isMounted) {
        fetchNotifications(userId)
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      isMounted = false
      document.removeEventListener('visibilitychange', handleVisibility)
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [userCtx?.id, fetchNotifications])

  const handleRead = async (n: NotificationRow) => {
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
