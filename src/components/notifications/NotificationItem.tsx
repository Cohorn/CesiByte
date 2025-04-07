
import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NotificationProps {
  id: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  time: Date;
  read?: boolean;
  onDismiss?: (id: string) => void;
}

const NotificationItem: React.FC<NotificationProps> = ({
  id,
  title,
  message,
  type = 'info',
  time,
  read = false,
  onDismiss
}) => {
  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const formatTime = () => {
    const now = new Date();
    const diff = now.getTime() - time.getTime();
    
    // Less than a minute
    if (diff < 60000) {
      return 'Just now';
    }
    
    // Less than an hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    }
    
    // Less than a day
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    }
    
    // Format as date
    return time.toLocaleDateString();
  };

  return (
    <div className={cn(
      'p-3 border rounded-md mb-2 relative',
      getTypeStyles(),
      !read && 'font-medium'
    )}>
      <div className="flex justify-between items-start">
        <h4 className="font-semibold">{title}</h4>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{formatTime()}</span>
          {onDismiss && (
            <button 
              onClick={() => onDismiss(id)} 
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      <p className="text-sm mt-1">{message}</p>
      {!read && (
        <div className="absolute top-3 left-0 w-1 h-2/3 bg-blue-500 rounded-r-full" />
      )}
    </div>
  );
};

export default NotificationItem;
