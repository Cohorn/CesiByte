
import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { notificationService } from '@/services/notificationService';
import { Button } from '@/components/ui/button';

interface NotificationIndicatorProps {
  onClick: () => void;
}

const NotificationIndicator: React.FC<NotificationIndicatorProps> = ({ onClick }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    
    // Initial count
    setUnreadCount(notificationService.getUnreadCount(user.id));
    
    // Listen for new notifications
    const handleNewNotification = () => {
      setUnreadCount(notificationService.getUnreadCount(user.id));
    };
    
    window.addEventListener('new-notification', handleNewNotification);
    
    return () => {
      window.removeEventListener('new-notification', handleNewNotification);
    };
  }, [user]);

  if (!user) return null;

  return (
    <Button 
      variant="ghost" 
      className="relative p-2" 
      onClick={onClick}
      aria-label="Notifications"
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Button>
  );
};

export default NotificationIndicator;
