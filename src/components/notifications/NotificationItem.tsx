
import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Bell, ShoppingBag, Truck, AlertCircle, Check, Utensils } from 'lucide-react';
import { NotificationProps } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NotificationItemProps {
  notification: NotificationProps;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ 
  notification, 
  onRead,
  onDelete
}) => {
  const { id, title, message, time, read, type } = notification;
  
  // Icon based on notification type
  const getIcon = () => {
    switch (type) {
      case 'order':
        return <ShoppingBag className="h-4 w-4" />;
      case 'restaurant':
        return <Utensils className="h-4 w-4" />;
      case 'courier':
        return <Truck className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };
  
  return (
    <div className={cn(
      "p-3 border-b border-slate-100 relative",
      !read && "bg-slate-50"
    )}>
      {!read && (
        <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-blue-600" />
      )}
      
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 rounded-full bg-slate-100 p-2">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">{title}</h4>
          <p className="text-sm text-muted-foreground line-clamp-2">{message}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(time), { addSuffix: true })}
          </p>
        </div>
      </div>
      
      <div className="flex justify-end gap-2 mt-2">
        {!read && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onRead(id)}
            className="h-8 px-2"
          >
            <Check className="h-4 w-4 mr-1" />
            Mark read
          </Button>
        )}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onDelete(id)}
          className="h-8 px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
        >
          Delete
        </Button>
      </div>
    </div>
  );
};

export default NotificationItem;
