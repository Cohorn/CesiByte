
import { Notification, User } from '@/lib/database.types';

// In-memory notification storage for the mock implementation
let notifications: Notification[] = [];

/**
 * Service for managing user notifications
 */
export const notificationService = {
  /**
   * Get all notifications for a user
   */
  getUserNotifications: (userId: string): Notification[] => {
    return notifications.filter(n => n.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
  
  /**
   * Add a new notification
   */
  addNotification: (notification: Notification): void => {
    notifications.push(notification);
    
    // Broadcast the notification to UI if needed
    // This could use a pub/sub system in a real implementation
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('new-notification', { 
        detail: notification 
      }));
    }
  },
  
  /**
   * Mark a notification as read
   */
  markAsRead: (notificationId: string): void => {
    const index = notifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      notifications[index] = {
        ...notifications[index],
        is_read: true
      };
    }
  },
  
  /**
   * Mark all notifications as read for a user
   */
  markAllAsRead: (userId: string): void => {
    notifications = notifications.map(n => 
      n.user_id === userId 
        ? { ...n, is_read: true } 
        : n
    );
  },
  
  /**
   * Get count of unread notifications
   */
  getUnreadCount: (userId: string): number => {
    return notifications.filter(n => n.user_id === userId && !n.is_read).length;
  },
  
  /**
   * Clear all notifications for testing
   */
  _clearAll: (): void => {
    notifications = [];
  }
};
