
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
    loadNotifications();
    
    // Listen for new notifications
    const handleNewNotification = () => {
      loadNotifications();
    };
    
    window.addEventListener('new-notification', handleNewNotification);
    
    return () => {
      window.removeEventListener('new-notification', handleNewNotification);
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
                      {format(new Date(notification.created_at), 'MMM d, HH:mm')}
                    </span>
                    {!notification.is_read && (
                      <CheckCircle 
                        className="h-4 w-4 text-green-500 cursor-pointer"
                        onClick={() => markAsRead(notification.id)}
                      />
                    )}
                  </div>
                </div>
                <p className="text-gray-600">{notification.message}</p>
                <div className="mt-1">
                  <Badge variant="outline" className="text-xs">
                    {notification.type}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationsDropdown;
