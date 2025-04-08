
import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { notificationService } from '@/services/notificationService';
import { Notification } from '@/lib/database.types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const NotificationsDropdown = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const loadNotifications = () => {
    if (!user) return;
    
    const userNotifications = notificationService.getUserNotifications(user.id);
    setNotifications(userNotifications);
    setUnreadCount(userNotifications.filter(n => !n.is_read).length);
  };

  useEffect(() => {
    if (!user) return;
    
    loadNotifications();
    
    // Listen for new notifications using the custom event
    const handleNewNotification = () => {
      loadNotifications();
    };
    
    window.addEventListener('new-notification', handleNewNotification);
    
    // Subscribe to notification changes through the service
    const unsubscribe = notificationService.subscribe(() => {
      loadNotifications();
    });
    
    return () => {
      window.removeEventListener('new-notification', handleNewNotification);
      unsubscribe();
    };
  }, [user]);

  const handleOpen = (open: boolean) => {
    setIsOpen(open);
    if (open && user) {
      loadNotifications();
    }
  };

  const markAsRead = (notificationId: string) => {
    notificationService.markAsRead(notificationId);
    loadNotifications();
  };

  const markAllAsRead = () => {
    if (!user) return;
    notificationService.markAllAsRead(user.id);
    loadNotifications();
  };

  if (!user) return null;

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="relative p-2" 
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs" 
              onClick={markAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="py-4 px-2 text-sm text-center text-gray-500">
              No notifications yet
            </div>
          ) : (
            notifications.map((notification) => (
              <div 
                key={notification.id}
                className={`
                  p-2 text-sm border-b last:border-b-0 
                  ${notification.is_read ? 'bg-white' : 'bg-gray-50'}
                `}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="font-medium">{notification.title}</div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-gray-500">
                      {format(new Date(notification.created_at), 'HH:mm')}
                    </span>
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="text-gray-700">{notification.message}</div>
                {notification.type !== 'system' && (
                  <Badge 
                    variant="outline" 
                    className="mt-1 text-xs"
                  >
                    {notification.type === 'order' ? 'Order' : 'Referral'}
                  </Badge>
                )}
              </div>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationsDropdown;
