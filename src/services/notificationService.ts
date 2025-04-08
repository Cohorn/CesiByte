
import { Notification, User } from '@/lib/database.types';
import { toast } from "@/hooks/use-toast";

// In-memory notification storage for the mock implementation
let notifications: Notification[] = [];

// Observable pattern for subscribers
const subscribers = new Set<() => void>();

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
    // Check if notification already exists to prevent duplicates
    const exists = notifications.some(n => 
      n.user_id === notification.user_id && 
      n.title === notification.title && 
      n.message === notification.message && 
      n.type === notification.type &&
      Math.abs(new Date(n.created_at).getTime() - new Date(notification.created_at).getTime()) < 10000 // Within 10 seconds
    );
    
    if (!exists) {
      notifications.push(notification);
      
      // Display a toast for the notification
      toast({
        title: notification.title,
        description: notification.message,
      });
      
      // Notify subscribers of the update
      subscribers.forEach(callback => callback());
      
      // Broadcast the notification to UI components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('new-notification', { 
          detail: notification 
        }));
      }
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
      
      // Notify subscribers of the update
      subscribers.forEach(callback => callback());
    }
  },
  
  /**
   * Mark all notifications as read for a user
   */
  markAllAsRead: (userId: string): void => {
    let updated = false;
    notifications = notifications.map(n => {
      if (n.user_id === userId && !n.is_read) {
        updated = true;
        return { ...n, is_read: true };
      }
      return n;
    });
    
    // Only notify subscribers if something actually changed
    if (updated) {
      subscribers.forEach(callback => callback());
    }
  },
  
  /**
   * Get count of unread notifications
   */
  getUnreadCount: (userId: string): number => {
    return notifications.filter(n => n.user_id === userId && !n.is_read).length;
  },
  
  /**
   * Subscribe to notification changes
   */
  subscribe: (callback: () => void): () => void => {
    subscribers.add(callback);
    return () => {
      subscribers.delete(callback);
    };
  },
  
  /**
   * Clear all notifications for testing
   */
  _clearAll: (): void => {
    notifications = [];
    subscribers.forEach(callback => callback());
  }
};
